import { describe, expect, it } from "vitest";
import manifest from "../agent_icons/manifest.json";
import html from "../index.html?raw";
import frontend from "../src/main.ts?raw";
import avatarCatalog from "../src/avatarCatalog.ts?raw";
import nativeOrb from "../src-tauri/src/orb.rs?raw";
import rustHost from "../src-tauri/src/lib.rs?raw";
import config from "../src-tauri/tauri.conf.json";

interface AvatarEntry {
  id: string;
  display_name: string;
  file: string;
  width: number;
  height: number;
  default: boolean;
}

const avatars = (manifest as { default_avatar: string; count: number; avatars: AvatarEntry[] }).avatars;

describe("orb avatar catalog and settings", () => {
  it("catalogs every supplied avatar under a unique clean name with one real default", () => {
    expect(manifest.count).toBe(78);
    expect(avatars).toHaveLength(78);
    expect(new Set(avatars.map((avatar) => avatar.id)).size).toBe(78);
    expect(avatars.every((avatar) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(avatar.id))).toBe(true);
    expect(avatars.filter((avatar) => avatar.default).map((avatar) => avatar.id)).toEqual([
      "friendly-blue-orb-bot",
    ]);
    expect(avatars.find((avatar) => avatar.id === manifest.default_avatar)?.file).toBe(
      "all/friendly-blue-orb-bot.png",
    );
  });

  it("ships a Settings avatar selector and applies bundled bytes to the native orb", () => {
    expect(html).toContain('id="settings-button"');
    expect(html).toContain('id="avatar-select"');
    expect(avatarCatalog).toContain("import.meta.glob");
    expect(avatarCatalog).toContain('query: "?inline"');
    expect(frontend).toContain('invoke("set_orb_avatar"');
    expect(frontend).toContain('"orb-avatar-apply-failed"');
    expect(frontend).toContain('stage: "bundle-load"');
    expect(frontend).toContain('stage: "native-invoke"');
    expect(frontend).toContain("atob(");
    expect(frontend).not.toContain("fetch(avatar");
    expect((config as { app: { security: { csp: string } } }).app.security.csp).toContain("img-src 'self' asset: data:");
    expect(frontend).toContain('localStorage.setItem("mybuddy-orb-avatar"');
    expect(nativeOrb).toContain("include_bytes!(");
    expect(nativeOrb).toContain('"../../agent_icons/all/friendly-blue-orb-bot.png"');
    expect(nativeOrb).toContain("image::load_from_memory");
    expect(nativeOrb).toContain("InvalidateRect");
    expect(nativeOrb).toContain("MAX_AVATAR_BYTES");
    expect(rustHost).toContain("orb::set_orb_avatar");
  });
});
