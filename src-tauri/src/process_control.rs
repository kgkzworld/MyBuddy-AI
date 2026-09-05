use serde::Serialize;

const MAX_MATCHING_PROCESSES: usize = 32;
const PROTECTED_PROCESS_NAMES: &[&str] = &[
    "ambient-desktop-agent",
    "system",
    "registry",
    "smss",
    "csrss",
    "wininit",
    "winlogon",
    "services",
    "lsass",
    "svchost",
    "dwm",
    "explorer",
];

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessTerminationResult {
    pub query: String,
    pub matched_count: usize,
    pub terminated_count: usize,
    pub remaining_processes: Vec<String>,
    pub verified: bool,
    pub message: String,
}

fn canonical_process_name(value: &str) -> String {
    let normalized = value.trim().to_ascii_lowercase();
    normalized
        .strip_suffix(".exe")
        .unwrap_or(&normalized)
        .to_string()
}

fn process_lookup_key(value: &str) -> String {
    value
        .split(|character: char| !character.is_ascii_alphanumeric() && character != '+')
        .filter(|part| !part.is_empty())
        .filter(|part| {
            !matches!(
                part.to_ascii_lowercase().as_str(),
                "the"
                    | "a"
                    | "an"
                    | "stuck"
                    | "hung"
                    | "browser"
                    | "window"
                    | "process"
                    | "app"
                    | "application"
            )
        })
        .map(|part| {
            if part.eq_ignore_ascii_case("microsoft") {
                "ms".to_string()
            } else {
                part.to_ascii_lowercase()
            }
        })
        .collect::<String>()
        .trim_end_matches("exe")
        .to_string()
}

pub fn resolve_process_termination_target<'a>(
    query: &str,
    running_names: impl Iterator<Item = &'a str>,
) -> Result<String, String> {
    let bounded = validate_process_termination_target(query)?;
    let query_key = process_lookup_key(&bounded);
    if query_key.is_empty() {
        return Err("The process target did not contain a usable application name.".into());
    }
    let mut matches = running_names
        .filter(|name| {
            let candidate = process_lookup_key(name);
            candidate == query_key || candidate.strip_prefix("ms") == Some(query_key.as_str())
        })
        .map(str::to_string)
        .collect::<Vec<_>>();
    matches.sort_by_key(|name| name.to_ascii_lowercase());
    matches.dedup_by(|left, right| left.eq_ignore_ascii_case(right));
    match matches.as_slice() {
        [only] => validate_process_termination_target(only),
        [] => Ok(bounded),
        _ => Err(
            "The application label matched more than one running executable; nothing was terminated."
                .into(),
        ),
    }
}

pub fn validate_process_termination_target(query: &str) -> Result<String, String> {
    let bounded = query.trim();
    if bounded.is_empty() || bounded.len() > 80 || bounded.chars().any(char::is_control) {
        return Err("The process target is empty, invalid, or too long.".into());
    }
    let canonical = canonical_process_name(bounded);
    if PROTECTED_PROCESS_NAMES.contains(&canonical.as_str()) {
        return Err("MyBuddy-AI will not terminate itself, the Windows shell, or protected system processes.".into());
    }
    Ok(bounded.to_string())
}

#[cfg(target_os = "windows")]
fn enumerate_processes() -> Result<Vec<(u32, String)>, String> {
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
    let result = (|| {
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
                .position(|value| *value == 0)
                .unwrap_or(entry.szExeFile.len());
            let process_name = String::from_utf16_lossy(&entry.szExeFile[..length]);
            if entry.th32ProcessID != std::process::id() {
                matches.push((entry.th32ProcessID, process_name));
            }
            if unsafe { Process32NextW(snapshot, &mut entry) }.is_err() {
                break;
            }
        }
        Ok::<_, String>(matches)
    })();
    let _ = unsafe { CloseHandle(snapshot) };
    result
}

#[cfg(not(target_os = "windows"))]
fn enumerate_processes() -> Result<Vec<(u32, String)>, String> {
    Err("Named-process termination is currently available only on Windows.".into())
}

fn enumerate_matching_processes(query: &str) -> Result<Vec<(u32, String)>, String> {
    Ok(enumerate_processes()?
        .into_iter()
        .filter(|(_, process_name)| {
            canonical_process_name(process_name) == canonical_process_name(query)
        })
        .take(MAX_MATCHING_PROCESSES)
        .collect())
}

