use crate::notepad_takeover::TakeoverExecutionResult;

#[cfg(target_os = "windows")]
mod windows_takeover {
    use super::TakeoverExecutionResult;
    use std::{
        env,
        os::windows::process::CommandExt,
        path::{Path, PathBuf},
        process::Command,
        thread,
        time::{Duration, Instant},
    };
    use windows::{
        Win32::{
            Foundation::{HWND, LPARAM},
            UI::WindowsAndMessaging::{
                EnumWindows, GetClassNameW, GetWindowTextW, GetWindowThreadProcessId,
                IsWindowVisible, SW_RESTORE, SetForegroundWindow, ShowWindow,
            },
        },
        core::BOOL,
    };

    const WORD_DIALOG_FILE_OPEN: i32 = 80;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    const WORD_MAIN_CLASS: &str = "OpusApp";
    const FILE_DIALOG_CLASS: &str = "#32770";
    const FILE_DIALOG_TITLE: &str = "Open";
    const WORD_SYSTEM_PATH: &str = r"C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE";
    const WORD_OPEN_SCRIPT: &str = r#"
$ErrorActionPreference = 'Stop'
$dialogId = __DIALOG_ID__
try {
  $word = [Runtime.InteropServices.Marshal]::GetActiveObject('Word.Application')
} catch {
  $word = New-Object -ComObject Word.Application
}
$word.Visible = $true
$word.Activate()
$null = $word.Dialogs.Item($dialogId).Show()
"#;

    struct WindowSearch {
        class_name: &'static str,
        title: Option<&'static str>,
        process_id: Option<u32>,
        found: Option<HWND>,
    }

    unsafe extern "system" fn enumerate_window(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let search = unsafe { &mut *(lparam.0 as *mut WindowSearch) };
        if search.found.is_some() || !unsafe { IsWindowVisible(hwnd) }.as_bool() {
            return BOOL(1);
        }
        let mut class_buffer = [0u16; 128];
        let class_length = unsafe { GetClassNameW(hwnd, &mut class_buffer) };
        if class_length <= 0
            || String::from_utf16_lossy(&class_buffer[..class_length as usize]) != search.class_name
        {
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
    ) -> Option<HWND> {
        let mut search = WindowSearch {
            class_name,
            title,
            process_id,
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

    fn wait_for_window(
        class_name: &'static str,
        title: Option<&'static str>,
        process_id: Option<u32>,
        timeout: Duration,
    ) -> Option<HWND> {
        let deadline = Instant::now() + timeout;
        loop {
            if let Some(window) = find_window(class_name, title, process_id) {
                return Some(window);
            }
            if Instant::now() >= deadline {
                return None;
            }
            thread::sleep(Duration::from_millis(100));
        }
    }

    fn process_id_for_window(window: HWND) -> u32 {
        let mut process_id = 0;
        unsafe { GetWindowThreadProcessId(window, Some(&mut process_id)) };
        process_id
    }

    fn installed_word() -> Option<PathBuf> {
        let mut candidates = vec![PathBuf::from(WORD_SYSTEM_PATH)];
        for variable in ["ProgramFiles", "ProgramFiles(x86)"] {
            if let Some(root) = env::var_os(variable) {
                candidates.push(
                    PathBuf::from(root)
                        .join("Microsoft Office")
                        .join("root")
                        .join("Office16")
                        .join("WINWORD.EXE"),
                );
            }
        }
        candidates
            .into_iter()
            .find(|path| Path::new(path).is_file())
    }

    fn windows_powershell() -> Result<PathBuf, String> {
        let root = env::var_os("SystemRoot")
            .ok_or_else(|| "Windows system directory is unavailable.".to_string())?;
        let path = PathBuf::from(root)
            .join("System32")
            .join("WindowsPowerShell")
            .join("v1.0")
            .join("powershell.exe");
        Path::new(&path)
            .is_file()
            .then_some(path)
            .ok_or_else(|| "Windows PowerShell was not found at its fixed system path.".to_string())
    }

    pub fn execute_launch() -> Result<TakeoverExecutionResult, String> {
        let word_path = installed_word().ok_or_else(|| {
            "Microsoft Word was not found in the approved Office installation locations."
                .to_string()
        })?;
        let word_window = if let Some(window) = find_window(WORD_MAIN_CLASS, None, None) {
            window
        } else {
            Command::new(word_path)
                .spawn()
                .map_err(|error| format!("Could not start Microsoft Word: {error}"))?;
            wait_for_window(WORD_MAIN_CLASS, None, None, Duration::from_secs(12))
                .ok_or_else(|| "Microsoft Word started but no main window appeared.".to_string())?
        };

        let _ = unsafe { ShowWindow(word_window, SW_RESTORE) };
        let _ = unsafe { SetForegroundWindow(word_window) };
        if !unsafe { IsWindowVisible(word_window) }.as_bool() {
            return Err("Microsoft Word did not expose a visible main window.".into());
        }

        Ok(TakeoverExecutionResult {
            application: "Microsoft Word".into(),
            action: "Launch".into(),
            verified: true,
            message: "Microsoft Word is running and its main window is visible.".into(),
        })
    }

    pub fn execute() -> Result<TakeoverExecutionResult, String> {
        installed_word().ok_or_else(|| {
            "Microsoft Word was not found in the approved Office installation locations."
                .to_string()
        })?;
        let script = WORD_OPEN_SCRIPT.replace("__DIALOG_ID__", &WORD_DIALOG_FILE_OPEN.to_string());
        let mut child = Command::new(windows_powershell()?)
            .args(["-NoProfile", "-NonInteractive", "-Sta", "-Command", &script])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|error| format!("Could not start the fixed Word automation: {error}"))?;
        thread::spawn(move || {
            let _ = child.wait();
        });

        let main_window = wait_for_window(WORD_MAIN_CLASS, None, None, Duration::from_secs(12))
            .ok_or_else(|| "Microsoft Word started but no main window appeared.".to_string())?;
        let process_id = process_id_for_window(main_window);
        wait_for_window(
            FILE_DIALOG_CLASS,
            Some(FILE_DIALOG_TITLE),
            Some(process_id),
            Duration::from_secs(8),
        )
        .ok_or_else(|| {
            "Microsoft Word did not expose a verified File Open dialog before the timeout."
                .to_string()
        })?;

        Ok(TakeoverExecutionResult {
            application: "Microsoft Word".into(),
            action: "File > Open".into(),
            verified: true,
            message:
                "Microsoft Word is running and its File Open dialog is visible. No file was selected."
                    .into(),
        })
    }
}

#[tauri::command]
pub async fn execute_word_launch() -> Result<TakeoverExecutionResult, String> {
    #[cfg(target_os = "windows")]
    {
        return tauri::async_runtime::spawn_blocking(windows_takeover::execute_launch)
            .await
            .map_err(|error| format!("Microsoft Word launch worker failed: {error}"))?;
    }

    #[cfg(not(target_os = "windows"))]
    Err("The Microsoft Word launch capability is available only on Windows.".into())
}

#[tauri::command]
pub async fn execute_word_open_dialog() -> Result<TakeoverExecutionResult, String> {
    #[cfg(target_os = "windows")]
    {
        return tauri::async_runtime::spawn_blocking(windows_takeover::execute)
            .await
            .map_err(|error| format!("Microsoft Word action worker failed: {error}"))?;
    }

    #[cfg(not(target_os = "windows"))]
    Err("The Microsoft Word File Open capability is available only on Windows.".into())
}
