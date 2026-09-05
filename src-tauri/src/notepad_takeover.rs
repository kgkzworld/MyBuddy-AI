use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TakeoverExecutionResult {
    pub application: String,
    pub action: String,
    pub verified: bool,
    pub message: String,
}

#[cfg(target_os = "windows")]
mod windows_takeover {
    use super::TakeoverExecutionResult;
    use std::{
        env,
        path::{Path, PathBuf},
        process::Command,
        thread,
        time::{Duration, Instant, SystemTime, UNIX_EPOCH},
    };
    use windows::{
        Win32::{
            Foundation::{HWND, LPARAM},
            System::Threading::{AttachThreadInput, GetCurrentThreadId},
            UI::WindowsAndMessaging::{
                BringWindowToTop, EnumWindows, GetClassNameW, GetForegroundWindow, GetWindowTextW,
                GetWindowThreadProcessId, IsWindowVisible, SW_RESTORE, SetForegroundWindow,
                ShowWindow,
            },
        },
        core::BOOL,
    };

    const NOTEPAD_MAIN_CLASS: &str = "Notepad++";

    struct WindowSearch {
        class_name: &'static str,
        title: Option<&'static str>,
        process_id: Option<u32>,
        visible_only: bool,
        found: Option<HWND>,
    }

    unsafe extern "system" fn enumerate_window(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let search = unsafe { &mut *(lparam.0 as *mut WindowSearch) };
        if search.found.is_some()
            || (search.visible_only && !unsafe { IsWindowVisible(hwnd) }.as_bool())
        {
            return BOOL(1);
        }

        let mut class_buffer = [0u16; 128];
        let class_length = unsafe { GetClassNameW(hwnd, &mut class_buffer) };
        if class_length <= 0 {
            return BOOL(1);
        }
        let class_name = String::from_utf16_lossy(&class_buffer[..class_length as usize]);
        if class_name != search.class_name {
            return BOOL(1);
        }

        if let Some(expected_process_id) = search.process_id {
            let mut actual_process_id = 0;
            unsafe { GetWindowThreadProcessId(hwnd, Some(&mut actual_process_id)) };
            if actual_process_id != expected_process_id {
                return BOOL(1);
            }
        }

        if let Some(expected_title) = search.title {
            let mut title_buffer = [0u16; 256];
            let title_length = unsafe { GetWindowTextW(hwnd, &mut title_buffer) };
            let title = if title_length > 0 {
                String::from_utf16_lossy(&title_buffer[..title_length as usize])
            } else {
                String::new()
            };
            if title != expected_title {
                return BOOL(1);
            }
        }

        search.found = Some(hwnd);
        BOOL(1)
    }

    fn find_window(
        class_name: &'static str,
        title: Option<&'static str>,
        process_id: Option<u32>,
        visible_only: bool,
    ) -> Option<HWND> {
        let mut search = WindowSearch {
            class_name,
            title,
            process_id,
            visible_only,
            found: None,
        };
        let _ = unsafe {
            EnumWindows(
                Some(enumerate_window),
                LPARAM((&mut search as *mut WindowSearch) as isize),
            )
        };
        search.found
    }

    fn candidate_paths() -> Vec<PathBuf> {
        let mut candidates = Vec::new();
        if let Some(program_files) = env::var_os("ProgramFiles") {
            candidates.push(
                PathBuf::from(program_files)
                    .join("Notepad++")
                    .join("notepad++.exe"),
            );
        }
        if let Some(program_files_x86) = env::var_os("ProgramFiles(x86)") {
            candidates.push(
                PathBuf::from(program_files_x86)
                    .join("Notepad++")
                    .join("notepad++.exe"),
            );
        }
        if let Some(local_app_data) = env::var_os("LOCALAPPDATA") {
            candidates.push(
                PathBuf::from(local_app_data)
                    .join("Programs")
                    .join("Notepad++")
                    .join("notepad++.exe"),
            );
        }
        candidates
    }

    fn installed_notepad() -> Option<PathBuf> {
        candidate_paths()
            .into_iter()
            .find(|path| Path::new(path).is_file())
    }

    fn wait_for_main_window_for_process(process_id: u32, timeout: Duration) -> Option<HWND> {
        let deadline = Instant::now() + timeout;
        loop {
            if let Some(window) = find_window(NOTEPAD_MAIN_CLASS, None, Some(process_id), true) {
                return Some(window);
            }
            if Instant::now() >= deadline {
                return None;
            }
            thread::sleep(Duration::from_millis(100));
        }
    }

