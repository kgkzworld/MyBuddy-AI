mod computer_use_takeover;
mod diagnostic_log;
mod file_io;
mod notepad_takeover;
mod observer;
pub mod orb;
mod process_control;
mod provider;
mod qwen;

use tauri::{
    Emitter, LogicalSize, Manager, PhysicalPosition, WebviewWindow, WindowEvent,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};

#[cfg(target_os = "windows")]
use windows::Win32::Graphics::Gdi::{
    CombineRgn, CreateEllipticRgn, CreateRoundRectRgn, DeleteObject, HGDIOBJ, RGN_OR, SetWindowRgn,
};
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    HWND_NOTOPMOST, IsWindowVisible, SW_HIDE, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
    SWP_SHOWWINDOW, SetWindowPos, ShowWindow,
};

const PANEL_MARGIN: i32 = 24;
const PANEL_BOTTOM_MARGIN: i32 = 72;
const PANEL_ORB_GAP: i32 = 24;

fn scaled_dimension(logical: u32, scale_factor: f64) -> u32 {
    (logical as f64 * scale_factor).round() as u32
}

fn rectangles_overlap(a: orb::OrbBounds, b: orb::OrbBounds) -> bool {
    let a_right = i64::from(a.x) + i64::from(a.width);
    let a_bottom = i64::from(a.y) + i64::from(a.height);
    let b_right = i64::from(b.x) + i64::from(b.width);
    let b_bottom = i64::from(b.y) + i64::from(b.height);
    i64::from(a.x) < b_right
        && a_right > i64::from(b.x)
        && i64::from(a.y) < b_bottom
        && a_bottom > i64::from(b.y)
}

fn panel_position_avoiding_orb(
    monitor: orb::OrbBounds,
    width: u32,
    height: u32,
    orb_bounds: Option<orb::OrbBounds>,
) -> (i32, i32) {
    let max_x = monitor.x + monitor.width.saturating_sub(width) as i32;
    let max_y = monitor.y + monitor.height.saturating_sub(height) as i32;
    let mut x = (max_x - PANEL_MARGIN).max(monitor.x);
    let mut y = (max_y - PANEL_BOTTOM_MARGIN).max(monitor.y);

    if let Some(orb) = orb_bounds {
        let left_of_orb = orb.x - width as i32 - PANEL_ORB_GAP;
        if left_of_orb >= monitor.x {
            x = left_of_orb;
        } else {
            let right_of_orb = orb.x + orb.width as i32 + PANEL_ORB_GAP;
            x = right_of_orb.clamp(monitor.x, max_x);
        }
        let trail_endpoint_y = height.saturating_mul(97) as i32 / 100;
        let orb_center_y = orb.y + orb.height as i32 / 2;
        y = (orb_center_y - trail_endpoint_y).clamp(monitor.y, max_y);
    }

    (x.clamp(monitor.x, max_x), y.clamp(monitor.y, max_y))
}

fn place_bottom_right(window: &WebviewWindow, logical_width: u32, logical_height: u32) -> bool {
    if let Ok(Some(monitor)) = window.current_monitor() {
        let scale_factor = window.scale_factor().unwrap_or(1.0);
        let outer_size = window.outer_size().ok();
        let width = outer_size
            .map(|size| size.width)
            .unwrap_or_else(|| scaled_dimension(logical_width, scale_factor));
        let height = outer_size
            .map(|size| size.height)
            .unwrap_or_else(|| scaled_dimension(logical_height, scale_factor));
        let monitor_position = monitor.position();
        let monitor_size = monitor.size();
        let monitor_bounds = orb::OrbBounds::new(
            monitor_position.x,
            monitor_position.y,
            monitor_size.width,
            monitor_size.height,
        );
        let orb_bounds = orb::current_orb_bounds();
        let (x, y) = panel_position_avoiding_orb(monitor_bounds, width, height, orb_bounds);
        let _ = window.set_position(PhysicalPosition::new(x, y));
        let final_position = window
            .outer_position()
            .unwrap_or_else(|_| PhysicalPosition::new(x, y));
        let panel_bounds = orb::OrbBounds::new(final_position.x, final_position.y, width, height);
        let trail_on_left = orb_bounds
            .map(|orb_bounds| orb_bounds.x < final_position.x)
            .unwrap_or(false);
        let _ = window.emit(
            "thought-trail-side",
            if trail_on_left { "left" } else { "right" },
        );
        let overlaps_orb = orb_bounds
            .map(|orb_bounds| rectangles_overlap(panel_bounds, orb_bounds))
            .unwrap_or(false);
        let _ = diagnostic_log::append_internal(
            window.app_handle(),
            "panel-positioned",
            serde_json::json!({
                "x": final_position.x,
                "y": final_position.y,
                "width": width,
                "height": height,
                "overlapsOrb": overlaps_orb,
                "gapPixels": PANEL_ORB_GAP
            }),
        );
        return trail_on_left;
    }
    false
}

