use serde::{Deserialize, Serialize};

const MAX_CONTEXT_CHARS: usize = 12_000;
const MAX_FILE_SCAN_ENTRIES: usize = 100_000;
const PRIVACY_BLOCKED_TERMS: &[&str] = &[
    "1password",
    "bitwarden",
    "keepass",
    "credentialuibroker",
    "windows security",
    "sign in",
    "two-factor",
    "2fa",
    "bank",
    "payment",
    "checkout",
    "incognito",
    "inprivate",
    "private browsing",
];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveWindowSnapshot {
    pub process_name: String,
    pub title: String,
    pub process_id: u64,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub window_handle: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowTextContextTarget {
    pub window_handle: u64,
    pub expected_process_id: u64,
    pub expected_process_name: String,
    pub expected_title: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowTextContext {
    pub process_name: String,
    pub title: String,
    pub text: String,
    pub truncated: bool,
    pub source: &'static str,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunningAppStatus {
    pub query: String,
    pub running: bool,
    pub matched_processes: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunningServiceEntry {
    pub name: String,
    pub display_name: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunningServicesStatus {
    pub services: Vec<RunningServiceEntry>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryApplicationEntry {
    pub process_name: String,
    pub working_set_bytes: u64,
    pub process_count: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TopMemoryApplicationsStatus {
    pub applications: Vec<MemoryApplicationEntry>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LargestFileEntry {
    pub path: String,
    pub size_bytes: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LargestFilesStatus {
    pub requested_path: String,
    pub resolved_path: String,
    pub corrected: bool,
    pub files: Vec<LargestFileEntry>,
    pub truncated: bool,
}

fn edit_distance(left: &str, right: &str) -> usize {
    let mut row: Vec<usize> = (0..=right.chars().count()).collect();
    for (i, a) in left.chars().enumerate() {
        let mut previous = row[0];
        row[0] = i + 1;
        for (j, b) in right.chars().enumerate() {
            let old = row[j + 1];
            row[j + 1] = (row[j + 1] + 1)
                .min(row[j] + 1)
                .min(previous + usize::from(a != b));
            previous = old;
        }
    }
    *row.last().unwrap_or(&0)
}

fn resolve_directory(requested: &std::path::Path) -> Result<(std::path::PathBuf, bool), String> {
    if requested.is_dir() {
        return Ok((requested.to_path_buf(), false));
    }
    let parent = requested
        .parent()
        .ok_or_else(|| format!("The exact path {} does not exist.", requested.display()))?;
    let wanted = requested
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("")
        .to_lowercase();
    let mut matches = std::fs::read_dir(parent)
        .map_err(|_| format!("The exact path {} does not exist.", requested.display()))?
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().map(|kind| kind.is_dir()).unwrap_or(false))
        .filter(|entry| {
            edit_distance(&wanted, &entry.file_name().to_string_lossy().to_lowercase()) == 1
        })
        .map(|entry| entry.path())
        .collect::<Vec<_>>();
    if matches.len() != 1 {
        return Err(format!(
            "The exact path {} does not exist, and no unique close directory match was found.",
            requested.display()
        ));
    }
    Ok((matches.remove(0), true))
}

#[tauri::command]
pub fn get_largest_files_status(path: String, limit: usize) -> Result<LargestFilesStatus, String> {
    if !(1..=10).contains(&limit)
        || path.is_empty()
        || path.len() > 1024
        || path.chars().any(char::is_control)
    {
        return Err("The path or requested file count is outside the bounded limits.".to_string());
    }
    let requested = std::path::PathBuf::from(&path);
    let (resolved, corrected) = resolve_directory(&requested)?;
    let resolved = resolved
        .canonicalize()
        .map_err(|error| format!("The directory could not be resolved: {error}"))?;
    let mut stack = vec![resolved.clone()];
    let mut files = Vec::new();
    let mut visited = 0usize;
    let mut truncated = false;
    'scan: while let Some(directory) = stack.pop() {
        let Ok(entries) = std::fs::read_dir(&directory) else {
            continue;
        };
        for entry in entries.flatten() {
            visited += 1;
            if visited > MAX_FILE_SCAN_ENTRIES {
                truncated = true;
                break 'scan;
            }
            let Ok(kind) = entry.file_type() else {
                continue;
            };
            if kind.is_symlink() {
                continue;
            }
            if kind.is_dir() {
                stack.push(entry.path());
                continue;
            }
            if kind.is_file() {
                if let Ok(metadata) = entry.metadata() {
                    files.push(LargestFileEntry {
                        path: entry.path().to_string_lossy().into_owned(),
                        size_bytes: metadata.len(),
                    });
                }
            }
        }
    }
    files.sort_by(|left, right| {
        right
            .size_bytes
            .cmp(&left.size_bytes)
            .then_with(|| left.path.cmp(&right.path))
    });
    files.truncate(limit);
    Ok(LargestFilesStatus {
        requested_path: path,
        resolved_path: resolved.to_string_lossy().into_owned(),
        corrected,
        files,
        truncated,
    })
}

pub(crate) fn privacy_allows(process_name: &str, title: &str) -> bool {
    let context = format!("{process_name} {title}").to_lowercase();
    !PRIVACY_BLOCKED_TERMS
        .iter()
        .any(|term| context.contains(term))
}

fn canonical_process_name(value: &str) -> String {
    let normalized = value.trim().to_lowercase();
    let without_extension = normalized.strip_suffix(".exe").unwrap_or(&normalized);
    match without_extension {
        "microsoft word" | "ms word" | "word" => "winword".to_string(),
        other => other.to_string(),
    }
}

fn process_name_matches_query(process_name: &str, query: &str) -> bool {
    canonical_process_name(process_name) == canonical_process_name(query)
}

#[cfg(target_os = "windows")]
fn read_running_app_status(query: &str) -> Result<RunningAppStatus, String> {
    use std::mem::size_of;
    use windows::Win32::{
        Foundation::CloseHandle,
        System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, PROCESSENTRY32W, Process32FirstW, Process32NextW,
            TH32CS_SNAPPROCESS,
        },
    };

    let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) }
        .map_err(|error| format!("The running-process list could not be read: {error}"))?;
    let result = (|| -> Result<Vec<String>, String> {
        let mut entry = PROCESSENTRY32W {
            dwSize: size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };
        unsafe { Process32FirstW(snapshot, &mut entry) }
            .map_err(|error| format!("The running-process list could not be started: {error}"))?;
        let mut matches = Vec::new();
        loop {
            let length = entry
                .szExeFile
                .iter()
                .position(|character| *character == 0)
                .unwrap_or(entry.szExeFile.len());
            let process_name = String::from_utf16_lossy(&entry.szExeFile[..length]);
            if process_name_matches_query(&process_name, query)
                && !matches.iter().any(|existing| existing == &process_name)
            {
                matches.push(process_name);
            }
            if unsafe { Process32NextW(snapshot, &mut entry) }.is_err() {
                break;
            }
        }
        Ok(matches)
    })();
    let _ = unsafe { CloseHandle(snapshot) };
    let matched_processes = result?;
    Ok(RunningAppStatus {
        query: query.to_string(),
        running: !matched_processes.is_empty(),
        matched_processes,
    })
}

#[cfg(not(target_os = "windows"))]
fn read_running_app_status(_query: &str) -> Result<RunningAppStatus, String> {
    Err("Running-application status is currently available only on Windows.".to_string())
}

#[tauri::command]
pub fn get_running_app_status(query: String) -> Result<RunningAppStatus, String> {
    let bounded = query.trim();
    if bounded.is_empty() || bounded.len() > 80 || bounded.chars().any(char::is_control) {
        return Err("The application name is empty or too long.".to_string());
    }
    read_running_app_status(bounded)
}

#[cfg(target_os = "windows")]
fn read_running_services_status() -> Result<RunningServicesStatus, String> {
    use std::{mem::size_of, slice};
    use windows::{
        Win32::System::Services::{
            CloseServiceHandle, ENUM_SERVICE_STATUS_PROCESSW, EnumServicesStatusExW,
            OpenSCManagerW, SC_ENUM_PROCESS_INFO, SC_MANAGER_ENUMERATE_SERVICE, SERVICE_ACTIVE,
            SERVICE_WIN32,
        },
        core::PCWSTR,
    };

    let manager =
        unsafe { OpenSCManagerW(PCWSTR::null(), PCWSTR::null(), SC_MANAGER_ENUMERATE_SERVICE) }
            .map_err(|error| format!("The Windows service manager could not be opened: {error}"))?;

    let result = (|| -> Result<Vec<RunningServiceEntry>, String> {
        let mut bytes_needed = 0u32;
        let mut services_returned = 0u32;
        let _ = unsafe {
            EnumServicesStatusExW(
                manager,
                SC_ENUM_PROCESS_INFO,
                SERVICE_WIN32,
                SERVICE_ACTIVE,
                None,
                &mut bytes_needed,
                &mut services_returned,
                None,
                PCWSTR::null(),
            )
        };
        if bytes_needed == 0 {
            return Ok(Vec::new());
        }

        let word_count = (bytes_needed as usize).div_ceil(size_of::<usize>());
        let mut storage = vec![0usize; word_count];
        let buffer = unsafe {
            slice::from_raw_parts_mut(
                storage.as_mut_ptr().cast::<u8>(),
                storage.len() * size_of::<usize>(),
            )
        };
        unsafe {
            EnumServicesStatusExW(
                manager,
                SC_ENUM_PROCESS_INFO,
                SERVICE_WIN32,
                SERVICE_ACTIVE,
                Some(buffer),
                &mut bytes_needed,
                &mut services_returned,
                None,
                PCWSTR::null(),
            )
        }
        .map_err(|error| {
            format!("The running Windows services could not be enumerated: {error}")
        })?;

        let entries = unsafe {
            slice::from_raw_parts(
                storage.as_ptr().cast::<ENUM_SERVICE_STATUS_PROCESSW>(),
                services_returned as usize,
            )
        };
        Ok(entries
            .iter()
            .filter_map(|entry| {
                let name = unsafe { entry.lpServiceName.to_string().ok()? };
                let display_name = unsafe { entry.lpDisplayName.to_string().ok()? };
                (!name.is_empty()).then_some(RunningServiceEntry { name, display_name })
            })
            .collect())
    })();
    let _ = unsafe { CloseServiceHandle(manager) };
    Ok(RunningServicesStatus { services: result? })
}

#[cfg(not(target_os = "windows"))]
fn read_running_services_status() -> Result<RunningServicesStatus, String> {
    Err("Running-service status is currently available only on Windows.".to_string())
}

#[tauri::command]
pub fn get_running_services_status() -> Result<RunningServicesStatus, String> {
    read_running_services_status()
}

fn select_top_memory_applications(
    samples: impl IntoIterator<Item = (String, u64)>,
    limit: usize,
) -> Vec<MemoryApplicationEntry> {
    use std::collections::HashMap;

    let mut applications: HashMap<String, MemoryApplicationEntry> = HashMap::new();
    for (process_name, working_set_bytes) in samples {
        if process_name.is_empty() || working_set_bytes == 0 {
            continue;
        }
        let key = process_name.to_lowercase();
        let application = applications
            .entry(key)
            .or_insert_with(|| MemoryApplicationEntry {
                process_name,
                working_set_bytes: 0,
                process_count: 0,
            });
        application.working_set_bytes = application
            .working_set_bytes
            .saturating_add(working_set_bytes);
        application.process_count = application.process_count.saturating_add(1);
    }
    let mut ranked = applications.into_values().collect::<Vec<_>>();
    ranked.sort_by(|left, right| {
        right
            .working_set_bytes
            .cmp(&left.working_set_bytes)
            .then_with(|| left.process_name.cmp(&right.process_name))
    });
    ranked.truncate(limit);
    ranked
}

#[cfg(target_os = "windows")]
fn read_top_memory_applications_status(
    limit: usize,
) -> Result<TopMemoryApplicationsStatus, String> {
    use std::mem::size_of;
    use windows::Win32::{
        Foundation::CloseHandle,
        System::{
            Diagnostics::ToolHelp::{
                CreateToolhelp32Snapshot, PROCESSENTRY32W, Process32FirstW, Process32NextW,
                TH32CS_SNAPPROCESS,
            },
            ProcessStatus::{GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS},
            Threading::{OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ},
        },
    };

    let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) }
        .map_err(|error| format!("The process list could not be read: {error}"))?;
    let result = (|| -> Result<Vec<(String, u64)>, String> {
        let mut entry = PROCESSENTRY32W {
            dwSize: size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };
        unsafe { Process32FirstW(snapshot, &mut entry) }
            .map_err(|error| format!("The process list could not be started: {error}"))?;
        let mut samples = Vec::new();
        loop {
            let length = entry
                .szExeFile
                .iter()
                .position(|character| *character == 0)
                .unwrap_or(entry.szExeFile.len());
            let process_name = String::from_utf16_lossy(&entry.szExeFile[..length]);
            if entry.th32ProcessID != 0
                && !matches!(process_name.to_lowercase().as_str(), "system" | "registry")
            {
                if let Ok(process) = unsafe {
                    OpenProcess(
                        PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
                        false,
                        entry.th32ProcessID,
                    )
                } {
                    let mut counters = PROCESS_MEMORY_COUNTERS {
                        cb: size_of::<PROCESS_MEMORY_COUNTERS>() as u32,
                        ..Default::default()
                    };
                    if unsafe {
                        GetProcessMemoryInfo(
                            process,
                            &mut counters,
                            size_of::<PROCESS_MEMORY_COUNTERS>() as u32,
                        )
                    }
                    .is_ok()
                    {
                        samples.push((process_name, counters.WorkingSetSize as u64));
                    }
                    let _ = unsafe { CloseHandle(process) };
                }
            }
            if unsafe { Process32NextW(snapshot, &mut entry) }.is_err() {
                break;
            }
        }
        Ok(samples)
    })();
    let _ = unsafe { CloseHandle(snapshot) };
    let applications = select_top_memory_applications(result?, limit);
    if applications.is_empty() {
        return Err("No readable application memory data was available.".to_string());
    }
    Ok(TopMemoryApplicationsStatus { applications })
}

#[cfg(not(target_os = "windows"))]
fn read_top_memory_applications_status(
    _limit: usize,
) -> Result<TopMemoryApplicationsStatus, String> {
    Err("Application memory status is currently available only on Windows.".to_string())
}

#[tauri::command]
pub fn get_top_memory_applications_status(
    limit: usize,
) -> Result<TopMemoryApplicationsStatus, String> {
    if !(1..=10).contains(&limit) {
        return Err("The requested application count must be between 1 and 10.".to_string());
    }
    read_top_memory_applications_status(limit)
}

#[cfg(target_os = "windows")]
fn active_window_handle() -> u64 {
    use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;

    unsafe { GetForegroundWindow().0 as usize as u64 }
}

#[cfg(not(target_os = "windows"))]
fn active_window_handle() -> u64 {
    0
}

#[tauri::command]
pub fn get_active_window_snapshot() -> Result<ActiveWindowSnapshot, String> {
    let window = active_win_pos_rs::get_active_window()
        .map_err(|_| "The active window could not be read.".to_string())?;

    Ok(ActiveWindowSnapshot {
        process_name: window.app_name,
        title: window.title,
        process_id: window.process_id,
        x: window.position.x,
        y: window.position.y,
        width: window.position.width,
        height: window.position.height,
        window_handle: active_window_handle(),
    })
}

#[cfg(target_os = "windows")]
fn read_windows_accessibility_text(
    target: &WindowTextContextTarget,
) -> Result<WindowTextContext, String> {
    use std::ffi::c_void;
    use windows::Win32::Foundation::{HWND, RPC_E_CHANGED_MODE};
    use windows::Win32::System::Com::{
        CLSCTX_INPROC_SERVER, COINIT_MULTITHREADED, CoCreateInstance, CoInitializeEx,
        CoUninitialize,
    };
    use windows::Win32::UI::Accessibility::{
        CUIAutomation, IUIAutomation, IUIAutomationTextPattern, TreeScope_Subtree,
        UIA_TextPatternId,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId, IsWindow,
    };

    let hwnd = HWND(target.window_handle as usize as *mut c_void);
    if !unsafe { IsWindow(Some(hwnd)) }.as_bool() {
        return Err("The previously observed window is no longer available.".to_string());
    }

    let mut actual_process_id = 0u32;
    unsafe { GetWindowThreadProcessId(hwnd, Some(&mut actual_process_id)) };
    if u64::from(actual_process_id) != target.expected_process_id {
        return Err(
            "The previously observed window changed owners; no content was read.".to_string(),
        );
    }

    let title_length = unsafe { GetWindowTextLengthW(hwnd) };
    let mut title_buffer = vec![0u16; title_length.max(0) as usize + 1];
    let copied = unsafe { GetWindowTextW(hwnd, &mut title_buffer) }.max(0) as usize;
    let current_title = String::from_utf16_lossy(&title_buffer[..copied]);
    if !privacy_allows(&target.expected_process_name, &target.expected_title)
        || !privacy_allows(&target.expected_process_name, &current_title)
    {
        return Err("Current-window analysis was blocked by the privacy policy.".to_string());
    }

    let initialization = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
    let should_uninitialize = initialization.is_ok();
    if initialization.is_err() && initialization != RPC_E_CHANGED_MODE {
        return Err(format!(
            "Windows accessibility initialization failed: {initialization:?}"
        ));
    }

    let result = (|| -> Result<(String, bool), String> {
        let automation: IUIAutomation = unsafe {
            CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER)
                .map_err(|error| format!("Windows accessibility is unavailable: {error}"))?
        };
        let root = unsafe { automation.ElementFromHandle(hwnd) }
            .map_err(|error| format!("The observed window is not accessible: {error}"))?;
        let condition = unsafe { automation.CreateTrueCondition() }
            .map_err(|error| format!("Accessibility filtering failed: {error}"))?;
        let elements = unsafe { root.FindAll(TreeScope_Subtree, &condition) }
            .map_err(|error| format!("The observed window could not be inspected: {error}"))?;
        let count = unsafe { elements.Length() }.unwrap_or(0);
        let mut best = String::new();
        let mut best_truncated = false;

        for index in 0..count {
            let Ok(element) = (unsafe { elements.GetElement(index) }) else {
                continue;
            };
            let Ok(pattern) = (unsafe {
                element.GetCurrentPatternAs::<IUIAutomationTextPattern>(UIA_TextPatternId)
            }) else {
                continue;
            };
            let Ok(ranges) = (unsafe { pattern.GetVisibleRanges() }) else {
                continue;
            };
            let range_count = unsafe { ranges.Length() }.unwrap_or(0);
            let mut visible_text = String::new();
            let mut truncated = false;
            for range_index in 0..range_count {
                if visible_text.chars().count() >= MAX_CONTEXT_CHARS {
                    truncated = true;
                    break;
                }
                let Ok(range) = (unsafe { ranges.GetElement(range_index) }) else {
                    continue;
                };
                let remaining = MAX_CONTEXT_CHARS.saturating_sub(visible_text.chars().count());
                let Ok(text) = (unsafe { range.GetText(remaining as i32) }) else {
                    continue;
                };
                let part = text.to_string();
                if part.chars().count() >= remaining {
                    truncated = true;
                }
                visible_text.push_str(&part);
            }
            if visible_text.trim().len() > best.trim().len() {
                best = visible_text;
                best_truncated = truncated;
            }
        }

        if best.trim().is_empty() {
            return Err("The window exposes no visible accessibility text. Paste the error or script into MyBuddy-AI instead.".to_string());
        }
        Ok((best, best_truncated))
    })();

    if should_uninitialize {
        unsafe { CoUninitialize() };
    }
    let (text, truncated) = result?;
    Ok(WindowTextContext {
        process_name: target.expected_process_name.clone(),
        title: current_title,
        text,
        truncated,
        source: "accessibility-visible-text",
    })
}