#[cfg(target_os = "windows")]
fn terminate_process(process_id: u32) -> Result<(), String> {
    use windows::Win32::{
        Foundation::CloseHandle,
        System::Threading::{OpenProcess, PROCESS_TERMINATE, TerminateProcess},
    };

    let handle = unsafe { OpenProcess(PROCESS_TERMINATE, false, process_id) }
        .map_err(|error| format!("PID {process_id} could not be opened: {error}"))?;
    let result = unsafe { TerminateProcess(handle, 1) }
        .map_err(|error| format!("PID {process_id} could not be terminated: {error}"));

    let _ = unsafe { CloseHandle(handle) };
    result
}

#[cfg(not(target_os = "windows"))]
fn terminate_process(_process_id: u32) -> Result<(), String> {
    Err("Named-process termination is currently available only on Windows.".into())
}

#[tauri::command]
pub fn terminate_matching_processes(
    query: String,
    all: bool,
) -> Result<ProcessTerminationResult, String> {
    let running = enumerate_processes()?;
    let target = resolve_process_termination_target(
        &query,
        running
            .iter()
            .map(|(_, process_name)| process_name.as_str()),
    )?;
    let mut matches = enumerate_matching_processes(&target)?;
    if !all {
        matches.truncate(1);
    }
    let matched_count = matches.len();
    let mut terminated_count = 0;
    let mut failures = Vec::new();
    for (process_id, process_name) in matches {
        match terminate_process(process_id) {
            Ok(()) => terminated_count += 1,
            Err(error) => failures.push(format!("{process_name} ({process_id}): {error}")),
        }
    }
    if terminated_count > 0 {
        std::thread::sleep(std::time::Duration::from_millis(300));
    }
    let remaining_processes = enumerate_matching_processes(&target)?
        .into_iter()
        .map(|(process_id, process_name)| format!("{process_name} ({process_id})"))
        .collect::<Vec<_>>();
    let verified = remaining_processes.is_empty() && failures.is_empty();
    let message = if matched_count == 0 {
        format!("No matching {target} processes were running. Verified none remain.")
    } else if verified {
        format!("Closed {terminated_count} matching {target} process(es) and verified none remain.")
    } else {
        format!(
            "Closed {terminated_count} of {matched_count} matching {target} process(es); {} remain or could not be closed.",
            remaining_processes.len() + failures.len()
        )
    };
    Ok(ProcessTerminationResult {
        query: target,
        matched_count,
        terminated_count,
        remaining_processes,
        verified,
        message,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        resolve_process_termination_target, terminate_matching_processes,
        validate_process_termination_target,
    };

    #[test]
    fn accepts_bounded_named_application_targets() {
        assert_eq!(
            validate_process_termination_target("notepad++.exe").unwrap(),
            "notepad++.exe"
        );
    }

    #[test]
    fn resolves_natural_edge_window_labels_to_the_running_executable() {
        let running = ["msedge.exe", "chrome.exe", "notepad++.exe"];
        for request in [
            "MS Edge browser window",
            "stuck Microsoft Edge window",
            "Edge application",
        ] {
            assert_eq!(
                resolve_process_termination_target(request, running.iter().copied()).unwrap(),
                "msedge.exe"
            );
        }
    }

    #[test]
    fn rejects_empty_control_character_and_protected_system_targets() {
        for target in [
            "",
            "bad\nname.exe",
            "ambient-desktop-agent.exe",
            "lsass.exe",
            "explorer.exe",
        ] {
            assert!(
                validate_process_termination_target(target).is_err(),
                "{target}"
            );
        }
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn terminates_and_verifies_only_a_uniquely_named_disposable_process() {
        use std::{fs, process::Command, thread, time::Duration};

        let name = format!("mybuddy-kill-test-{}.exe", std::process::id());
        let path = std::env::temp_dir().join(&name);
        let source = std::path::PathBuf::from(std::env::var_os("SystemRoot").unwrap())
            .join("System32")
            .join("ping.exe");
        fs::copy(source, &path).unwrap();
        let mut child = Command::new(&path)
            .args(["-n", "30", "127.0.0.1"])
            .spawn()
            .unwrap();
        thread::sleep(Duration::from_millis(200));

        let result = terminate_matching_processes(name, true).unwrap();

        assert_eq!(result.matched_count, 1);
        assert_eq!(result.terminated_count, 1);
        assert!(result.verified);
        assert!(result.remaining_processes.is_empty());
        let _ = child.wait();
        fs::remove_file(path).unwrap();
    }
}
