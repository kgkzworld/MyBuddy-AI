import { describe, expect, it } from "vitest";
import watchdog from "../scripts/guarded-smoke-test.ps1?raw";

describe("guarded desktop smoke test", () => {
  it("defaults to a 30-second external kill timeout", () => {
    expect(watchdog).toContain("[int]$TimeoutSeconds = 30");
    expect(watchdog).toContain("Stop-Process -Id $process.Id -Force");
  });

  it("fails closed unless the native orb reports bounded nonactivating geometry", () => {
    expect(watchdog).toContain('event -eq "native-orb-ready"');
    expect(watchdog).toContain("ORB_MAX_PIXELS");
    expect(watchdog).toContain('noActivate -ne $true');
  });

  it("exercises the automatic suggestion no-activation path", () => {
    expect(watchdog).toContain("--smoke-auto-suggestion");
    expect(watchdog).toContain('$_.event -eq "surface-shown"');
    expect(watchdog).toContain('$_.detail.mode -eq "automatic-no-activate"');
  });

  it("closes only the suggestion and verifies the agent remains alive", () => {
    expect(watchdog).toContain("--smoke-close-suggestion");
    expect(watchdog).toContain('$_.event -eq "suggestion-close-hidden"');
    expect(watchdog).toContain('$closeHidden.detail.agentAlive -ne $true');
    expect(watchdog).toContain('$closeHidden.detail.orbVisible -ne $true');
    expect(watchdog).toContain("Agent exited after suggestion close");
  });

  it("minimizes the panel and verifies the orb path restores it", () => {
    expect(watchdog).toContain("--smoke-minimize-restore");
    expect(watchdog).toContain('$_.event -eq "surface-restored-from-minimized"');
    expect(watchdog).toContain('$minimizeRestored.detail.minimizedBefore -ne $true');
    expect(watchdog).toContain('$minimizeRestored.detail.minimizedAfter -ne $false');
  });

  it("verifies that the panel is positioned outside the current orb bounds", () => {
    expect(watchdog).toContain('$_.event -eq "panel-positioned"');
    expect(watchdog).toContain('$panelPositioned.detail.overlapsOrb -ne $false');
    expect(watchdog).toContain("panelOrbNonOverlap =");
  });

  it("can require a human-driven orb drag while the external watchdog remains active", () => {
    expect(watchdog).toContain("[switch]$RequireOrbDrag");
    expect(watchdog).toContain('$_.event -eq "native-orb-moved"');
    expect(watchdog).toContain("orbDragVerified =");
  });

  it("verifies the agent process is absent after cleanup", () => {
    expect(watchdog).toContain('Get-Process -Name "ambient-desktop-agent"');
    expect(watchdog).toContain('throw "MyBuddy-AI survived watchdog cleanup."');
  });

  it("fails an early process exit instead of reporting a smoke-test pass", () => {
    expect(watchdog).toContain("MyBuddy-AI exited before the watchdog deadline");
    expect(watchdog).toContain("exitedBeforeDeadline =");
  });
});
