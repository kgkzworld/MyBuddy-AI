use reqwest::Url;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{
        Arc, Mutex, OnceLock,
        atomic::{AtomicBool, Ordering},
    },
    thread,
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter, Manager, path::BaseDirectory};
use wait_timeout::ChildExt;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
use std::{ffi::c_void, os::windows::io::AsRawHandle};

#[cfg(target_os = "windows")]
use windows::{
    Win32::{
        Foundation::{CloseHandle, HANDLE},
        System::JobObjects::{
            AssignProcessToJobObject, CreateJobObjectW, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
            JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JobObjectExtendedLimitInformation,
            SetInformationJobObject, TerminateJobObject,
        },
    },
    core::PCWSTR,
};

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

const CREDENTIAL_TARGET: &str = "MyBuddy-AI/OpenAI-Compatible";
const PROVIDER_CONFIG_FILE: &str = "provider-settings.json";

struct ProviderProcessGuard {
    #[cfg(not(target_os = "windows"))]
    process_id: u32,
    #[cfg(target_os = "windows")]
    job_handle: usize,
}

impl ProviderProcessGuard {
    #[cfg(target_os = "windows")]
    fn attach(child: &Child) -> Result<Self, String> {
        let job = unsafe { CreateJobObjectW(None, PCWSTR::null()) }
            .map_err(|error| format!("Could not create the provider process job: {error}"))?;
        let mut limits = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
        limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        if let Err(error) = unsafe {
            SetInformationJobObject(
                job,
                JobObjectExtendedLimitInformation,
                &limits as *const _ as *const c_void,
                std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
            )
        } {
            let _ = unsafe { CloseHandle(job) };
            return Err(format!(
                "Could not configure the provider process job: {error}"
            ));
        }
        let process_handle = HANDLE(child.as_raw_handle());
        if let Err(error) = unsafe { AssignProcessToJobObject(job, process_handle) } {
            let _ = unsafe { CloseHandle(job) };
            return Err(format!(
                "Could not attach the provider process to its job: {error}"
            ));
        }
        Ok(Self {
            job_handle: job.0 as usize,
        })
    }

    #[cfg(not(target_os = "windows"))]
    fn attach(child: &Child) -> Result<Self, String> {
        Ok(Self {
            process_id: child.id(),
        })
    }

    #[cfg(target_os = "windows")]
    fn terminate(&self) -> Result<(), String> {
        let job = HANDLE(self.job_handle as *mut c_void);
        unsafe { TerminateJobObject(job, 1) }
            .map_err(|error| format!("Could not stop the selected provider process job: {error}"))
    }

    #[cfg(not(target_os = "windows"))]
    fn terminate(&self) -> Result<(), String> {
        terminate_provider_process_tree(self.process_id)
    }
}

#[cfg(target_os = "windows")]
impl Drop for ProviderProcessGuard {
    fn drop(&mut self) {
        let job = HANDLE(self.job_handle as *mut c_void);
        let _ = unsafe { CloseHandle(job) };
    }
}

#[derive(Clone)]
struct ActiveProviderRequest {
    request_id: String,
    process: Arc<ProviderProcessGuard>,
    cancelled: Arc<AtomicBool>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProviderProgressEvent {
    request_id: String,
    stage: String,
    elapsed_seconds: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderCancellationResult {
    pub request_id: String,
    pub cancelled: bool,
    pub message: String,
}

static ACTIVE_PROVIDER_REQUEST: OnceLock<Mutex<Option<ActiveProviderRequest>>> = OnceLock::new();

fn active_provider_request() -> &'static Mutex<Option<ActiveProviderRequest>> {
    ACTIVE_PROVIDER_REQUEST.get_or_init(|| Mutex::new(None))
}

pub fn validate_request_id(request_id: &str) -> Result<String, String> {
    let value = request_id.trim();
    if value.is_empty()
        || value.len() > 80
        || !value
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || "-_:".contains(character))
    {
        return Err("The provider request ID is invalid.".into());
    }
    Ok(value.to_string())
}

fn emit_provider_progress(app: &AppHandle, request_id: &str, stage: &str, elapsed: u64) {
    let event = ProviderProgressEvent {
        request_id: request_id.to_string(),
        stage: stage.to_string(),
        elapsed_seconds: elapsed,
    };
    let _ = app.emit("provider-progress", event);
    let _ = crate::diagnostic_log::append_internal(
        app,
        "provider-progress",
        serde_json::json!({
            "requestId": request_id,
            "stage": stage,
            "elapsedSeconds": elapsed,
        }),
    );
}

fn clear_active_provider_request(request_id: &str) {
    if let Ok(mut active) = active_provider_request().lock() {
        if active
            .as_ref()
            .is_some_and(|request| request.request_id == request_id)
        {
            *active = None;
        }
    }
}

fn register_active_provider_request(
    request_id: &str,
    process: Arc<ProviderProcessGuard>,
    cancelled: Arc<AtomicBool>,
) -> Result<(), String> {
    let mut active = active_provider_request()
        .lock()
        .map_err(|_| "The provider cancellation registry is unavailable.".to_string())?;
    if active.is_some() {
        return Err("Another selected-provider request is already running.".into());
    }
    *active = Some(ActiveProviderRequest {
        request_id: request_id.to_string(),
        process,
        cancelled,
    });
    Ok(())
}

