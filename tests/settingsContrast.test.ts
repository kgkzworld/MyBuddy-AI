// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

function contrastRatio(foreground: string, background: string): number {
  const channel = (value: number): number => {
    const normalized = value / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex: string): number => {
    const value = hex.replace("#", "");
    const channels = [0, 2, 4].map((offset) => channel(Number.parseInt(value.slice(offset, offset + 2), 16)));
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("settings readability", () => {
  it("uses theme-aware dialog and field surfaces instead of dark hard-coded backgrounds", () => {
    expect(styles).toMatch(/#settings-dialog\s*\{[^}]*background:\s*var\(--settings-surface\)/s);
    expect(styles).toMatch(/\.provider-settings select,\s*\.provider-settings input\s*\{[^}]*color:\s*var\(--settings-field-ink\)[^}]*background:\s*var\(--settings-field\)/s);
    expect(styles).toContain("color-scheme: dark");
    expect(styles).toMatch(/@media \(prefers-color-scheme: light\)[\s\S]*color-scheme:\s*light/);
  });

  it("defines WCAG-readable label and field colors in both themes", () => {
    expect(contrastRatio("#d7e4f8", "#0d1322")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#f4f8ff", "#182238")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#344158", "#f8faff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#172035", "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(styles).toContain("--settings-label: #d7e4f8");
    expect(styles).toContain("--settings-field-ink: #f4f8ff");
    expect(styles).toContain("--settings-label: #344158");
    expect(styles).toContain("--settings-field-ink: #172035");
  });

  it("keeps placeholders, options, and disabled values legible", () => {
    expect(styles).toMatch(/\.provider-settings input::placeholder\s*\{[^}]*color:\s*var\(--settings-placeholder\)/s);
    expect(styles).toMatch(/\.provider-settings option\s*\{[^}]*color:\s*var\(--settings-field-ink\)[^}]*background:\s*var\(--settings-field\)/s);
    expect(styles).toMatch(/\.provider-settings (?:input|select):disabled[\s\S]*opacity:\s*1/);
  });
});
