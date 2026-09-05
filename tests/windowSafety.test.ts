import { describe, expect, it } from "vitest";
import config from "../src-tauri/tauri.conf.json";
import html from "../index.html?raw";
import rustSurfaceHost from "../src-tauri/src/lib.rs?raw";
import rustOrbHost from "../src-tauri/src/orb.rs?raw";
import frontend from "../src/main.ts?raw";

interface WindowConfig {
  visible?: boolean;
  transparent?: boolean;
  alwaysOnTop?: boolean;
  decorations?: boolean;
  skipTaskbar?: boolean;
}

const mainWindow = (config as { app: { windows: WindowConfig[] } }).app.windows[0];

describe("desktop input safety", () => {
  it("starts hidden with a native-shaped undecorated bounded panel", () => {
    expect(mainWindow.visible).toBe(false);
    expect(mainWindow.transparent).toBe(true);
    expect(mainWindow.alwaysOnTop).toBe(false);
    expect(mainWindow.decorations).toBe(false);
    expect(mainWindow.skipTaskbar).toBe(false);
    expect(html).toContain("data-tauri-drag-region");
    expect(html).toContain('aria-label="Minimize to orb"');
    expect(rustSurfaceHost).toContain("apply_thought_bubble_region");
    expect(rustSurfaceHost).toContain("CreateRoundRectRgn");
    expect(rustSurfaceHost).toContain("CreateEllipticRgn");
    expect(rustSurfaceHost).toContain("CombineRgn");
    expect(rustSurfaceHost).toContain("SetWindowRgn");
  });

  it("does not ship the floating overlay orb", () => {
    expect(html).not.toContain('id="orb"');
  });

  it("shows automatic suggestion windows without activation or topmost state", () => {
    expect(rustSurfaceHost).toContain("SWP_NOACTIVATE");
    expect(rustSurfaceHost).toContain("HWND_NOTOPMOST");
  });

  it("restores a minimized panel when the orb or tray explicitly opens it", () => {
    expect(rustSurfaceHost).toContain("window.is_minimized()");
    expect(rustSurfaceHost).toContain("window.unminimize()");
    expect(rustSurfaceHost).toContain("surface-restored-from-minimized");
    expect(rustSurfaceHost).toContain('--smoke-minimize-restore');
    expect(rustSurfaceHost).toContain('window.emit("open-panel"');
  });

  it("foregrounds a visible background panel instead of hiding it", () => {
    expect(frontend).toContain("async function togglePanelFromOrb()");
    expect(frontend).toContain('invoke<AgentSurfaceState>("get_agent_surface_state")');
    expect(frontend).toContain("const action = orbClickSurfaceAction(state)");
    expect(frontend).toContain('if (action === "focus")');
    expect(frontend).toContain('recordEvent("surface-foregrounded"');
    expect(frontend).toContain('listen("open-panel", () => void togglePanelFromOrb())');
    expect(rustSurfaceHost).toContain("fn get_agent_surface_state");
    expect(rustSurfaceHost).toContain("!window.is_minimized()");
    expect(rustSurfaceHost).toContain("window.is_focused()");
  });

  it("lets Windows drag the orb without global hooks and records its released position", () => {
    expect(rustOrbHost).toContain("WM_NCHITTEST");
    expect(rustOrbHost).toContain("HTCAPTION");
    expect(rustOrbHost).toContain("WM_ENTERSIZEMOVE");
    expect(rustOrbHost).toContain("WM_EXITSIZEMOVE");
    expect(rustOrbHost).toContain("native-orb-moved");
    expect(rustOrbHost).toContain("update_current_bounds");
    expect(rustOrbHost).toContain("SetWindowTextW");
    expect(rustOrbHost).not.toContain("SetCapture");
  });

  it("offers a bounded native right-click menu with close first and reversible tray minimize second", () => {
    expect(rustOrbHost).toContain("WM_CONTEXTMENU");
    expect(rustOrbHost).toContain("WM_NCRBUTTONUP");
    expect(rustOrbHost).toContain("WM_CONTEXTMENU | WM_NCRBUTTONUP");
    expect(rustOrbHost).toContain("CreatePopupMenu");
    expect(rustOrbHost).toContain("TrackPopupMenu");
    expect(rustOrbHost).toContain('w!("Close MyBuddy-AI")');
    expect(rustOrbHost).toContain('w!("Minimize orb to system tray")');
    expect(rustOrbHost.indexOf('w!("Close MyBuddy-AI")')).toBeLessThan(
      rustOrbHost.indexOf('w!("Minimize orb to system tray")'),
    );
    expect(rustOrbHost).toContain("ShowWindow(hwnd, SW_HIDE)");
    expect(rustOrbHost).toContain("native-orb-minimized-to-tray");
    expect(rustOrbHost).toContain("show_native_orb");
    expect(rustSurfaceHost).toContain('MenuItem::with_id(app, "show_orb", "Show Orb"');
    expect(rustOrbHost).not.toContain("SetWindowsHookEx");
  });

  it("positions the card away from the current orb bounds", () => {
    expect(rustSurfaceHost).toContain("panel_position_avoiding_orb");
    expect(rustSurfaceHost).toContain("current_orb_bounds");
    expect(rustSurfaceHost).toContain("PANEL_ORB_GAP");
    expect(rustSurfaceHost).toContain("outer_size");
    expect(rustSurfaceHost).toContain("outer_position");
  });

  it("repositions a visible thought bubble after MBAI moves", () => {
    expect(rustOrbHost).toContain("context.app.emit(");
    expect(rustOrbHost).toContain('"orb-moved"');
    expect(frontend).toContain('listen("orb-moved"');
    expect(frontend).toContain('invoke("reposition_agent_surface")');
    expect(rustSurfaceHost).toContain("fn reposition_agent_surface");
    expect(rustSurfaceHost).toContain("place_bottom_right(&window, 430, 610)");
  });

  it("treats the native suggestion X as hide, never agent shutdown", () => {
    expect(rustSurfaceHost).toContain("WindowEvent::CloseRequested");
    expect(rustSurfaceHost).toContain("api.prevent_close()");
    expect(rustSurfaceHost).toContain("suggestion-close-hidden");
    expect(rustSurfaceHost).toContain("hide_surface_and_verify(&close_window)");
    expect(rustSurfaceHost).toContain('emit("suggestion-window-hidden"');
  });

  it("never leaves a blank shell when minimizing the panel to the orb", () => {
    expect(html).toContain('id="collapse"');
    expect(html).toContain('aria-label="Minimize to orb"');
    expect(html).toContain('title="Minimize to orb"');
    expect(html).not.toContain('id="collapse" class="icon-button" aria-label="Hide">×</button>');
    expect(frontend).not.toContain('panel.classList.toggle("hidden"');
    expect(frontend).not.toContain('panel.classList.add("hidden"');
    expect(rustSurfaceHost).toContain("hide_surface_and_verify");
    expect(rustSurfaceHost).toContain("window.is_visible()");
    expect(rustSurfaceHost).toContain("ShowWindow(hwnd, SW_HIDE)");
    expect(rustSurfaceHost).toContain("IsWindowVisible(hwnd)");
    expect(frontend).toContain('invoke<boolean>("set_agent_surface"');
    expect(rustSurfaceHost).toContain('--smoke-minimize-panel');
    expect(frontend).toContain('listen("smoke-minimize-panel"');
  });

  it("presents the safe opaque panel as a MyBuddy thought bubble", () => {
    expect(html).toContain('class="panel thought-bubble"');
    expect(html).toContain('class="buddy-voice-mark"');
    expect(html).toContain('class="thought-trail"');
    expect(html.match(/class="thought-dot"/g)).toHaveLength(3);
    expect(mainWindow.transparent).toBe(true);
  });

  it("provides a guarded automatic-suggestion smoke-test trigger", () => {
    expect(rustSurfaceHost).toContain('--smoke-auto-suggestion');
    expect(rustSurfaceHost).toContain('--smoke-close-suggestion');
    expect(frontend).toContain('listen("smoke-auto-suggestion"');
    expect(frontend).toContain('displaySuggestion(mockSuggestion(), "automatic")');
    expect(frontend).toContain('listen("suggestion-window-hidden"');
  });
});
