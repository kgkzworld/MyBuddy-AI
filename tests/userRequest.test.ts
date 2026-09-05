import { describe, expect, it } from "vitest";
import main from "../src/main.ts?raw";
import {
  buildNotepadStoryPrompt,
  classifyUserRequest,
  extractRunningAppQuery,
  extractTopMemoryApplicationLimit,
  formatActiveWindowStatus,
  formatRunningAppStatus,
  formatLargestFilesStatus,
  formatTopMemoryApplicationStatus,
  formatRunningServicesStatus,
  resolveLocalAnswerPlan,
  resolveLargestFilesPlan,
  resolveTakeoverCapability,
  validateGeneratedStory,
} from "../src/core/userRequest";

const syntheticWindowsRoot = ["X:", "example"].join("\\");
const misspelledSyntheticRoot = ["X:", "exampel"].join("\\");

describe("user request classification", () => {
  it("plans the exact largest-files request as bounded local metadata work", () => {
    const request = `get me a list of the 5 largest files under ${misspelledSyntheticRoot}`;
    expect(resolveLargestFilesPlan(request))
      .toEqual({ path: misspelledSyntheticRoot, limit: 5 });
    expect(classifyUserRequest(request))
      .toBe("largest-files-status");
  });
  it("bounds largest-file counts and keeps explanation requests non-actuating", () => {
    expect(resolveLargestFilesPlan(`list the 99 biggest files under ${syntheticWindowsRoot}`))
      .toEqual({ path: syntheticWindowsRoot, limit: 10 });
    expect(resolveLargestFilesPlan(`show me how to find the 5 largest files under ${syntheticWindowsRoot}`))
      .toBeNull();
  });
  it("hides the internal Windows device prefix in largest-file answers", () => {
    const deviceRoot = `\\\\?\\${syntheticWindowsRoot}`;
    const answer = formatLargestFilesStatus(misspelledSyntheticRoot, deviceRoot, true,
      [{ path: `${deviceRoot}\\large.bin`, sizeBytes: 2 * 1024 ** 3 }], false);
    expect(answer).toContain(`${syntheticWindowsRoot}\\large.bin — 2.00 GiB`);
    expect(answer).not.toContain("\\\\?\\");
  });
  it("routes ordinary questions to local Qwen", () => {
    expect(classifyUserRequest("Why might these tests be failing?")).toBe("question");
  });

  it("routes a plain screen-state question to local desktop metadata", () => {
    expect(classifyUserRequest("what do you see on the screen")).toBe("active-window-status");
  });

  it("answers screen-state questions truthfully from the last observed window", () => {
    const answer = formatActiveWindowStatus({
      processName: "notepad++.exe",
      title: "new 1 - Notepad++",
      observedAt: "2026-08-30T20:00:00Z",
    });

    expect(answer).toContain("Notepad++");
    expect(answer).toContain("new 1 - Notepad++");
    expect(answer).toContain("active-window metadata");
    expect(answer).toContain("not screen pixels");
  });

  it("answers screen-state locally without calling the selected provider", () => {
    expect(main).toContain('if (requestClass === "active-window-status")');
    expect(main).toContain("formatActiveWindowStatus(latestSnapshot)");
  });

  it("routes running-app questions to native process state, including the reported typo", () => {
    expect(classifyUserRequest("is notepad++ runing")).toBe("running-app-status");
    expect(classifyUserRequest("is Notepad++ running?")).toBe("running-app-status");
  });

  it.each([
    "is orca.exe running?",
    "is chrome.exe running?",
    "is the notepad++.exe process running?",
  ])("routes executable-name process questions locally: %s", (request) => {
    expect(classifyUserRequest(request)).toBe("running-app-status");
  });

  it("routes both reported Windows-service questions before running-app extraction", () => {
    expect(classifyUserRequest("what services are currently running?")).toBe("running-services-status");
    expect(classifyUserRequest("what windows services are currently running on this machine")).toBe(
      "running-services-status",
    );
  });

  it("routes the exact highest-memory application question to local machine state", () => {
    expect(classifyUserRequest("what application is taking up the most memory on my machine"))
      .toBe("top-memory-application-status");
    expect(classifyUserRequest("what are the 5 applications that use the most memory on this machine"))
      .toBe("top-memory-application-status");
    expect(classifyUserRequest("which top 3 apps use the most RAM?"))
      .toBe("top-memory-application-status");
    expect(classifyUserRequest("how do I find the applications using the most memory?"))
      .toBe("question");
  });

  it("plans broad system-resource questions as bounded local answers instead of provider prose", () => {
    expect(resolveLocalAnswerPlan("what 10 apps take up the most resources on this machine"))
      .toEqual({
        capability: "top-resource-applications",
        limit: 10,
        metric: "working-set-memory",
        interpretedBroadResources: true,
      });
    expect(classifyUserRequest("what 10 apps take up the most resources on this machine"))
      .toBe("top-memory-application-status");
    expect(resolveLocalAnswerPlan("list the top 4 processes by RAM"))
      .toEqual({
        capability: "top-resource-applications",
        limit: 4,
        metric: "working-set-memory",
        interpretedBroadResources: false,
      });
    expect(resolveLocalAnswerPlan("how do I find the 10 apps using the most resources?"))
      .toBeNull();
  });

  it.each([
    ["can you give me the top 3 apps that use the most memory", 3],
    ["please give me the 4 applications with the highest RAM use", 4],
    ["tell me which 2 processes consume the most memory", 2],
    ["I want the top 6 apps by memory", 6],
    ["show the 7 highest memory applications", 7],
    ["could you report the top 8 processes by RAM?", 8],
  ])("semantically plans ranked-memory paraphrase %s", (request, limit) => {
    expect(resolveLocalAnswerPlan(request)).toMatchObject({
      capability: "top-resource-applications",
      limit,
      metric: "working-set-memory",
    });
    expect(classifyUserRequest(request)).toBe("top-memory-application-status");
  });

  it.each([
    "how do I find the top 3 apps using memory?",
    "show me how to identify the highest memory processes",
    "teach me how to check which applications use the most RAM",
    "walk me through finding the top memory apps",
  ])("keeps explanation request out of local execution: %s", (request) => {
    expect(resolveLocalAnswerPlan(request)).toBeNull();
    expect(classifyUserRequest(request)).toBe("question");
  });

  it("extracts a bounded requested application count", () => {
    expect(extractTopMemoryApplicationLimit("what application is taking up the most memory")).toBe(1);
    expect(extractTopMemoryApplicationLimit("what are the 5 applications that use the most memory")).toBe(5);
    expect(extractTopMemoryApplicationLimit("list the top 99 apps by RAM")).toBe(10);
    expect(extractTopMemoryApplicationLimit("show the 7 highest memory applications")).toBe(7);
    expect(extractTopMemoryApplicationLimit("give me the top three apps by memory")).toBe(3);
  });

  it("formats a direct highest-memory answer without Task Manager instructions", () => {
    const answer = formatTopMemoryApplicationStatus([
      { processName: "chrome.exe", workingSetBytes: 1_073_741_824, processCount: 8 },
      { processName: "code.exe", workingSetBytes: 536_870_912, processCount: 4 },
    ]);
    expect(answer).toContain("Chrome");
    expect(answer).toContain("1.00 GiB");
    expect(answer).toContain("across 8 processes");
    expect(answer).toContain("Visual Studio Code");
    expect(answer).not.toContain("Task Manager");
  });

  it("states its metric when broad resources wording is interpreted", () => {
    const answer = formatTopMemoryApplicationStatus([
      { processName: "chrome.exe", workingSetBytes: 1_073_741_824, processCount: 8 },
    ], true);
    expect(answer).toContain("‘resources’ as current working-set memory");
    expect(answer).not.toContain("Task Manager");
  });

  it("formats a bounded deterministic running-services answer", () => {
    const answer = formatRunningServicesStatus([
      { name: "Dnscache", displayName: "DNS Client" },
      { name: "Spooler", displayName: "Print Spooler" },
    ]);
    expect(answer).toContain("2 Windows services are currently running");
    expect(answer).toContain("DNS Client (Dnscache)");
    expect(answer).toContain("Print Spooler (Spooler)");
  });

  it("extracts a bounded application name from a running-app question", () => {
    expect(extractRunningAppQuery("is notepad++ runing")).toBe("notepad++");
    expect(extractRunningAppQuery("Is Microsoft Word running?")).toBe("Microsoft Word");
    expect(extractRunningAppQuery("is orca.exe running?")).toBe("orca.exe");
    expect(extractRunningAppQuery("is the notepad++.exe process running?"))
      .toBe("notepad++.exe");
  });

  it("formats a verified running-app answer without model speculation", () => {
    expect(formatRunningAppStatus("notepad++", true)).toBe("Yes — Notepad++ is running.");
    expect(formatRunningAppStatus("notepad++", false)).toBe("No — Notepad++ is not running.");
  });

  it("routes screen-control language to preview-only takeover", () => {
    expect(classifyUserRequest("Take over and fix this form for me")).toBe("takeover-preview");
    expect(classifyUserRequest("Click Submit and finish this workflow")).toBe("takeover-preview");
  });

  it("routes foreground and focus commands to Computer Use instead of Qwen", () => {
    expect(classifyUserRequest("bring it to the foreground")).toBe("takeover-preview");
    expect(classifyUserRequest("bring this app to the front")).toBe("takeover-preview");
    expect(classifyUserRequest("focus this window")).toBe("takeover-preview");
    expect(classifyUserRequest("activate the application")).toBe("takeover-preview");
  });

  it("routes show-me file-opening requests to guidance instead of takeover", () => {
    expect(classifyUserRequest("Show me how to open a file")).toBe("show-file-open-guidance");
    expect(classifyUserRequest("Teach me how to open a file in Word")).toBe("show-file-open-guidance");
    expect(classifyUserRequest("Walk me through opening a file")).toBe("show-file-open-guidance");
    expect(classifyUserRequest("How do I open a file in this app?")).toBe("show-file-open-guidance");
  });

  it("does not compile a named visual demonstration into an application-specific capability", () => {
    const request = "open Notepad++ or bring it to the foreground and then show me how to open a file";
    expect(classifyUserRequest(request)).toBe("show-file-open-guidance");
    expect(resolveTakeoverCapability(request)).toBeNull();
  });

  it("does not resolve ordinary visual workflows to application-specific capabilities", () => {
    expect(
      resolveTakeoverCapability("Take over, find Notepad++, run it, and click File > Open"),
    ).toBeNull();
    expect(
      resolveTakeoverCapability("Take over, open Microsoft Word, and run File > Open"),
    ).toBeNull();
    expect(resolveTakeoverCapability("Take over and delete my downloads")).toBeNull();
  });

  it("leaves Microsoft Word launch requests to the selected-AI visual workflow", () => {
    expect(resolveTakeoverCapability("open ms word for me")).toBeNull();
    expect(resolveTakeoverCapability("click on the start menu icon and run word")).toBeNull();
  });

  it("leaves Notepad++ launch and foreground requests to the generic visual workflow", () => {
    expect(resolveTakeoverCapability("open Notepad++")).toBeNull();
    expect(resolveTakeoverCapability("bring Notepad++ to the foreground")).toBeNull();
    expect(resolveTakeoverCapability("open or bring Notepad++ to the foreground")).toBeNull();
  });

  it("resolves the exact Notepad++ new-file story request before launch-only routing", () => {
    expect(resolveTakeoverCapability(
      "open Notepad++, open a new file and create a story that is 500 words or less",
    )).toBe("notepad-story");
  });

  it("builds and validates story-only provider output within the requested bound", () => {
    const prompt = buildNotepadStoryPrompt(
      "open Notepad++, open a new file and create a story that is 500 words or less",
    );
    expect(prompt).toContain("500 words or fewer");
    expect(prompt).toContain("Return only the story text");
    expect(validateGeneratedStory("Once upon a local machine.")).toBe("Once upon a local machine.");
    expect(() => validateGeneratedStory(Array.from({ length: 501 }, () => "word").join(" ")))
      .toThrow("500 words or fewer");
  });
});