fn cancel_registered_provider_process(request_id: &str) -> Result<bool, String> {
    let active = {
        let mut slot = active_provider_request()
            .lock()
            .map_err(|_| "The provider cancellation registry is unavailable.".to_string())?;
        if slot
            .as_ref()
            .is_some_and(|request| request.request_id == request_id)
        {
            slot.take()
        } else {
            None
        }
    };
    let Some(active) = active else {
        return Ok(false);
    };
    active.cancelled.store(true, Ordering::SeqCst);
    active.process.terminate()?;
    Ok(true)
}

#[cfg(not(target_os = "windows"))]
fn terminate_provider_process_tree(process_id: u32) -> Result<(), String> {
    let status = Command::new("kill")
        .args(["-TERM", &process_id.to_string()])
        .status()
        .map_err(|error| format!("Could not stop the selected provider process: {error}"))?;
    if status.success() {
        Ok(())
    } else {
        Err("The selected provider process did not stop cleanly.".into())
    }
}

#[tauri::command]
pub fn cancel_provider_request(
    app: AppHandle,
    request_id: String,
) -> Result<ProviderCancellationResult, String> {
    let request_id = validate_request_id(&request_id)?;
    let cancelled = cancel_registered_provider_process(&request_id)?;
    if !cancelled {
        return Ok(ProviderCancellationResult {
            request_id,
            cancelled: false,
            message: "That request is no longer running.".into(),
        });
    }
    emit_provider_progress(&app, &request_id, "cancelled", 0);
    Ok(ProviderCancellationResult {
        request_id,
        cancelled: true,
        message: "Cancellation requested. The selected provider process was stopped.".into(),
    })
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ProviderKind {
    LmStudio,
    OpenaiCompatible,
    CodexCli,
    ClaudeCli,
    QwenCli,
    ContinueCli,
    HermesCli,
    OpenCodeCli,
    AntigravityCli,
}

impl ProviderKind {
    fn cli_executable(&self) -> Option<&'static str> {
        match self {
            ProviderKind::CodexCli | ProviderKind::ClaudeCli | ProviderKind::QwenCli => {
                Some("hermes")
            }
            ProviderKind::ContinueCli => Some("cn"),
            ProviderKind::HermesCli => Some("hermes"),
            ProviderKind::OpenCodeCli => Some("opencode"),
            ProviderKind::AntigravityCli => Some("agy"),
            _ => None,
        }
    }

    fn display_name(&self) -> &'static str {
        match self {
            ProviderKind::CodexCli => "Codex agent (Hermes profile)",
            ProviderKind::ClaudeCli => "Claude agent (Hermes profile)",
            ProviderKind::QwenCli => "Qwen agent (Hermes profile)",
            ProviderKind::ContinueCli => "Continue CLI",
            ProviderKind::HermesCli => "Hermes CLI",
            ProviderKind::OpenCodeCli => "OpenCode CLI",
            ProviderKind::AntigravityCli => "Antigravity CLI",
            ProviderKind::LmStudio => "LM Studio",
            ProviderKind::OpenaiCompatible => "OpenAI-compatible HTTP",
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderSettings {
    pub provider: ProviderKind,
    pub endpoint: String,
    pub chat_model: String,
    pub analysis_model: String,
}

impl Default for ProviderSettings {
    fn default() -> Self {
        Self {
            provider: ProviderKind::LmStudio,
            endpoint: "http://127.0.0.1:1234/v1".into(),
            chat_model: "instruct".into(),
            analysis_model: "autocomplete".into(),
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderSettingsView {
    pub provider: ProviderKind,
    pub endpoint: String,
    pub chat_model: String,
    pub analysis_model: String,
    pub api_key_configured: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderTestResult {
    pub provider: ProviderKind,
    pub success: bool,
    pub message: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderAvailability {
    pub provider: ProviderKind,
    pub display_name: String,
    pub executable: String,
    pub installed: bool,
    pub version: Option<String>,
}

fn resolve_executable(executable: &str) -> Option<PathBuf> {
    let direct = PathBuf::from(executable);
    if direct.is_file() {
        return Some(direct);
    }
    let path = std::env::var_os("PATH")?;
    #[cfg(target_os = "windows")]
    let extensions = ["", ".exe", ".cmd", ".bat", ".com"];
    #[cfg(not(target_os = "windows"))]
    let extensions = [""];
    for directory in std::env::split_paths(&path) {
        for extension in extensions {
            let candidate = directory.join(format!("{executable}{extension}"));
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

fn cli_version(path: &Path) -> Option<String> {
    let mut command = Command::new(path);
    command
        .arg("--version")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    configure_background_process(&mut command);
    let mut child = command.spawn().ok()?;
    let status = child.wait_timeout(Duration::from_secs(5)).ok()??;
    if !status.success() {
        return None;
    }
    let mut output = String::new();
    if let Some(mut stdout) = child.stdout.take() {
        let _ = stdout.read_to_string(&mut output);
    }
    if output.trim().is_empty() {
        if let Some(mut stderr) = child.stderr.take() {
            let _ = stderr.read_to_string(&mut output);
        }
    }
    output
        .lines()
        .find(|line| !line.trim().is_empty())
        .map(|line| line.trim().to_string())
}

#[tauri::command]
pub fn get_provider_availability() -> Vec<ProviderAvailability> {
    [
        ProviderKind::CodexCli,
        ProviderKind::ClaudeCli,
        ProviderKind::QwenCli,
        ProviderKind::ContinueCli,
        ProviderKind::HermesCli,
        ProviderKind::OpenCodeCli,
        ProviderKind::AntigravityCli,
    ]
    .into_iter()
    .map(|provider| {
        let executable = provider.cli_executable().expect("CLI provider");
        let path = resolve_executable(executable);
        ProviderAvailability {
            display_name: provider.display_name().to_string(),
            executable: executable.to_string(),
            installed: path.is_some(),
            version: path.as_deref().and_then(cli_version),
            provider,
        }
    })
    .collect()
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join(PROVIDER_CONFIG_FILE))
}

pub fn load_settings(app: &AppHandle) -> Result<ProviderSettings, String> {
    let path = settings_path(app)?;
    if !path.is_file() {
        return Ok(ProviderSettings::default());
    }
    let bytes = fs::read(path).map_err(|error| error.to_string())?;
    serde_json::from_slice(&bytes)
        .map_err(|error| format!("Provider settings are invalid: {error}"))
}

fn validate_model(value: &str, label: &str) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() || value.len() > 160 {
        return Err(format!("{label} must be between 1 and 160 characters."));
    }
    Ok(value.to_string())
}

fn validate_settings(
    mut settings: ProviderSettings,
    key_will_be_used: bool,
) -> Result<ProviderSettings, String> {
    settings.chat_model = validate_model(&settings.chat_model, "Chat model")?;
    settings.analysis_model = validate_model(&settings.analysis_model, "Analysis model")?;
    if matches!(
        settings.provider,
        ProviderKind::LmStudio | ProviderKind::OpenaiCompatible
    ) {
        let endpoint = Url::parse(settings.endpoint.trim())
            .map_err(|error| format!("Provider endpoint is invalid: {error}"))?;
        if !matches!(endpoint.scheme(), "http" | "https") {
            return Err("Provider endpoint must use HTTP or HTTPS.".into());
        }
        let loopback = endpoint
            .host_str()
            .is_some_and(|host| matches!(host, "127.0.0.1" | "localhost" | "::1"));
        if key_will_be_used && endpoint.scheme() != "https" && !loopback {
            return Err("API keys require HTTPS unless the endpoint is loopback-only.".into());
        }
        settings.endpoint = endpoint.as_str().trim_end_matches('/').to_string();
    }
    Ok(settings)
}

fn save_settings(app: &AppHandle, settings: &ProviderSettings) -> Result<(), String> {
    let path = settings_path(app)?;
    let payload = serde_json::to_vec_pretty(settings).map_err(|error| error.to_string())?;
    fs::write(path, payload).map_err(|error| error.to_string())
}

#[cfg(target_os = "windows")]
mod credential_store {
    use super::CREDENTIAL_TARGET;
    use windows::{
        Win32::Security::Credentials::{
            CRED_FLAGS, CRED_PERSIST_LOCAL_MACHINE, CRED_TYPE_GENERIC, CREDENTIALW, CredFree,
            CredReadW, CredWriteW,
        },
        core::{PCWSTR, PWSTR},
    };

    fn wide(value: &str) -> Vec<u16> {
        value.encode_utf16().chain(std::iter::once(0)).collect()
    }

    pub fn write_api_key(key: &str) -> Result<(), String> {
        let mut target = wide(CREDENTIAL_TARGET);
        let mut username = wide("MyBuddy-AI");
        let mut blob = key.as_bytes().to_vec();
        let credential = CREDENTIALW {
            Flags: CRED_FLAGS(0),
            Type: CRED_TYPE_GENERIC,
            TargetName: PWSTR(target.as_mut_ptr()),
            CredentialBlobSize: blob.len() as u32,
            CredentialBlob: blob.as_mut_ptr(),
            Persist: CRED_PERSIST_LOCAL_MACHINE,
            UserName: PWSTR(username.as_mut_ptr()),
            ..Default::default()
        };
        unsafe { CredWriteW(&credential, 0) }.map_err(|error| error.to_string())
    }

    pub fn read_api_key() -> Option<String> {
        let target = wide(CREDENTIAL_TARGET);
        let mut pointer = std::ptr::null_mut::<CREDENTIALW>();
        unsafe {
            CredReadW(
                PCWSTR(target.as_ptr()),
                CRED_TYPE_GENERIC,
                None,
                &mut pointer,
            )
        }
        .ok()?;
        if pointer.is_null() {
            return None;
        }
        let credential = unsafe { &*pointer };
        let bytes = unsafe {
            std::slice::from_raw_parts(
                credential.CredentialBlob,
                credential.CredentialBlobSize as usize,
            )
        };
        let value = String::from_utf8(bytes.to_vec()).ok();
        unsafe { CredFree(pointer.cast()) };
        value
    }
}

#[cfg(not(target_os = "windows"))]
mod credential_store {
    pub fn write_api_key(_key: &str) -> Result<(), String> {
        Err("Secure API-key storage is currently available only on Windows.".into())
    }
    pub fn read_api_key() -> Option<String> {
        None
    }
}

fn completion_url(endpoint: &str) -> String {
    format!("{}/chat/completions", endpoint.trim_end_matches('/'))
}

fn responses_url(endpoint: &str) -> String {
    format!("{}/responses", endpoint.trim_end_matches('/'))
}

fn models_url(endpoint: &str) -> String {
    format!("{}/models", endpoint.trim_end_matches('/'))
}

async fn http_complete(settings: &ProviderSettings, body: Value) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut request = client
        .post(completion_url(&settings.endpoint))
        .timeout(Duration::from_secs(60))
        .json(&body);
    if matches!(settings.provider, ProviderKind::OpenaiCompatible) {
        if let Some(key) = credential_store::read_api_key().filter(|key| !key.is_empty()) {
            request = request.bearer_auth(key);
        }
    }
    let response = request
        .send()
        .await
        .map_err(|error| format!("Provider request failed: {error}"))?;
    if !response.status().is_success() {
        return Err(format!("Provider returned HTTP {}.", response.status()));
    }
    let payload: Value = response
        .json()
        .await
        .map_err(|error| format!("Provider returned invalid JSON: {error}"))?;
    payload["choices"][0]["message"]["content"]
        .as_str()
        .filter(|content| !content.trim().is_empty())
        .map(str::to_owned)
        .ok_or_else(|| "Provider returned empty assistant content.".to_string())
}

fn extract_response_text(payload: &Value) -> Result<String, String> {
    let text = payload["output"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|item| item["content"].as_array())
        .flatten()
        .filter_map(|part| part["text"].as_str())
        .collect::<Vec<_>>()
        .join("\n");
    if text.trim().is_empty() {
        return Err("Provider Responses API returned empty assistant content.".into());
    }
    Ok(text.trim().to_string())
}

async fn http_responses_complete(
    settings: &ProviderSettings,
    body: Value,
) -> Result<String, String> {
    let response = reqwest::Client::new()
        .post(responses_url(&settings.endpoint))
        .timeout(Duration::from_secs(60))
        .json(&body)
        .send()
        .await
        .map_err(|error| format!("Provider Responses API request failed: {error}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "Provider Responses API returned HTTP {}.",
            response.status()
        ));
    }
    let payload: Value = response
        .json()
        .await
        .map_err(|error| format!("Provider Responses API returned invalid JSON: {error}"))?;
    extract_response_text(&payload)
}

fn provider_sandbox(app: &AppHandle) -> Result<PathBuf, String> {
    let path = app
        .path()
        .app_cache_dir()
        .map_err(|error| error.to_string())?
        .join("provider-sandbox");
    fs::create_dir_all(&path).map_err(|error| error.to_string())?;
    Ok(path)
}

fn harness_root(app: &AppHandle) -> Result<PathBuf, String> {
    let bundled = app
        .path()
        .resolve("harness", BaseDirectory::Resource)
        .map_err(|error| error.to_string())?;
    if bundled.is_dir() {
        return Ok(bundled);
    }

    let source = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or_else(|| "Could not resolve the MBAI project root.".to_string())?
        .join("harness");
    if source.is_dir() {
        return Ok(source);
    }
    Err("The packaged MBAI harness is unavailable.".into())
}

#[cfg(target_os = "windows")]
fn configure_background_process(command: &mut Command) {
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(target_os = "windows"))]
fn configure_background_process(_command: &mut Command) {}

fn hermes_profile_command(profile: &str) -> Command {
    let mut command = Command::new("hermes");
    command.args([
        "-p",
        profile,
        "chat",
        "--query-file",
        "-",
        "--quiet",
        "--max-turns",
        "8",
        "--run-budget",
        "80",
        "--source",
        "tool",
    ]);
    command
}

fn command_for_cli(
    provider: &ProviderKind,
    sandbox: &Path,
    harness_root: &Path,
) -> Result<Command, String> {
    let mut command = match provider {
        ProviderKind::CodexCli => hermes_profile_command("hermescodex"),
        ProviderKind::ClaudeCli => hermes_profile_command("hermesclaude"),
        ProviderKind::QwenCli => hermes_profile_command("hermesqwen"),
        ProviderKind::ContinueCli => {
            #[cfg(target_os = "windows")]
            let command = {
                let root = std::env::var_os("SystemRoot")
                    .ok_or_else(|| "Windows system directory is unavailable.".to_string())?;
                let mut command =
                    Command::new(PathBuf::from(root).join("System32").join("cmd.exe"));
                command.args(["/D", "/S", "/C", "cn", "-p", "--readonly", "--silent"]);
                command
            };
            #[cfg(not(target_os = "windows"))]
            let mut command = {
                let mut command = Command::new("cn");
                command.args(["-p", "--readonly", "--silent"]);
                command
            };
            command
        }
        ProviderKind::HermesCli => {
            let mut command = Command::new("hermes");
            command.args([
                "chat",
                "--query-file",
                "-",
                "--quiet",
                "--max-turns",
                "8",
                "--run-budget",
                "80",
                "--source",
                "tool",
            ]);
            command
        }
        ProviderKind::OpenCodeCli => {
            let mut command = Command::new("opencode");
            command.args(["run", "--agent", "plan"]);
            command
        }
        ProviderKind::AntigravityCli => {
            let mut command = Command::new("agy");
            command.args([
                "--print",
                "--mode",
                "plan",
                "--sandbox",
                "--disable-slash-commands",
                "--output-format",
                "text",
                "--print-timeout",
                "80s",
            ]);
            command
        }
        _ => return Err("Selected provider is not a CLI route.".into()),
    };
    configure_background_process(&mut command);
    command.current_dir(sandbox);
    command.env("MBAI_HARNESS_PATH", harness_root);
    command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    Ok(command)
}

fn normalize_cli_output(provider: &ProviderKind, output: &str) -> Result<String, String> {
    let trimmed = output.trim();
    if trimmed.is_empty() {
        return Err("CLI provider returned no response.".into());
    }
    let normalized = if matches!(
        provider,
        ProviderKind::CodexCli
            | ProviderKind::ClaudeCli
            | ProviderKind::QwenCli
            | ProviderKind::HermesCli
    ) {
        trimmed
            .lines()
            .filter(|line| !line.trim_start().starts_with("session_id:"))
            .collect::<Vec<_>>()
            .join("\n")
            .trim()
            .to_string()
    } else {
        trimmed.to_string()
    };
    if normalized.is_empty() {
        return Err("CLI provider returned no response after metadata filtering.".into());
    }
    if matches!(provider, ProviderKind::CodexCli) {
        let events = normalized
            .lines()
            .map(serde_json::from_str::<Value>)
            .collect::<Result<Vec<_>, _>>();
        let Ok(events) = events else {
            return Ok(normalized);
        };
        let is_event_stream = events.iter().all(|event| event["type"].as_str().is_some())
            && events.iter().any(|event| {
                matches!(
                    event["type"].as_str(),
                    Some("thread.started" | "item.completed" | "turn.completed" | "turn.failed")
                )
            });
        if !is_event_stream {
            return Ok(normalized);
        }
        let answer = events
            .into_iter()
            .filter(|event| event["type"] == "item.completed")
            .filter(|event| event["item"]["type"] == "agent_message")
            .filter_map(|event| event["item"]["text"].as_str().map(str::to_owned))
            .last()
            .filter(|text| !text.trim().is_empty())
            .ok_or_else(|| "Codex CLI returned no completed assistant message.".to_string())?;
        return Ok(answer.trim().to_string());
    }
    Ok(normalized)
}

fn cli_complete(
    app: &AppHandle,
    provider: ProviderKind,
    prompt: &str,
    request_id: Option<String>,
) -> Result<String, String> {
    let sandbox = provider_sandbox(app)?;
    let harness_root = harness_root(app)?;
    let request_id = request_id.as_deref().map(validate_request_id).transpose()?;
    let timeout_seconds = if matches!(
        provider,
        ProviderKind::CodexCli
            | ProviderKind::ClaudeCli
            | ProviderKind::QwenCli
            | ProviderKind::HermesCli
    ) {
        300
    } else {
        90
    };
    let mut child = command_for_cli(&provider, &sandbox, &harness_root)?
        .spawn()
        .map_err(|error| format!("Could not start selected CLI provider: {error}"))?;
    let process = match ProviderProcessGuard::attach(&child) {
        Ok(process) => Arc::new(process),
        Err(error) => {
            let _ = child.kill();
            let _ = child.wait();
            return Err(error);
        }
    };
    let stdout_reader = child.stdout.take().map(|pipe| {
        thread::spawn(move || {
            let mut output = String::new();
            pipe.take(2 * 1024 * 1024)
                .read_to_string(&mut output)
                .map(|_| output)
                .map_err(|error| error.to_string())
        })
    });
    let stderr_reader = child.stderr.take().map(|pipe| {
        thread::spawn(move || {
            let mut output = String::new();
            pipe.take(512 * 1024)
                .read_to_string(&mut output)
                .map(|_| output)
                .map_err(|error| error.to_string())
        })
    });
    if let Some(mut stdin) = child.stdin.take() {
        if let Err(error) = stdin.write_all(prompt.as_bytes()) {
            let _ = child.kill();
            let _ = child.wait();
            return Err(format!("Could not send prompt to CLI provider: {error}"));
        }
    }
    let cancelled = Arc::new(AtomicBool::new(false));
    if let Some(request_id) = request_id.as_deref() {
        if let Err(error) = register_active_provider_request(
            request_id,
            Arc::clone(&process),
            Arc::clone(&cancelled),
        ) {
            let _ = process.terminate();
            let _ = child.kill();
            let _ = child.wait();
            return Err(error);
        }
        emit_provider_progress(app, request_id, "started", 0);
    }

    let started = Instant::now();
    let mut next_progress_seconds = 5;
    let status = loop {
        if cancelled.load(Ordering::SeqCst) {
            let _ = child.kill();
            break child.wait().map_err(|error| error.to_string())?;
        }
        let elapsed = started.elapsed().as_secs();
        if elapsed >= timeout_seconds {
            let _ = process.terminate();
            let _ = child.kill();
            let _ = child.wait();
            if let Some(request_id) = request_id.as_deref() {
                clear_active_provider_request(request_id);
                emit_provider_progress(app, request_id, "timed-out", elapsed);
            }
            return Err(format!(
                "CLI provider timed out after {timeout_seconds} seconds."
            ));
        }
        if elapsed >= next_progress_seconds {
            if let Some(request_id) = request_id.as_deref() {
                emit_provider_progress(app, request_id, "working", elapsed);
            }
            next_progress_seconds += 5;
        }
        if let Some(status) = child
            .wait_timeout(Duration::from_millis(250))
            .map_err(|error| error.to_string())?
        {
            break status;
        }
    };
    let stdout = stdout_reader
        .map(|reader| {
            reader
                .join()
                .map_err(|_| "Provider output reader failed.".to_string())?
        })
        .transpose()?
        .unwrap_or_default();
    let stderr = stderr_reader
        .map(|reader| {
            reader
                .join()
                .map_err(|_| "Provider error reader failed.".to_string())?
        })
        .transpose()?
        .unwrap_or_default();
    if let Some(request_id) = request_id.as_deref() {
        clear_active_provider_request(request_id);
        if cancelled.load(Ordering::SeqCst) {
            return Err("Request cancelled by user.".into());
        }
        emit_provider_progress(app, request_id, "completed", started.elapsed().as_secs());
    }
    if !status.success() {
        return Err(format!("CLI provider failed: {}", stderr.trim()));
    }
    normalize_cli_output(&provider, &stdout)
}

pub async fn complete(
    app: &AppHandle,
    body: Value,
    cli_prompt: String,
    request_id: Option<String>,
) -> Result<String, String> {
    let settings = load_settings(app)?;
    match settings.provider.clone() {
        ProviderKind::LmStudio | ProviderKind::OpenaiCompatible => {
            http_complete(&settings, body).await
        }
        provider => {
            let app = app.clone();
            tauri::async_runtime::spawn_blocking(move || {
                cli_complete(&app, provider, &cli_prompt, request_id)
            })
            .await
            .map_err(|error| format!("CLI provider worker failed: {error}"))?
        }
    }
}

pub async fn complete_question(
    app: &AppHandle,
    chat_body: Value,
    response_body: Value,
    cli_prompt: String,
    request_id: Option<String>,
) -> Result<String, String> {
    let settings = load_settings(app)?;
    match settings.provider.clone() {
        ProviderKind::LmStudio => http_responses_complete(&settings, response_body).await,
        ProviderKind::OpenaiCompatible => http_complete(&settings, chat_body).await,
        provider => {
            let app = app.clone();
            tauri::async_runtime::spawn_blocking(move || {
                cli_complete(&app, provider, &cli_prompt, request_id)
            })
            .await
            .map_err(|error| format!("CLI provider worker failed: {error}"))?
        }
    }
}

pub async fn complete_structured(
    app: &AppHandle,
    chat_body: Value,
    response_body: Value,
    cli_prompt: String,
    request_id: Option<String>,
) -> Result<String, String> {
    let settings = load_settings(app)?;
    match settings.provider.clone() {
        ProviderKind::LmStudio => http_responses_complete(&settings, response_body).await,
        ProviderKind::OpenaiCompatible => http_complete(&settings, chat_body).await,
        provider => {
            let app = app.clone();
            tauri::async_runtime::spawn_blocking(move || {
                cli_complete(&app, provider, &cli_prompt, request_id)
            })
            .await
            .map_err(|error| format!("CLI provider worker failed: {error}"))?
        }
    }
}

pub async fn health(app: &AppHandle) -> Result<bool, String> {
    let settings = load_settings(app)?;
    match settings.provider.clone() {
        ProviderKind::LmStudio | ProviderKind::OpenaiCompatible => {
            let mut request = reqwest::Client::new()
                .get(models_url(&settings.endpoint))
                .timeout(Duration::from_secs(5));
            if matches!(settings.provider, ProviderKind::OpenaiCompatible) {
                if let Some(key) = credential_store::read_api_key().filter(|key| !key.is_empty()) {
                    request = request.bearer_auth(key);
                }
            }
            Ok(request
                .send()
                .await
                .map_err(|error| error.to_string())?
                .status()
                .is_success())
        }
        provider => {
            let app = app.clone();
            let answer = tauri::async_runtime::spawn_blocking(move || {
                cli_complete(
                    &app,
                    provider,
                    "Reply with exactly MYBUDDY_PROVIDER_OK and nothing else.",
                    None,
                )
            })
            .await
            .map_err(|error| error.to_string())??;
            Ok(answer.contains("MYBUDDY_PROVIDER_OK"))
        }
    }
}

#[tauri::command]
pub fn get_provider_settings(app: AppHandle) -> Result<ProviderSettingsView, String> {
    let settings = load_settings(&app)?;
    Ok(ProviderSettingsView {
        provider: settings.provider,
        endpoint: settings.endpoint,
        chat_model: settings.chat_model,
        analysis_model: settings.analysis_model,
        api_key_configured: credential_store::read_api_key().is_some(),
    })
}

#[tauri::command]
pub async fn save_and_test_provider(
    app: AppHandle,
    settings: ProviderSettings,
    api_key: Option<String>,
) -> Result<ProviderTestResult, String> {
    let supplied_key = api_key
        .map(|key| key.trim().to_string())
        .filter(|key| !key.is_empty());
    let key_will_be_used = supplied_key.is_some() || credential_store::read_api_key().is_some();
    let settings = validate_settings(settings, key_will_be_used)?;
    if let Some(key) = supplied_key {
        credential_store::write_api_key(&key)?;
    }
    save_settings(&app, &settings)?;
    let result = health(&app).await;
    Ok(ProviderTestResult {
        provider: settings.provider,
        success: result.as_ref().is_ok_and(|ready| *ready),
        message: match result {
            Ok(true) => "Provider test succeeded.".into(),
            Ok(false) => "Provider responded but did not pass the readiness check.".into(),
            Err(error) => format!("Provider test failed: {error}"),
        },
    })
}

#[cfg(test)]
mod tests {
    use super::{
        ProviderKind, ProviderProcessGuard, ProviderSettings, cancel_registered_provider_process,
        command_for_cli, completion_url, extract_response_text, normalize_cli_output,
        register_active_provider_request, validate_request_id, validate_settings,
    };
    use std::path::Path;

    #[test]
    fn default_settings_keep_local_models_and_split_chat_from_analysis() {
        let settings = ProviderSettings::default();
        assert_eq!(settings.provider, ProviderKind::LmStudio);
        assert_eq!(settings.chat_model, "instruct");
        assert_eq!(settings.analysis_model, "autocomplete");
        assert_eq!(
            completion_url(&settings.endpoint),
            "http://127.0.0.1:1234/v1/chat/completions"
        );
    }

    #[test]
    fn request_ids_are_bounded_before_becoming_cancellation_handles() {
        assert_eq!(validate_request_id("request-123").unwrap(), "request-123");
        assert!(validate_request_id("").is_err());
        assert!(validate_request_id("bad request id").is_err());
        assert!(validate_request_id(&"x".repeat(81)).is_err());
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn cancellation_terminates_the_registered_provider_process() {
        use std::{
            process::{Command, Stdio},
            sync::{Arc, atomic::AtomicBool},
            time::Duration,
        };
        use wait_timeout::ChildExt;

        let mut child = Command::new("cmd.exe")
            .args(["/C", "ping -n 30 127.0.0.1 >NUL"])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .unwrap();
        let process = Arc::new(ProviderProcessGuard::attach(&child).unwrap());
        register_active_provider_request(
            "request-cancel-test",
            process,
            Arc::new(AtomicBool::new(false)),
        )
        .unwrap();

        assert!(cancel_registered_provider_process("request-cancel-test").unwrap());
        assert!(
            child
                .wait_timeout(Duration::from_secs(5))
                .unwrap()
                .is_some()
        );
    }

    #[test]
    fn api_keys_cannot_use_plain_http_off_loopback() {
        let settings = ProviderSettings {
            provider: ProviderKind::OpenaiCompatible,
            endpoint: "http://example.com/v1".into(),
            chat_model: "chat".into(),
            analysis_model: "analysis".into(),
        };
        assert!(validate_settings(settings, true).is_err());
    }

    #[test]
    fn responses_api_extracts_nonempty_output_text() {
        let payload = serde_json::json!({
            "output": [{
                "type": "message",
                "content": [{ "type": "output_text", "text": "Use the full manifest path." }]
            }]
        });
        assert_eq!(
            extract_response_text(&payload).unwrap(),
            "Use the full manifest path."
        );
    }

    #[test]
    fn codex_selection_uses_the_full_hermes_codex_profile_without_permission_bypass() {
        let command = command_for_cli(
            &ProviderKind::CodexCli,
            Path::new("."),
            Path::new("harness"),
        )
        .unwrap();
        let arguments = command
            .get_args()
            .map(|arg| arg.to_string_lossy())
            .collect::<Vec<_>>();
        assert_eq!(command.get_program().to_string_lossy(), "hermes");
        assert!(
            arguments
                .windows(2)
                .any(|pair| pair == ["-p", "hermescodex"])
        );
        assert!(
            arguments
                .windows(2)
                .any(|pair| pair == ["--query-file", "-"])
        );
        assert!(!arguments.contains(&"--ignore-rules".into()));
        assert!(!arguments.contains(&"--ignore-user-config".into()));
        assert!(!arguments.contains(&"--yolo".into()));
    }

    #[test]
    fn claude_selection_uses_the_full_hermes_claude_profile_without_permission_bypass() {
        let command = command_for_cli(
            &ProviderKind::ClaudeCli,
            Path::new("."),
            Path::new("harness"),
        )
        .unwrap();
        let arguments = command
            .get_args()
            .map(|arg| arg.to_string_lossy())
            .collect::<Vec<_>>();
        assert_eq!(command.get_program().to_string_lossy(), "hermes");
        assert!(
            arguments
                .windows(2)
                .any(|pair| pair == ["-p", "hermesclaude"])
        );
        assert!(!arguments.contains(&"--safe-mode".into()));
        assert!(!arguments.contains(&"--yolo".into()));
    }

    #[test]
    fn qwen_selection_uses_the_full_hermes_qwen_profile_without_permission_bypass() {
        let command =
            command_for_cli(&ProviderKind::QwenCli, Path::new("."), Path::new("harness")).unwrap();
        let arguments = command
            .get_args()
            .map(|arg| arg.to_string_lossy())
            .collect::<Vec<_>>();
        assert_eq!(command.get_program().to_string_lossy(), "hermes");
        assert!(
            arguments
                .windows(2)
                .any(|pair| pair == ["-p", "hermesqwen"])
        );
        assert!(!arguments.contains(&"--safe-mode".into()));
        assert!(!arguments.contains(&"--yolo".into()));
    }

    #[test]
    fn hermes_profile_output_strips_session_metadata_before_structured_planning() {
        let output =
            "session_id: 20260903_example\n{\"decision\":\"final\",\"answer\":\"AVAILABLE\"}";
        for provider in [
            ProviderKind::CodexCli,
            ProviderKind::ClaudeCli,
            ProviderKind::QwenCli,
        ] {
            assert_eq!(
                normalize_cli_output(&provider, output).unwrap(),
                "{\"decision\":\"final\",\"answer\":\"AVAILABLE\"}"
            );
        }
    }

    #[test]
    fn codex_jsonl_returns_only_the_completed_agent_message() {
        let output = r#"{"type":"thread.started","thread_id":"abc"}
{"type":"item.completed","item":{"type":"agent_message","text":"A short story."}}
{"type":"turn.completed","usage":{"output_tokens":4}}"#;

        assert_eq!(
            normalize_cli_output(&ProviderKind::CodexCli, output).unwrap(),
            "A short story."
        );
    }

    #[test]
    fn codex_plain_text_output_is_returned_unchanged() {
        let output = "MYBUDDY_PROVIDER_OK\n";
        assert_eq!(
            normalize_cli_output(&ProviderKind::CodexCli, output).unwrap(),
            "MYBUDDY_PROVIDER_OK"
        );
    }

    #[test]
    fn codex_structured_answer_is_not_mistaken_for_event_jsonl() {
        let output = r#"{"decision":"tool","toolId":"observer.process.running","arguments":{"query":"orca.exe"},"reason":"Read local process metadata.","answer":null}"#;

        assert_eq!(
            normalize_cli_output(&ProviderKind::CodexCli, output).unwrap(),
            output
        );
    }

    #[test]
    fn hermes_cli_is_stdin_driven_and_inherits_configured_tools() {
        let command = command_for_cli(
            &ProviderKind::HermesCli,
            Path::new("."),
            Path::new("harness"),
        )
        .unwrap();
        let arguments = command
            .get_args()
            .map(|arg| arg.to_string_lossy())
            .collect::<Vec<_>>();
        assert_eq!(command.get_program().to_string_lossy(), "hermes");
        assert!(
            arguments
                .windows(2)
                .any(|pair| pair == ["--query-file", "-"])
        );
        assert!(!arguments.iter().any(|argument| argument == "--toolsets"));
        assert!(!arguments.contains(&"--ignore-rules".into()));
        assert!(
            arguments
                .windows(2)
                .any(|pair| pair == ["--max-turns", "8"])
        );
    }

    #[test]
    fn opencode_cli_uses_the_plan_agent() {
        let command = command_for_cli(
            &ProviderKind::OpenCodeCli,
            Path::new("."),
            Path::new("harness"),
        )
        .unwrap();
        let arguments = command
            .get_args()
            .map(|arg| arg.to_string_lossy())
            .collect::<Vec<_>>();
        assert_eq!(command.get_program().to_string_lossy(), "opencode");
        assert_eq!(arguments, ["run", "--agent", "plan"]);
    }

    #[test]
    fn antigravity_cli_uses_plan_mode_and_sandbox() {
        let command = command_for_cli(
            &ProviderKind::AntigravityCli,
            Path::new("."),
            Path::new("harness"),
        )
        .unwrap();
        let arguments = command
            .get_args()
            .map(|arg| arg.to_string_lossy())
            .collect::<Vec<_>>();
        assert_eq!(command.get_program().to_string_lossy(), "agy");
        assert!(arguments.contains(&"--print".into()));
        assert!(arguments.windows(2).any(|pair| pair == ["--mode", "plan"]));
        assert!(arguments.contains(&"--sandbox".into()));
        assert!(arguments.contains(&"--disable-slash-commands".into()));
    }
}
