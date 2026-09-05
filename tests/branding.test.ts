import { describe, expect, it } from "vitest";
import html from "../index.html?raw";
import config from "../src-tauri/tauri.conf.json";
import packageJson from "../package.json";
import rustHost from "../src-tauri/src/lib.rs?raw";
import orbHost from "../src-tauri/src/orb.rs?raw";
import operationsScript from "../scripts/ambient-agent.ps1?raw";
import watchdogScript from "../scripts/guarded-smoke-test.ps1?raw";

describe("MyBuddy-AI product branding", () => {
  it("uses MyBuddy-AI across visible product surfaces", () => {
    expect(packageJson.name).toBe("mybuddy-ai");
    expect(config.productName).toBe("MyBuddy-AI");
    expect(config.app.windows[0].title).toBe("MyBuddy-AI");
    expect(html).toContain("<title>MyBuddy-AI</title>");
    expect(html).toContain("MYBUDDY-AI");
    expect(rustHost).toContain("MyBuddy-AI — local desktop assistant");
    expect(orbHost).toContain('w!("MyBuddy-AI Orb")');
    expect(operationsScript).toContain('Write-Host "MyBuddy-AI stopped."');
    expect(watchdogScript).toContain("Starting guarded MyBuddy-AI smoke test.");
  });
});