    fn start_story_main_window(story_path: &Path) -> Result<HWND, String> {
        let executable = installed_notepad().ok_or_else(|| {
            "Notepad++ was not found in the approved installation locations.".to_string()
        })?;
        let child = Command::new(&executable)
            .args(["-multiInst", "-nosession"])
            .arg(story_path)
            .spawn()
            .map_err(|error| format!("Could not start a dedicated Notepad++ instance: {error}"))?;
        wait_for_main_window_for_process(child.id(), Duration::from_secs(10)).ok_or_else(|| {
            "The dedicated Notepad++ instance started but no main window appeared.".to_string()
        })
    }

    fn bring_to_verified_foreground(main_window: HWND) -> bool {
        let current_thread = unsafe { GetCurrentThreadId() };
        let foreground_window = unsafe { GetForegroundWindow() };
        let foreground_thread = if foreground_window.0.is_null() {
            0
        } else {
            unsafe { GetWindowThreadProcessId(foreground_window, None) }
        };
        let target_thread = unsafe { GetWindowThreadProcessId(main_window, None) };
        let attached_foreground = foreground_thread != 0 && foreground_thread != current_thread;
        let attached_target = target_thread != 0 && target_thread != current_thread;

        unsafe {
            if attached_foreground {
                let _ = AttachThreadInput(current_thread, foreground_thread, true);
            }
            if attached_target {
                let _ = AttachThreadInput(current_thread, target_thread, true);
            }
            let _ = ShowWindow(main_window, SW_RESTORE);
            let _ = BringWindowToTop(main_window);
            let _ = SetForegroundWindow(main_window);
            if attached_target {
                let _ = AttachThreadInput(current_thread, target_thread, false);
            }
            if attached_foreground {
                let _ = AttachThreadInput(current_thread, foreground_thread, false);
            }
        }

        unsafe { GetForegroundWindow() == main_window }
    }

    fn window_title(window: HWND) -> String {
        let mut buffer = [0u16; 512];
        let length = unsafe { GetWindowTextW(window, &mut buffer) };
        if length > 0 {
            String::from_utf16_lossy(&buffer[..length as usize])
        } else {
            String::new()
        }
    }

    pub fn execute_story(story: String) -> Result<TakeoverExecutionResult, String> {
        let bounded = story.trim();
        let word_count = bounded.split_whitespace().count();
        if bounded.is_empty() || bounded.len() > 20_000 || word_count > 500 {
            return Err(
                "The story must be non-empty, 500 words or fewer, and at most 20,000 characters."
                    .into(),
            );
        }

        let draft_id = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|error| format!("Could not create the story draft timestamp: {error}"))?
            .as_millis();
        let file_name = format!("MyBuddy Story {draft_id}.txt");
        let draft_path = env::temp_dir().join(&file_name);
        std::fs::write(&draft_path, bounded.as_bytes())
            .map_err(|error| format!("Could not write the bounded story draft: {error}"))?;
        let read_back = std::fs::read_to_string(&draft_path)
            .map_err(|error| format!("Could not verify the bounded story draft: {error}"))?;
        if read_back != bounded {
            return Err("The saved story draft did not match the generated story.".into());
        }

        let main_window = start_story_main_window(&draft_path)?;
        if !bring_to_verified_foreground(main_window) {
            return Err("Notepad++ did not become the verified foreground window.".into());
        }
        let title = window_title(main_window);
        if !title.contains(&file_name) {
            return Err("Notepad++ did not show the verified story draft in its tab.".into());
        }

        Ok(TakeoverExecutionResult {
            application: "Notepad++".into(),
            action: "Create and open story draft".into(),
            verified: true,
            message: format!(
                "Notepad++ opened a new verified draft file containing the {word_count}-word story."
            ),
        })
    }
}

#[tauri::command]
pub async fn execute_notepad_story(story: String) -> Result<TakeoverExecutionResult, String> {
    #[cfg(target_os = "windows")]
    {
        return tauri::async_runtime::spawn_blocking(move || {
            windows_takeover::execute_story(story)
        })
        .await
        .map_err(|error| format!("Notepad++ story worker failed: {error}"))?;
    }

    #[cfg(not(target_os = "windows"))]
    Err("The Notepad++ story capability is available only on Windows.".into())
}
