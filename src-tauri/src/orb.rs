pub const ORB_BASE_PIXELS: u32 = 76;
pub const ORB_MIN_PIXELS: u32 = 64;
pub const ORB_MAX_PIXELS: u32 = 192;
pub const MAX_AVATAR_BYTES: usize = 8 * 1024 * 1024;

use image::{GenericImageView, imageops::FilterType};
use std::sync::{
    Mutex, OnceLock,
    atomic::{AtomicIsize, Ordering},
};

static CURRENT_ORB_BOUNDS: OnceLock<Mutex<Option<OrbBounds>>> = OnceLock::new();
static NATIVE_ORB_WINDOW: AtomicIsize = AtomicIsize::new(0);
static CURRENT_ORB_AVATAR: OnceLock<Mutex<Option<OrbAvatar>>> = OnceLock::new();

struct OrbAvatar {
    width: i32,
    height: i32,
    bgra_bottom_up: Vec<u8>,
}

fn avatar_state() -> &'static Mutex<Option<OrbAvatar>> {
    CURRENT_ORB_AVATAR.get_or_init(|| Mutex::new(None))
}

fn decode_avatar(bytes: &[u8]) -> Result<OrbAvatar, String> {
    if bytes.is_empty() || bytes.len() > MAX_AVATAR_BYTES {
        return Err("avatar must be between 1 byte and 8 MiB".into());
    }
    let image = image::load_from_memory(bytes).map_err(|error| error.to_string())?;
    let (width, height) = image.dimensions();
    if width < 64 || height < 64 || width > 4096 || height > 4096 {
        return Err("avatar dimensions must be between 64 and 4096 pixels".into());
    }
    let edge = width.min(height);
    let square = image.crop_imm((width - edge) / 2, (height - edge) / 2, edge, edge);
    let rgba = square
        .resize_exact(512, 512, FilterType::Lanczos3)
        .to_rgba8();
    let mut pixels = Vec::with_capacity(512 * 512 * 4);
    for row in rgba.as_raw().chunks_exact(512 * 4).rev() {
        for pixel in row.chunks_exact(4) {
            let alpha = u16::from(pixel[3]);
            let blend = |channel: u8, background: u8| {
                ((u16::from(channel) * alpha + u16::from(background) * (255 - alpha)) / 255) as u8
            };
            pixels.extend_from_slice(&[
                blend(pixel[2], 20),
                blend(pixel[1], 11),
                blend(pixel[0], 7),
                0,
            ]);
        }
    }
    Ok(OrbAvatar {
        width: 512,
        height: 512,
        bgra_bottom_up: pixels,
    })
}

fn install_avatar(bytes: &[u8]) -> Result<(), String> {
    let avatar = decode_avatar(bytes)?;
    *avatar_state()
        .lock()
        .map_err(|_| "orb avatar lock is unavailable")? = Some(avatar);
    Ok(())
}

