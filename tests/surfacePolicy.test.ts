import { describe, expect, it } from "vitest";
import {
  orbClickSurfaceAction,
  suggestionSurfaceRequest,
  surfaceVisibilityAfterPause,
} from "../src/core/surfacePolicy";

describe("pause surface policy", () => {
  it("hides any visible interaction surface when paused", () => {
    expect(surfaceVisibilityAfterPause(true, true)).toBe(false);
  });

  it("does not reopen the surface when observation resumes", () => {
    expect(surfaceVisibilityAfterPause(false, false)).toBe(false);
  });
});

describe("suggestion surface policy", () => {
  it("shows automatic suggestions without activating the window", () => {
    expect(suggestionSurfaceRequest("automatic")).toEqual({ visible: true, activate: false });
  });

  it("allows an explicit user request to activate the window", () => {
    expect(suggestionSurfaceRequest("explicit")).toEqual({ visible: true, activate: true });
  });
});

describe("orb click surface policy", () => {
  it("opens and activates a hidden panel", () => {
    expect(orbClickSurfaceAction({ open: false, focused: false })).toBe("show");
  });

  it("activates an open background panel without hiding it", () => {
    expect(orbClickSurfaceAction({ open: true, focused: false })).toBe("focus");
  });

  it("hides an open foreground panel", () => {
    expect(orbClickSurfaceAction({ open: true, focused: true })).toBe("hide");
  });
});