#[cfg(target_os = "windows")]
fn show_without_activation(window: &WebviewWindow) -> Result<(), String> {
    let hwnd = window.hwnd().map_err(|error| error.to_string())?;
    unsafe {
        SetWindowPos(
            hwnd,
            Some(HWND_NOTOPMOST),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW,
        )
        .map_err(|error| error.to_string())
    }
}

#[cfg(target_os = "windows")]
fn apply_thought_bubble_region(window: &WebviewWindow, trail_on_left: bool) -> Result<(), String> {
    let hwnd = window.hwnd().map_err(|error| error.to_string())?;
    let scale = window.scale_factor().map_err(|error| error.to_string())?;
    let pixel = |logical: i32| (f64::from(logical) * scale).round() as i32;
    let body = unsafe {
        CreateRoundRectRgn(
            pixel(10),
            pixel(10),
            pixel(418),
            pixel(554),
            pixel(84),
            pixel(84),
        )
    };
    if body.0.is_null() {
        return Err("Could not create the thought-bubble body region.".into());
    }

    let trail = if trail_on_left {
        [(59, 554, 83, 578), (39, 577, 55, 593), (18, 592, 28, 602)]
    } else {
        [
            (345, 554, 369, 578),
            (375, 577, 391, 593),
            (400, 592, 410, 602),
        ]
    };
    for (left, top, right, bottom) in trail {
        let dot =
            unsafe { CreateEllipticRgn(pixel(left), pixel(top), pixel(right), pixel(bottom)) };
        if dot.0.is_null() {
            unsafe {
                let _ = DeleteObject(HGDIOBJ(body.0));
            }
            return Err("Could not create a thought-bubble trail region.".into());
        }
        let combined = unsafe { CombineRgn(Some(body), Some(body), Some(dot), RGN_OR) };
        unsafe {
            let _ = DeleteObject(HGDIOBJ(dot.0));
        }
        if combined.0 == 0 {
            unsafe {
                let _ = DeleteObject(HGDIOBJ(body.0));
            }
            return Err("Could not combine the thought-bubble regions.".into());
        }
    }

    if unsafe { SetWindowRgn(hwnd, Some(body), true) } == 0 {
        unsafe {
            let _ = DeleteObject(HGDIOBJ(body.0));
        }
        return Err("Could not apply the thought-bubble native region.".into());
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn apply_thought_bubble_region(
    _window: &WebviewWindow,
    _trail_on_left: bool,
) -> Result<(), String> {
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn show_without_activation(window: &WebviewWindow) -> Result<(), String> {
    window.show().map_err(|error| error.to_string())
}

#[cfg(target_os = "windows")]
fn hide_surface_and_verify(window: &WebviewWindow) -> Result<bool, String> {
    window.hide().map_err(|error| error.to_string())?;
    let hwnd = window.hwnd().map_err(|error| error.to_string())?;
    let _ = unsafe { ShowWindow(hwnd, SW_HIDE) };
    if unsafe { IsWindowVisible(hwnd).as_bool() } {
        return Err(
            "Panel hide returned successfully but the native window is still visible.".into(),
        );
    }
    Ok(false)
}

#[cfg(not(target_os = "windows"))]
fn hide_surface_and_verify(window: &WebviewWindow) -> Result<bool, String> {
    window.hide().map_err(|error| error.to_string())?;
    let visible = window.is_visible().map_err(|error| error.to_string())?;
    if visible {
        return Err(
            "Panel hide returned successfully but the native window is still visible.".into(),
        );
    }
    Ok(false)
}

#[tauri::command]
fn set_agent_surface(
    window: WebviewWindow,
    visible: bool,
    activate: Option<bool>,
) -> Result<bool, String> {
    let should_activate = activate.unwrap_or(false);
    window
        .set_always_on_top(false)
        .map_err(|error| error.to_string())?;

    if !visible {
        return hide_surface_and_verify(&window);
    }

    let minimized_before = window.is_minimized().map_err(|error| error.to_string())?;
    if should_activate && minimized_before {
        window.unminimize().map_err(|error| error.to_string())?;
        let minimized_after = window.is_minimized().map_err(|error| error.to_string())?;
        let _ = diagnostic_log::append_internal(
            window.app_handle(),
            "surface-restored-from-minimized",
            serde_json::json!({
                "minimizedBefore": minimized_before,
                "minimizedAfter": minimized_after,
                "source": "explicit-open"
            }),
        );
    }

    window
        .set_size(LogicalSize::new(430, 610))
        .map_err(|error| error.to_string())?;
    let trail_on_left = place_bottom_right(&window, 430, 610);
    apply_thought_bubble_region(&window, trail_on_left)?;
    if should_activate {
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
    } else {
        show_without_activation(&window)?;
    }
    let visible = window.is_visible().map_err(|error| error.to_string())?;
    if !visible {
        return Err(
            "Panel show returned successfully but the native window is still hidden.".into(),
        );
    }
    Ok(true)
}

#[tauri::command]
fn get_agent_surface_open(window: WebviewWindow) -> Result<bool, String> {
    let visible = window.is_visible().map_err(|error| error.to_string())?;
    let not_minimized = !window.is_minimized().map_err(|error| error.to_string())?;
    Ok(visible && not_minimized)
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentSurfaceState {
    open: bool,
    focused: bool,
}

#[tauri::command]
fn get_agent_surface_state(window: WebviewWindow) -> Result<AgentSurfaceState, String> {
    let open = get_agent_surface_open(window.clone())?;
    let focused = open && window.is_focused().map_err(|error| error.to_string())?;
    Ok(AgentSurfaceState { open, focused })
}

#[tauri::command]
fn reposition_agent_surface(window: WebviewWindow) -> Result<(), String> {
    if get_agent_surface_open(window.clone())? {
        let trail_on_left = place_bottom_right(&window, 430, 610);
        apply_thought_bubble_region(&window, trail_on_left)?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let show_orb = MenuItem::with_id(app, "show_orb", "Show Orb", true, None::<&str>)?;
            let analyze =
                MenuItem::with_id(app, "analyze", "Analyze current work", true, None::<&str>)?;
            let pause = MenuItem::with_id(app, "pause", "Pause / Resume", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &show_orb, &analyze, &pause, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().expect("application icon").clone())
                .tooltip("MyBuddy-AI — local desktop assistant")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = set_agent_surface(window.clone(), true, Some(true));
                            let _ = window.emit("open-panel", ());
                        }
                    }
                    "show_orb" => {
                        #[cfg(target_os = "windows")]
                        let _ = orb::show_native_orb();
                    }
                    "analyze" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = set_agent_surface(window.clone(), true, Some(true));
                            let _ = window.emit("analyze-now", ());
                        }
                    }
                    "pause" => {
                        let _ = app.emit("toggle-pause", ());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                let close_window = window.clone();
                let close_app = app.handle().clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let hidden = matches!(hide_surface_and_verify(&close_window), Ok(false));
                        if hidden {
                            let _ = close_window.emit("suggestion-window-hidden", ());
                        }
                        let _ = diagnostic_log::append_internal(
                            &close_app,
                            "suggestion-close-hidden",
                            serde_json::json!({
                                "visibility": if hidden { "hidden" } else { "hide-failed" },
                                "agentAlive": true,
                                "orbVisible": true
                            }),
                        );
                    }
                });
                let _ = set_agent_surface(window, false, Some(false));
            }
            #[cfg(target_os = "windows")]
            orb::start_native_orb(app.handle().clone()).map_err(std::io::Error::other)?;
            if std::env::args().any(|argument| argument == "--smoke-auto-suggestion") {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let _ = handle.emit("smoke-auto-suggestion", ());
                });
            }
            if std::env::args().any(|argument| argument == "--smoke-time-question") {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let _ = handle.emit("smoke-auto-suggestion", ());
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    let _ = handle.emit("smoke-time-question", ());
                });
            }
            if std::env::args().any(|argument| argument == "--smoke-active-window-status") {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(8));
                    let _ = handle.emit("smoke-auto-suggestion", ());
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    let _ = handle.emit("smoke-active-window-status", ());
                });
            }
            if std::env::args().any(|argument| argument == "--smoke-running-app-status") {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let _ = handle.emit("smoke-auto-suggestion", ());
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    let _ = handle.emit("smoke-running-app-status", ());
                });
            }
            if std::env::args().any(|argument| argument == "--smoke-agent-close-app-request") {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let _ = handle.emit("smoke-auto-suggestion", ());
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    let _ = handle.emit("smoke-agent-close-app-request", ());
                });
            }
            if std::env::args().any(|argument| argument == "--smoke-running-services-status") {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let _ = handle.emit("smoke-auto-suggestion", ());
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    let _ = handle.emit("smoke-running-services-status", ());
                });
            }
            if std::env::args().any(|argument| argument == "--smoke-top-memory-application-status")
            {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let _ = handle.emit("smoke-auto-suggestion", ());
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    let _ = handle.emit("smoke-top-memory-application-status", ());
                });
            }
            if std::env::args().any(|argument| argument == "--smoke-largest-files-status") {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let _ = handle.emit("smoke-auto-suggestion", ());
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    let _ = handle.emit("smoke-largest-files-status", ());
                });
            }
            if std::env::args().any(|argument| argument == "--smoke-provider-question") {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(20));
                    let _ = handle.emit("smoke-provider-question", ());
                });
            }
            if std::env::args().any(|argument| argument == "--smoke-provider-cancellation") {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let _ = handle.emit("smoke-auto-suggestion", ());
                    std::thread::sleep(std::time::Duration::from_secs(17));
                    let _ = handle.emit("smoke-provider-cancellation", ());
                });
            }
            if std::env::args().any(|argument| argument == "--smoke-important-email-request") {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(20));
                    let _ = handle.emit("smoke-important-email-request", ());
                });
            }
            if std::env::args().any(|argument| argument == "--smoke-vault-todo-request") {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(20));
                    let _ = handle.emit("smoke-vault-todo-request", ());
                });
            }
            if std::env::args().any(|argument| argument == "--smoke-window-context") {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let _ = handle.emit("smoke-auto-suggestion", ());
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    let _ = handle.emit("smoke-window-context", ());
                });
            }
            if std::env::args().any(|argument| argument == "--smoke-file-open-guidance") {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let _ = handle.emit("smoke-auto-suggestion", ());
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    let _ = handle.emit("smoke-file-open-guidance", ());
                });
            }

            if std::env::args().any(|argument| argument == "--smoke-notepad-story-acceptance") {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let _ = handle.emit("smoke-notepad-story-request", ());
                    std::thread::sleep(std::time::Duration::from_secs(25));
                    let _ = handle.emit("smoke-notepad-story-approve", ());
                });
            }

            if std::env::args().any(|argument| argument == "--smoke-autohotkey-demo") {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let _ = handle.emit("smoke-auto-suggestion", ());
                    std::thread::sleep(std::time::Duration::from_secs(27));
                    let _ = handle.emit("smoke-file-open-guidance", ());
                    std::thread::sleep(std::time::Duration::from_secs(40));
                    let _ = handle.emit("smoke-autohotkey-demo-normal", ());
                });
            }
            if std::env::args().any(|argument| argument == "--smoke-minimize-panel") {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(5));
                    let _ = handle.emit("smoke-minimize-panel", ());
                });
            }
            if std::env::args().any(|argument| argument == "--smoke-close-suggestion") {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(6));
                    if let Some(window) = handle.get_webview_window("main") {
                        let _ = window.close();
                    }
                });
            }
            if std::env::args().any(|argument| argument == "--smoke-minimize-restore") {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(8));
                    if let Some(window) = handle.get_webview_window("main") {
                        let _ = window.emit("open-panel", ());
                        std::thread::sleep(std::time::Duration::from_secs(1));
                        let _ = window.minimize();
                        std::thread::sleep(std::time::Duration::from_secs(1));
                        let _ = window.emit("open-panel", ());
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            observer::get_active_window_snapshot,
            observer::get_running_app_status,
            observer::get_running_services_status,
            observer::get_top_memory_applications_status,
            observer::get_largest_files_status,
            observer::get_window_text_context,
            qwen::qwen_health,
            qwen::analyze_with_qwen,
            qwen::ask_qwen,
            qwen::plan_agent_step,
            process_control::terminate_matching_processes,
            provider::get_provider_settings,
            provider::get_provider_availability,
            provider::cancel_provider_request,
            provider::save_and_test_provider,
            orb::set_orb_avatar,
            orb::set_orb_scale,
            computer_use_takeover::execute_computer_use_goal,
            computer_use_takeover::execute_application_visual_workflow,
            computer_use_takeover::execute_autohotkey_demo,
            computer_use_takeover::cancel_autohotkey_demo,
            computer_use_takeover::plan_computer_use_guidance,
            notepad_takeover::execute_notepad_story,
            diagnostic_log::append_diagnostic_log,
            diagnostic_log::append_conversation_log,
            diagnostic_log::get_conversation_log_path,
            file_io::agent_read_file,
            file_io::agent_write_file,
            set_agent_surface,
            get_agent_surface_open,
            get_agent_surface_state,
            reposition_agent_surface
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{PANEL_ORB_GAP, panel_position_avoiding_orb, scaled_dimension};
    use crate::orb;

    #[test]
    fn logical_window_size_is_scaled_for_physical_positioning() {
        assert_eq!(scaled_dimension(430, 2.0), 860);
    }

    #[test]
    fn panel_position_moves_left_when_default_position_overlaps_orb() {
        let monitor = orb::OrbBounds::new(0, 0, 1920, 1080);
        let orb = orb::OrbBounds::new(1744, 904, 152, 152);
        let position = panel_position_avoiding_orb(monitor, 860, 1000, Some(orb));
        assert!(position.0 + 860 + PANEL_ORB_GAP <= orb.x);
        assert!(position.0 >= monitor.x);
        assert!(position.1 >= monitor.y);
    }
}
