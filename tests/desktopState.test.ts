import { describe, expect, it } from "vitest";
import cargo from "../src-tauri/Cargo.toml?raw";
import lib from "../src-tauri/src/lib.rs?raw";
import observer from "../src-tauri/src/observer.rs?raw";
import main from "../src/main.ts?raw";

describe("bounded local desktop state", () => {
  it("answers largest-file requests through bounded metadata traversal", () => {
    expect(observer).toContain("pub fn get_largest_files_status");
    expect(observer).toContain("MAX_FILE_SCAN_ENTRIES");
    expect(lib).toContain("observer::get_largest_files_status");
    expect(lib).toContain('argument == "--smoke-largest-files-status"');
    expect(main).toContain('if (requestClass === "largest-files-status")');
    expect(lib).toContain("std::env::current_dir()");
    expect(main).toContain('listen<string>("smoke-largest-files-status"');
    expect(main).toContain('under "${payload}"');
  });
  it("registers a native process-status query without shelling out", () => {
    expect(cargo).toContain('"Win32_System_Diagnostics_ToolHelp"');
    expect(observer).toContain("pub struct RunningAppStatus");
    expect(observer).toContain("pub fn get_running_app_status");
    expect(observer).toContain("CreateToolhelp32Snapshot");
    expect(observer).not.toMatch(/tasklist|powershell|cmd\.exe/i);
    expect(lib).toContain("observer::get_running_app_status");
  });

  it("answers running-app questions from the native result before any provider call", () => {
    expect(main).toContain('if (requestClass === "running-app-status")');
    expect(main).toContain('invoke<RunningAppStatus>("get_running_app_status"');
    expect(main).toContain("formatRunningAppStatus(application, status.running)");
  });

  it("exposes non-actuating smoke triggers for both reported desktop-state questions", () => {
    expect(main).toContain('listen("smoke-active-window-status"');
    expect(main).toContain('messageInput.value = "what do you see on the screen"');
    expect(main).toContain('listen("smoke-running-app-status"');
    expect(main).toContain('messageInput.value = "is orca.exe running?"');
    expect(main).toContain('listen("smoke-running-services-status"');
    expect(main).toContain('messageInput.value = "what services are currently running?"');
    expect(lib).toContain('argument == "--smoke-active-window-status"');
    expect(lib).toContain('argument == "--smoke-running-app-status"');
    expect(lib).toContain('argument == "--smoke-running-services-status"');
    expect(lib).toMatch(/--smoke-active-window-status[\s\S]{0,300}from_secs\(8\)/);
  });

  it("enumerates running Windows services locally before any provider call", () => {
    expect(cargo).toContain('"Win32_System_Services"');
    expect(observer).toContain("EnumServicesStatusExW");
    expect(observer).toContain("pub fn get_running_services_status");
    expect(lib).toContain("observer::get_running_services_status");
    expect(main).toContain('if (requestClass === "running-services-status")');
    expect(main).toContain('invoke<RunningServicesStatus>("get_running_services_status")');
  });

  it("answers the exact highest-memory application question from a native read-only adapter", () => {
    expect(cargo).toContain('"Win32_System_ProcessStatus"');
    expect(observer).toContain("GetProcessMemoryInfo");
    expect(observer).toContain("pub fn get_top_memory_applications_status");
    expect(lib).toContain("observer::get_top_memory_applications_status");
    expect(main).toContain('if (requestClass === "top-memory-application-status")');
    expect(main).toContain('invoke<TopMemoryApplicationsStatus>("get_top_memory_applications_status"');
    expect(main).toContain("localPlan?.interpretedBroadResources ?? false");
    expect(main).toContain("resolveLocalAnswerPlan(request)");
    expect(main).toContain('messageInput.value = "can you give me the top 3 apps that use the most memory"');
    expect(lib).toContain('argument == "--smoke-top-memory-application-status"');
  });
});