fn initialize_default_avatar() -> Result<(), String> {
    if avatar_state()
        .lock()
        .map_err(|_| "orb avatar lock is unavailable")?
        .is_none()
    {
        install_avatar(include_bytes!(
            "../../agent_icons/all/friendly-blue-orb-bot.png"
        ))?;
    }
    Ok(())
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct OrbBounds {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

impl OrbBounds {
    pub const fn new(x: i32, y: i32, width: u32, height: u32) -> Self {
        Self {
            x,
            y,
            width,
            height,
        }
    }

    pub fn is_safe_within(self, work_area: Self) -> bool {
        if self.width == 0
            || self.height == 0
            || self.width > ORB_MAX_PIXELS
            || self.height > ORB_MAX_PIXELS
            || work_area.width == 0
            || work_area.height == 0
        {
            return false;
        }

        let right = i64::from(self.x) + i64::from(self.width);
        let bottom = i64::from(self.y) + i64::from(self.height);
        let work_right = i64::from(work_area.x) + i64::from(work_area.width);
        let work_bottom = i64::from(work_area.y) + i64::from(work_area.height);

        self.x >= work_area.x
            && self.y >= work_area.y
            && right <= work_right
            && bottom <= work_bottom
    }
}

fn bounds_state() -> &'static Mutex<Option<OrbBounds>> {
    CURRENT_ORB_BOUNDS.get_or_init(|| Mutex::new(None))
}

pub fn update_current_bounds(bounds: OrbBounds) {
    if let Ok(mut current) = bounds_state().lock() {
        *current = Some(bounds);
    }
}

pub fn current_orb_bounds() -> Option<OrbBounds> {
    bounds_state().lock().ok().and_then(|current| *current)
}

pub fn clamp_orb_bounds(bounds: OrbBounds, work_area: OrbBounds) -> OrbBounds {
    let max_x = work_area.x + work_area.width.saturating_sub(bounds.width) as i32;
    let max_y = work_area.y + work_area.height.saturating_sub(bounds.height) as i32;
    OrbBounds::new(
        bounds.x.clamp(work_area.x, max_x),
        bounds.y.clamp(work_area.y, max_y),
        bounds.width,
        bounds.height,
    )
}

pub fn orb_size_for_dpi(dpi: u32) -> u32 {
    let scaled = (u64::from(ORB_BASE_PIXELS) * u64::from(dpi) + 48) / 96;
    (scaled as u32).clamp(ORB_MIN_PIXELS, ORB_MAX_PIXELS)
}

fn blend_channel(start: u8, end: u8, amount: f32) -> u8 {
    (f32::from(start) + (f32::from(end) - f32::from(start)) * amount.clamp(0.0, 1.0)).round() as u8
}

pub fn orb_gradient_color(turn: f32) -> (u8, u8, u8) {
    const CYAN: (u8, u8, u8) = (46, 208, 239);
    const VIOLET: (u8, u8, u8) = (102, 87, 232);
    const PINK: (u8, u8, u8) = (170, 93, 232);

    let turn = turn.clamp(0.0, 1.0);
    let (start, end, amount) = if turn <= 1.0 / 3.0 {
        (CYAN, VIOLET, turn * 3.0)
    } else if turn <= 2.0 / 3.0 {
        (VIOLET, PINK, (turn - 1.0 / 3.0) * 3.0)
    } else {
        (PINK, CYAN, (turn - 2.0 / 3.0) * 3.0)
    };
    (
        blend_channel(start.0, end.0, amount),
        blend_channel(start.1, end.1, amount),
        blend_channel(start.2, end.2, amount),
    )
}

#[cfg(target_os = "windows")]
mod windows_orb {
    use super::{OrbBounds, clamp_orb_bounds, orb_size_for_dpi, update_current_bounds};
    use crate::diagnostic_log;
    use std::{
        ffi::c_void,
        sync::{Mutex, mpsc},
        thread,
        time::Duration,
    };
    use tauri::{AppHandle, Emitter};
    use windows::{
        Win32::{
            Foundation::{COLORREF, HINSTANCE, HWND, LPARAM, LRESULT, POINT, RECT, WPARAM},
            Graphics::Gdi::{
                BI_RGB, BITMAPINFO, BITMAPINFOHEADER, BeginPaint, CreateEllipticRgn,
                CreateSolidBrush, DIB_RGB_COLORS, DeleteObject, Ellipse, EndPaint, FillRect, HDC,
                HGDIOBJ, InvalidateRect, PAINTSTRUCT, RoundRect, SRCCOPY, SelectObject, SetPixelV,
                SetWindowRgn, StretchDIBits,
            },
            System::LibraryLoader::GetModuleHandleW,
            UI::{
                HiDpi::GetDpiForSystem,
                WindowsAndMessaging::{
                    AppendMenuW, CREATESTRUCTW, CS_HREDRAW, CS_VREDRAW, CreatePopupMenu,
                    CreateWindowExW, DefWindowProcW, DestroyMenu, DispatchMessageW, GWLP_USERDATA,
                    GetClientRect, GetCursorPos, GetMessageW, GetWindowLongPtrW, GetWindowRect,
                    HTCAPTION, HWND_TOPMOST, MF_STRING, MSG, PostMessageW, PostQuitMessage,
                    RegisterClassW, SPI_GETWORKAREA, SW_HIDE, SW_SHOWNOACTIVATE, SWP_NOACTIVATE,
                    SWP_SHOWWINDOW, SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS, SetTimer,
                    SetWindowLongPtrW, SetWindowPos, SetWindowTextW, ShowWindow,
                    SystemParametersInfoW, TPM_NONOTIFY, TPM_RETURNCMD, TPM_RIGHTBUTTON,
                    TrackPopupMenu, TranslateMessage, WM_APP, WM_CONTEXTMENU, WM_DESTROY,
                    WM_ENTERSIZEMOVE, WM_EXITSIZEMOVE, WM_NCCREATE, WM_NCDESTROY, WM_NCHITTEST,
                    WM_NCLBUTTONDOWN, WM_NCRBUTTONUP, WM_PAINT, WM_TIMER, WNDCLASSW,
                    WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW, WS_EX_TOPMOST, WS_POPUP,
                },
            },
        },
        core::w,
    };

    const CLASS_NAME: windows::core::PCWSTR = w!("AmbientDesktopAgentNativeOrb");
    const GUARD_TIMER_ID: usize = 1;
    const MENU_CLOSE_APP: usize = 1;
    const MENU_MINIMIZE_TO_TRAY: usize = 2;
    const WM_SHOW_ORB: u32 = WM_APP + 1;
    const WM_AVATAR_CHANGED: u32 = WM_APP + 2;

    struct OrbContext {
        app: AppHandle,
        drag_start: Mutex<Option<OrbBounds>>,
    }

    fn primary_work_area() -> windows::core::Result<OrbBounds> {
        let mut rect = RECT::default();
        unsafe {
            SystemParametersInfoW(
                SPI_GETWORKAREA,
                0,
                Some((&mut rect as *mut RECT).cast::<c_void>()),
                SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0),
            )?;
        }
        Ok(OrbBounds::new(
            rect.left,
            rect.top,
            (rect.right - rect.left).max(0) as u32,
            (rect.bottom - rect.top).max(0) as u32,
        ))
    }

    unsafe fn context(hwnd: HWND) -> Option<&'static OrbContext> {
        let pointer = unsafe { GetWindowLongPtrW(hwnd, GWLP_USERDATA) } as *const OrbContext;
        unsafe { pointer.as_ref() }
    }

    const fn colorref(red: u8, green: u8, blue: u8) -> COLORREF {
        COLORREF(red as u32 | ((green as u32) << 8) | ((blue as u32) << 16))
    }

    fn mix_with_white(color: (u8, u8, u8), amount: f32) -> (u8, u8, u8) {
        (
            super::blend_channel(color.0, 255, amount),
            super::blend_channel(color.1, 255, amount),
            super::blend_channel(color.2, 255, amount),
        )
    }

    unsafe fn paint_avatar(hdc: HDC, width: i32, height: i32) -> bool {
        let Ok(current) = super::avatar_state().lock() else {
            return false;
        };
        let Some(avatar) = current.as_ref() else {
            return false;
        };
        let bitmap = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: avatar.width,
                biHeight: avatar.height,
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                biSizeImage: avatar.bgra_bottom_up.len() as u32,
                ..Default::default()
            },
            ..Default::default()
        };
        let rows = unsafe {
            StretchDIBits(
                hdc,
                0,
                0,
                width,
                height,
                0,
                0,
                avatar.width,
                avatar.height,
                Some(avatar.bgra_bottom_up.as_ptr().cast()),
                &bitmap,
                DIB_RGB_COLORS,
                SRCCOPY,
            )
        };
        rows != 0 && rows != -1
    }

    unsafe fn paint_orb(hwnd: HWND) {
        let mut paint = PAINTSTRUCT::default();
        let hdc = unsafe { BeginPaint(hwnd, &mut paint) };
        let mut rect = RECT::default();
        if unsafe { GetClientRect(hwnd, &mut rect) }.is_ok() {
            let width = (rect.right - rect.left).max(1);
            let height = (rect.bottom - rect.top).max(1);
            if unsafe { paint_avatar(hdc, width, height) } {
                let _ = unsafe { EndPaint(hwnd, &paint) };
                return;
            }
            let center_x = (width - 1) as f32 / 2.0;
            let center_y = (height - 1) as f32 / 2.0;
            let radius = width.min(height) as f32 / 2.0;
            let highlight_x = width as f32 * 0.35;
            let highlight_y = height as f32 * 0.30;

            for y in 0..height {
                for x in 0..width {
                    let dx = x as f32 - center_x;
                    let dy = y as f32 - center_y;
                    let distance = (dx * dx + dy * dy).sqrt();
                    if distance > radius {
                        continue;
                    }

                    let angle = dy.atan2(dx);
                    let turn = ((angle / std::f32::consts::TAU) + 0.75).rem_euclid(1.0);
                    let mut color = super::orb_gradient_color(turn);
                    let highlight_distance = (((x as f32 - highlight_x).powi(2)
                        + (y as f32 - highlight_y).powi(2))
                    .sqrt())
                        / (radius * 0.48);
                    if highlight_distance < 1.0 {
                        color = mix_with_white(color, (1.0 - highlight_distance) * 0.34);
                    }
                    if distance > radius * 0.82 {
                        let edge = ((distance / radius - 0.82) / 0.18).clamp(0.0, 1.0);
                        color = (
                            super::blend_channel(color.0, 32, edge * 0.24),
                            super::blend_channel(color.1, 24, edge * 0.24),
                            super::blend_channel(color.2, 72, edge * 0.24),
                        );
                    }
                    unsafe {
                        let _ = SetPixelV(hdc, x, y, colorref(color.0, color.1, color.2));
                    }
                }
            }

            // Friendly bot face layered over the recovered cyan/violet/pink orb palette.
            let unit = width as f32 / 76.0;
            let scale = |value: f32| (value * unit).round() as i32;
            let face_brush = unsafe { CreateSolidBrush(colorref(26, 27, 63)) };
            let feature_brush = unsafe { CreateSolidBrush(colorref(238, 252, 255)) };
            let status_brush = unsafe { CreateSolidBrush(colorref(79, 230, 167)) };
            if !face_brush.0.is_null() && !feature_brush.0.is_null() && !status_brush.0.is_null() {
                let old_brush = unsafe { SelectObject(hdc, HGDIOBJ(face_brush.0)) };
                unsafe {
                    let _ = RoundRect(
                        hdc,
                        scale(20.0),
                        scale(22.0),
                        scale(56.0),
                        scale(51.0),
                        scale(10.0),
                        scale(10.0),
                    );
                    SelectObject(hdc, HGDIOBJ(feature_brush.0));
                    let _ = Ellipse(hdc, scale(27.0), scale(31.0), scale(33.0), scale(37.0));
                    let _ = Ellipse(hdc, scale(43.0), scale(31.0), scale(49.0), scale(37.0));
                    FillRect(
                        hdc,
                        &RECT {
                            left: scale(31.0),
                            top: scale(42.0),
                            right: scale(45.0),
                            bottom: scale(44.0),
                        },
                        feature_brush,
                    );
                    FillRect(
                        hdc,
                        &RECT {
                            left: scale(37.0),
                            top: scale(16.0),
                            right: scale(39.0),
                            bottom: scale(23.0),
                        },
                        feature_brush,
                    );
                    let _ = Ellipse(hdc, scale(34.0), scale(12.0), scale(42.0), scale(20.0));
                    SelectObject(hdc, HGDIOBJ(status_brush.0));
                    let _ = Ellipse(hdc, scale(57.0), scale(57.0), scale(68.0), scale(68.0));
                    SelectObject(hdc, old_brush);
                    let _ = DeleteObject(HGDIOBJ(face_brush.0));
                    let _ = DeleteObject(HGDIOBJ(feature_brush.0));
                    let _ = DeleteObject(HGDIOBJ(status_brush.0));
                }
            }
        }
        unsafe {
            let _ = EndPaint(hwnd, &paint);
        }
    }

    unsafe fn guard_bounds(hwnd: HWND) -> bool {
        let mut rect = RECT::default();
        let Ok(()) = (unsafe { GetWindowRect(hwnd, &mut rect) }) else {
            return false;
        };
        let Ok(work_area) = primary_work_area() else {
            return false;
        };
        OrbBounds::new(
            rect.left,
            rect.top,
            (rect.right - rect.left).max(0) as u32,
            (rect.bottom - rect.top).max(0) as u32,
        )
        .is_safe_within(work_area)
    }

    unsafe fn read_window_bounds(hwnd: HWND) -> Option<OrbBounds> {
        let mut rect = RECT::default();
        unsafe { GetWindowRect(hwnd, &mut rect) }.ok()?;
        Some(OrbBounds::new(
            rect.left,
            rect.top,
            (rect.right - rect.left).max(0) as u32,
            (rect.bottom - rect.top).max(0) as u32,
        ))
    }

    unsafe fn show_context_menu(hwnd: HWND, context: &OrbContext) {
        let Ok(menu) = (unsafe { CreatePopupMenu() }) else {
            return;
        };
        let close_added =
            unsafe { AppendMenuW(menu, MF_STRING, MENU_CLOSE_APP, w!("Close MyBuddy-AI")) }.is_ok();
        let minimize_added = unsafe {
            AppendMenuW(
                menu,
                MF_STRING,
                MENU_MINIMIZE_TO_TRAY,
                w!("Minimize orb to system tray"),
            )
        }
        .is_ok();
        if !close_added || !minimize_added {
            let _ = unsafe { DestroyMenu(menu) };
            return;
        }

        let mut cursor = POINT::default();
        if unsafe { GetCursorPos(&mut cursor) }.is_err() {
            let _ = unsafe { DestroyMenu(menu) };
            return;
        }
        let command = unsafe {
            TrackPopupMenu(
                menu,
                TPM_RETURNCMD | TPM_NONOTIFY | TPM_RIGHTBUTTON,
                cursor.x,
                cursor.y,
                None,
                hwnd,
                None,
            )
        };
        let _ = unsafe { DestroyMenu(menu) };

        match command.0 as usize {
            MENU_CLOSE_APP => {
                let _ = diagnostic_log::append_internal(
                    &context.app,
                    "native-orb-close-requested",
                    serde_json::json!({ "source": "orb-context-menu" }),
                );
                context.app.exit(0);
            }
            MENU_MINIMIZE_TO_TRAY => {
                let _ = unsafe { ShowWindow(hwnd, SW_HIDE) };
                let _ = diagnostic_log::append_internal(
                    &context.app,
                    "native-orb-minimized-to-tray",
                    serde_json::json!({ "orbVisible": false, "agentAlive": true }),
                );
            }
            _ => {}
        }
    }

    unsafe extern "system" fn orb_window_proc(
        hwnd: HWND,
        message: u32,
        wparam: WPARAM,
        lparam: LPARAM,
    ) -> LRESULT {
        match message {
            WM_NCCREATE => {
                let create = unsafe { &*(lparam.0 as *const CREATESTRUCTW) };
                unsafe {
                    SetWindowLongPtrW(hwnd, GWLP_USERDATA, create.lpCreateParams as isize);
                }
                LRESULT(1)
            }
            WM_NCHITTEST => LRESULT(HTCAPTION as isize),
            WM_CONTEXTMENU | WM_NCRBUTTONUP => {
                if let Some(context) = unsafe { context(hwnd) } {
                    unsafe { show_context_menu(hwnd, context) };
                }
                LRESULT(0)
            }
            WM_SHOW_ORB => {
                let _ = unsafe { ShowWindow(hwnd, SW_SHOWNOACTIVATE) };
                let _ = unsafe {
                    SetWindowPos(
                        hwnd,
                        Some(HWND_TOPMOST),
                        0,
                        0,
                        0,
                        0,
                        SWP_NOACTIVATE | SWP_SHOWWINDOW,
                    )
                };
                if let Some(context) = unsafe { context(hwnd) } {
                    let _ = diagnostic_log::append_internal(
                        &context.app,
                        "native-orb-restored-from-tray",
                        serde_json::json!({ "orbVisible": true }),
                    );
                }
                LRESULT(0)
            }
            WM_AVATAR_CHANGED => {
                let _ = unsafe { InvalidateRect(Some(hwnd), None, false) };
                LRESULT(0)
            }
            WM_NCLBUTTONDOWN => {
                if let (Some(context), Some(bounds)) = (unsafe { context(hwnd) }, unsafe {
                    read_window_bounds(hwnd)
                }) {
                    if let Ok(mut start) = context.drag_start.lock() {
                        *start = Some(bounds);
                    }
                }
                let result = unsafe { DefWindowProcW(hwnd, message, wparam, lparam) };
                if let (Some(context), Some(after)) = (unsafe { context(hwnd) }, unsafe {
                    read_window_bounds(hwnd)
                }) {
                    let before = context.drag_start.lock().ok().and_then(|start| *start);
                    if before == Some(after) {
                        let _ = diagnostic_log::append_internal(
                            &context.app,
                            "native-orb-clicked",
                            serde_json::json!({}),
                        );
                        let _ = context.app.emit("open-panel", ());
                    }
                    if let Ok(mut start) = context.drag_start.lock() {
                        *start = None;
                    }
                }
                result
            }
            WM_ENTERSIZEMOVE => LRESULT(0),
            WM_EXITSIZEMOVE => {
                if let (Some(context), Some(released)) = (unsafe { context(hwnd) }, unsafe {
                    read_window_bounds(hwnd)
                }) {
                    let before = context.drag_start.lock().ok().and_then(|start| *start);
                    if before.is_some_and(|before| before.x != released.x || before.y != released.y)
                    {
                        let safe = primary_work_area()
                            .map(|work_area| clamp_orb_bounds(released, work_area))
                            .unwrap_or(released);
                        if safe != released {
                            let _ = unsafe {
                                SetWindowPos(
                                    hwnd,
                                    Some(HWND_TOPMOST),
                                    safe.x,
                                    safe.y,
                                    safe.width as i32,
                                    safe.height as i32,
                                    SWP_NOACTIVATE | SWP_SHOWWINDOW,
                                )
                            };
                        }
                        update_current_bounds(safe);
                        let _ = diagnostic_log::append_internal(
                            &context.app,
                            "native-orb-moved",
                            serde_json::json!({
                                "x": safe.x,
                                "y": safe.y,
                                "width": safe.width,
                                "height": safe.height
                            }),
                        );
                        let _ = context.app.emit(
                            "orb-moved",
                            serde_json::json!({
                                "x": safe.x,
                                "y": safe.y,
                                "width": safe.width,
                                "height": safe.height
                            }),
                        );
                    }
                }
                LRESULT(0)
            }
            WM_TIMER if wparam.0 == GUARD_TIMER_ID => {
                if !unsafe { guard_bounds(hwnd) } {
                    if let Some(context) = unsafe { context(hwnd) } {
                        let _ = diagnostic_log::append_internal(
                            &context.app,
                            "native-orb-guard-failure",
                            serde_json::json!({ "action": "exit" }),
                        );
                        context.app.exit(70);
                    }
                }
                LRESULT(0)
            }
            WM_PAINT => {
                unsafe { paint_orb(hwnd) };
                LRESULT(0)
            }
            WM_DESTROY => {
                unsafe { PostQuitMessage(0) };
                LRESULT(0)
            }
            WM_NCDESTROY => {
                super::NATIVE_ORB_WINDOW.store(0, super::Ordering::Release);
                let pointer = unsafe { GetWindowLongPtrW(hwnd, GWLP_USERDATA) } as *mut OrbContext;
                unsafe {
                    SetWindowLongPtrW(hwnd, GWLP_USERDATA, 0);
                    if !pointer.is_null() {
                        drop(Box::from_raw(pointer));
                    }
                    DefWindowProcW(hwnd, message, wparam, lparam)
                }
            }
            _ => unsafe { DefWindowProcW(hwnd, message, wparam, lparam) },
        }
    }

    fn run_orb(app: AppHandle, ready: mpsc::Sender<Result<OrbBounds, String>>) {
        let result = (|| -> windows::core::Result<(HWND, OrbBounds)> {
            let instance: HINSTANCE = unsafe { GetModuleHandleW(None)? }.into();
            let class = WNDCLASSW {
                style: CS_HREDRAW | CS_VREDRAW,
                lpfnWndProc: Some(orb_window_proc),
                hInstance: instance,
                lpszClassName: CLASS_NAME,
                ..Default::default()
            };
            unsafe {
                RegisterClassW(&class);
            }

            let work_area = primary_work_area()?;
            let size = orb_size_for_dpi(unsafe { GetDpiForSystem() });
            let bounds = OrbBounds::new(
                work_area.x + work_area.width as i32 - size as i32 - 24,
                work_area.y + work_area.height as i32 - size as i32 - 24,
                size,
                size,
            );
            if !bounds.is_safe_within(work_area) {
                return Err(windows::core::Error::new(
                    windows::core::HRESULT(0x80070057u32 as i32),
                    "unsafe native orb bounds",
                ));
            }

            let context = Box::new(OrbContext {
                app: app.clone(),
                drag_start: Mutex::new(None),
            });
            let context_pointer = Box::into_raw(context);
            let hwnd = unsafe {
                CreateWindowExW(
                    WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE,
                    CLASS_NAME,
                    w!("MyBuddy-AI Orb"),
                    WS_POPUP,
                    bounds.x,
                    bounds.y,
                    size as i32,
                    size as i32,
                    None,
                    None,
                    Some(instance),
                    Some(context_pointer.cast::<c_void>()),
                )
            };
            let hwnd = match hwnd {
                Ok(hwnd) => hwnd,
                Err(error) => {
                    unsafe { drop(Box::from_raw(context_pointer)) };
                    return Err(error);
                }
            };
            super::NATIVE_ORB_WINDOW.store(hwnd.0 as isize, super::Ordering::Release);

            unsafe {
                SetWindowTextW(hwnd, w!("MyBuddy-AI Orb"))?;
            }

            let region = unsafe { CreateEllipticRgn(0, 0, size as i32, size as i32) };
            if region.0.is_null() || unsafe { SetWindowRgn(hwnd, Some(region), true) } == 0 {
                return Err(windows::core::Error::from_win32());
            }
            unsafe {
                SetWindowPos(
                    hwnd,
                    Some(HWND_TOPMOST),
                    bounds.x,
                    bounds.y,
                    size as i32,
                    size as i32,
                    SWP_NOACTIVATE | SWP_SHOWWINDOW,
                )?;
                SetTimer(Some(hwnd), GUARD_TIMER_ID, 1000, None);
            }
            Ok((hwnd, bounds))
        })();

        let (hwnd, bounds) = match result {
            Ok(value) => value,
            Err(error) => {
                let _ = ready.send(Err(error.to_string()));
                return;
            }
        };

        let _ = diagnostic_log::append_internal(
            &app,
            "native-orb-ready",
            serde_json::json!({
                "x": bounds.x,
                "y": bounds.y,
                "width": bounds.width,
                "height": bounds.height,
                "topmost": true,
                "noActivate": true,
                "region": "ellipse"
            }),
        );
        update_current_bounds(bounds);
        let _ = ready.send(Ok(bounds));

        let mut message = MSG::default();
        loop {
            let result = unsafe { GetMessageW(&mut message, None, 0, 0) };
            if result.0 <= 0 {
                break;
            }
            unsafe {
                let _ = TranslateMessage(&message);
                DispatchMessageW(&message);
            }
        }
        let _ = hwnd;
    }

    pub fn start(app: AppHandle) -> Result<OrbBounds, String> {
        super::initialize_default_avatar()?;
        let (sender, receiver) = mpsc::channel();
        thread::Builder::new()
            .name("ambient-native-orb".into())
            .spawn(move || run_orb(app, sender))
            .map_err(|error| error.to_string())?;
        receiver
            .recv_timeout(Duration::from_secs(3))
            .map_err(|error| format!("native orb startup timed out: {error}"))?
    }

    pub fn show_native_orb() -> Result<(), String> {
        let raw = super::NATIVE_ORB_WINDOW.load(super::Ordering::Acquire);
        if raw == 0 {
            return Err("native orb is not running".into());
        }
        unsafe {
            PostMessageW(
                Some(HWND(raw as *mut c_void)),
                WM_SHOW_ORB,
                WPARAM(0),
                LPARAM(0),
            )
        }
        .map_err(|error| error.to_string())
    }

    pub fn refresh_avatar() -> Result<(), String> {
        let raw = super::NATIVE_ORB_WINDOW.load(super::Ordering::Acquire);
        if raw == 0 {
            return Err("native orb is not running".into());
        }
        unsafe {
            PostMessageW(
                Some(HWND(raw as *mut c_void)),
                WM_AVATAR_CHANGED,
                WPARAM(0),
                LPARAM(0),
            )
        }
        .map_err(|error| error.to_string())
    }
}

#[cfg(target_os = "windows")]
pub fn start_native_orb(app: tauri::AppHandle) -> Result<OrbBounds, String> {
    windows_orb::start(app)
}

#[cfg(target_os = "windows")]
pub fn show_native_orb() -> Result<(), String> {
    windows_orb::show_native_orb()
}

#[tauri::command]
pub fn set_orb_avatar(
    app: tauri::AppHandle,
    avatar_id: String,
    bytes: Vec<u8>,
) -> Result<(), String> {
    if avatar_id.is_empty()
        || avatar_id.len() > 80
        || !avatar_id
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
    {
        return Err("avatar id is invalid".into());
    }
    install_avatar(&bytes)?;
    #[cfg(target_os = "windows")]
    windows_orb::refresh_avatar()?;
    crate::diagnostic_log::append_internal(
        &app,
        "native-orb-avatar-updated",
        serde_json::json!({ "avatarId": avatar_id }),
    )?;
    Ok(())
}
