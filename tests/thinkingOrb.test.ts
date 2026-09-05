import { describe, expect, it, vi } from "vitest";
import { ThinkingOrbController } from "../src/core/thinkingOrb";

describe("thinking orb controller", () => {
  it("shows once for nested work and restores only after all work ends", async () => {
    const show = vi.fn(async () => undefined);
    const restore = vi.fn(async () => undefined);
    const controller = new ThinkingOrbController(show, restore);

    await controller.begin();
    await controller.begin();
    expect(show).toHaveBeenCalledTimes(1);
    await controller.end();
    expect(restore).not.toHaveBeenCalled();
    await controller.end();
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it("restores the selected profile after failed work", async () => {
    const show = vi.fn(async () => undefined);
    const restore = vi.fn(async () => undefined);
    const controller = new ThinkingOrbController(show, restore);

    await expect(controller.run(async () => {
      throw new Error("planner failed");
    })).rejects.toThrow("planner failed");
    expect(show).toHaveBeenCalledTimes(1);
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it("ignores a cancelled request's late end after a newer request starts", async () => {
    const show = vi.fn(async () => undefined);
    const restore = vi.fn(async () => undefined);
    const controller = new ThinkingOrbController(show, restore);

    await controller.begin("request-1");
    await controller.cancel("request-1");
    await controller.begin("request-2");
    await controller.end("request-1");

    expect(controller.isThinking()).toBe(true);
    expect(restore).toHaveBeenCalledTimes(1);
    await controller.end("request-2");
    expect(controller.isThinking()).toBe(false);
    expect(restore).toHaveBeenCalledTimes(2);
  });
});