#[cfg(not(target_os = "windows"))]
fn read_windows_accessibility_text(
    _target: &WindowTextContextTarget,
) -> Result<WindowTextContext, String> {
    Err("Visible-window accessibility text is not implemented on this platform. Paste the error or script into MyBuddy-AI instead.".to_string())
}

#[tauri::command]
pub fn get_window_text_context(
    target: WindowTextContextTarget,
) -> Result<WindowTextContext, String> {
    if target.window_handle == 0 || target.expected_process_id == 0 {
        return Err("No exact previously observed window is available.".to_string());
    }
    if !privacy_allows(&target.expected_process_name, &target.expected_title) {
        return Err("Current-window analysis was blocked by the privacy policy.".to_string());
    }
    read_windows_accessibility_text(&target)
}

#[cfg(test)]
mod tests {
    use super::{
        edit_distance, privacy_allows, process_name_matches_query, select_top_memory_applications,
    };

    #[test]
    fn directory_typo_matching_requires_one_edit() {
        assert_eq!(edit_distance("souce", "source"), 1);
        assert_eq!(edit_distance("missing", "source"), 7);
    }

    #[test]
    fn privacy_blocks_sensitive_window_metadata_before_capture() {
        assert!(!privacy_allows("1Password.exe", "Vault"));
        assert!(privacy_allows("WindowsTerminal.exe", "pwsh in kgkzworld"));
    }

    #[test]
    fn running_process_match_handles_notepad_and_word_names() {
        assert!(process_name_matches_query("notepad++.exe", "notepad++"));
        assert!(process_name_matches_query("WINWORD.EXE", "Microsoft Word"));
        assert!(!process_name_matches_query("notepad.exe", "notepad++"));
    }

    #[test]
    fn memory_usage_is_aggregated_by_application_before_selecting_the_top_one() {
        let top = select_top_memory_applications(
            [
                ("chrome.exe".to_string(), 600),
                ("Chrome.exe".to_string(), 500),
                ("single.exe".to_string(), 1_000),
            ],
            2,
        );
        assert_eq!(top[0].process_name.to_lowercase(), "chrome.exe");
        assert_eq!(top[0].working_set_bytes, 1_100);
        assert_eq!(top[0].process_count, 2);
        assert_eq!(top[1].process_name, "single.exe");
    }
}
