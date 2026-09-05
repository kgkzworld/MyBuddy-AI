import { describe, expect, it } from "vitest";
import { RequestLifecycle } from "../src/core/requestLifecycle";

describe("request lifecycle", () => {
  it("marks cancellation immediately and rejects a late stale result", () => {
    const lifecycle = new RequestLifecycle(8);
    lifecycle.start("request-1", "Request received");
    expect(lifecycle.cancel("request-1")).toBe(true);
    expect(lifecycle.acceptsResult("request-1")).toBe(false);
    expect(lifecycle.activeRequestId()).toBeNull();
    expect(lifecycle.entries().at(-1)?.message).toBe("Cancellation requested");
  });

  it("keeps only bounded safe progress labels", () => {
    const lifecycle = new RequestLifecycle(3);
    lifecycle.start("request-1", "Request received");
    lifecycle.update("request-1", "Selected agent started");
    lifecycle.update("request-1", "Still working");
    lifecycle.update("request-1", "Verifying result");
    expect(lifecycle.entries().map(({ message }) => message)).toEqual([
      "Selected agent started",
      "Still working",
      "Verifying result",
    ]);
  });

  it("supersedes an older request and accepts only the current result", () => {
    const lifecycle = new RequestLifecycle();
    lifecycle.start("request-1", "First request");
    lifecycle.start("request-2", "Second request");
    expect(lifecycle.acceptsResult("request-1")).toBe(false);
    expect(lifecycle.acceptsResult("request-2")).toBe(true);
  });
});