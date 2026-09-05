import { describe, expect, it } from "vitest";
import {
  executeAgentTurn,
  type AgentPlanner,
  type AgentTool,
} from "../src/core/agentRuntime";
import { createAgentTools, createReadOnlyAgentTools } from "../src/core/agentTools";
import frontend from "../src/main.ts?raw";
import conversationCards from "../src/cards/conversationCard.ts?raw";
import { agentToolApprovalCard, agentToolResultCard } from "../src/cards/conversationCard";
import nativeHost from "../src-tauri/src/lib.rs?raw";

describe("agent-first turn coordinator", () => {
  it.each([
    "get my important emails for the past week",
    "search my inbox for the invoice",
    "find the deployment note in my Obsidian vault",
  ])("never offers visual desktop automation for nonvisual data retrieval: %s", async (request) => {
    let advertisedToolIds: string[] = [];
    const planner: AgentPlanner = async (turn) => {
      advertisedToolIds = turn.tools.map(({ id }) => id);
      return {
        decision: "tool",
        toolId: "desktop.visual_workflow",
        arguments: { application: "Gmail", goal: request, mode: "act" },
        reason: "Try a visual fallback",
      };
    };
    const visualTool: AgentTool = {
      id: "desktop.visual_workflow",
      description: "Execute a visual workflow",
      risk: "consequential",
      execute: async () => ({ verified: true }),
    };

    const result = await executeAgentTurn(request, planner, [visualTool]);

    expect(advertisedToolIds).not.toContain("desktop.visual_workflow");
    expect(result).toEqual({
      kind: "stopped",
      reason: "The selected runtime did not provide a configured connector for this nonvisual data request. Computer Use was not attempted.",
    });
  });

  it("makes the selected-agent coordinator the primary composer path", () => {
    expect(frontend).toContain("executeAgentTurn(");
    expect(frontend).toContain('invoke<AgentStep>("plan_agent_step"');
    expect(frontend).toContain("createAgentTools(");
    expect(frontend.indexOf("executeAgentTurn(")).toBeLessThan(
      frontend.indexOf('if (requestClass === "active-window-status")'),
    );
    expect(frontend).toContain('recordEvent("agent-turn-fallback"');
    expect(conversationCards).toContain('"agent-runtime"');
    expect(conversationCards).toContain("selected AI agent · local tools available");
  });

  it("exposes native process inspection through the production tool registry", async () => {
    const calls: Array<{ command: string; argumentsValue?: Record<string, unknown> }> = [];
    const tools = createReadOnlyAgentTools(async (command, argumentsValue) => {
      calls.push({ command, argumentsValue });
      return { query: "orca.exe", running: true, matchedProcesses: ["Orca.exe"] };
    });
    const tool = tools.find((candidate) => candidate.id === "observer.process.running")!;

    const result = await tool.execute({ query: "orca.exe" });

    expect(calls).toEqual([{
      command: "get_running_app_status",
      argumentsValue: { query: "orca.exe" },
    }]);
    expect(result).toMatchObject({ running: true });
  });

  it("registers generic named-process termination as consequential", async () => {
    const calls: Array<{ command: string; argumentsValue?: Record<string, unknown> }> = [];
    const tools = createAgentTools(async (command, argumentsValue) => {
      calls.push({ command, argumentsValue });
      return { verified: true, terminatedCount: 3, remainingProcesses: [] };
    });
    const tool = tools.find((candidate) => candidate.id === "process.terminate_matching")!;

    expect(tool.risk).toBe("consequential");
    await tool.execute({ query: "notepad++.exe", all: true });
    expect(calls).toEqual([{
      command: "terminate_matching_processes",
      argumentsValue: { query: "notepad++.exe", all: true },
    }]);
  });

  it("uses generic approval and result cards for agent tools", () => {
    const approval = JSON.stringify(agentToolApprovalCard(
      "close all Notepad++ applications",
      "process.terminate_matching",
      { query: "notepad++.exe", all: true },
      "Unsaved work may be lost.",
    ));
    expect(approval).toContain("Allow once and close matching applications");
    expect(approval).toContain("approve_agent_tool");
    expect(approval).toContain("notepad++.exe");
    expect(approval).not.toMatch(/file picker|no file was selected/i);

    const result = JSON.stringify(agentToolResultCard(true, "Closed 3 processes and verified none remain."));
    expect(result).toContain("Action completed and verified");
    expect(result).not.toMatch(/Open dialog|file was selected/i);
    expect(frontend).toContain('case "approve_agent_tool"');
    expect(frontend).toContain("pendingAgentToolApproval");
  });

  it("has a non-actuating packaged smoke for the exact close-app request", () => {
    expect(frontend).toContain('listen("smoke-agent-close-app-request"');
    expect(frontend).toContain('messageInput.value = "close all Notepad++ applications"');
    expect(nativeHost).toContain('argument == "--smoke-agent-close-app-request"');
    expect(nativeHost).not.toContain("smoke-agent-close-app-approve");
  });

  it("has a packaged smoke for the exact read-only email request", () => {
    expect(frontend).toContain('listen("smoke-important-email-request"');
    expect(frontend).toContain('messageInput.value = "please get me a list of important emails for the last week"');
    expect(nativeHost).toContain('argument == "--smoke-important-email-request"');
  });

  it("has a packaged smoke for the exact vault TODO request", () => {
    expect(frontend).toContain('listen("smoke-vault-todo-request"');
    expect(frontend).toContain('messageInput.value = "what todo are in my vault"');
    expect(nativeHost).toContain('argument == "--smoke-vault-todo-request"');
  });

  it("registers existing read-only capabilities with bounded native arguments", async () => {
    const calls: Array<{ command: string; argumentsValue?: Record<string, unknown> }> = [];
    const activeWindow = { processName: "Orca.exe", title: "Orca", processId: 42 };
    const tools = createReadOnlyAgentTools(
      async (command, argumentsValue) => {
        calls.push({ command, argumentsValue });
        return { command };
      },
      { getActiveWindow: () => activeWindow, now: () => new Date("2026-09-02T16:00:00Z") },
    );

    expect(tools.map((tool) => tool.id)).toEqual([
      "observer.process.running",
      "observer.services.running",
      "observer.memory.top_applications",
      "observer.files.largest",
      "observer.window.active_metadata",
      "utility.local_datetime",
    ]);
    await tools[1].execute({});
    await tools[2].execute({ limit: 50 });
    await tools[3].execute({ path: "D:\\Source", limit: 0 });
    expect(await tools[4].execute({})).toEqual(activeWindow);
    expect(await tools[5].execute({})).toMatchObject({ iso: "2026-09-02T16:00:00.000Z" });
    expect(calls).toEqual([
      { command: "get_running_services_status", argumentsValue: undefined },
      { command: "get_top_memory_applications_status", argumentsValue: { limit: 10 } },
      { command: "get_largest_files_status", argumentsValue: { path: "D:\\Source", limit: 1 } },
    ]);
  });

  it("lets the selected agent choose and observe a read-only tool without phrase routing", async () => {
    const plans = [
      { decision: "tool" as const, toolId: "observer.process.running", arguments: { query: "orca.exe" }, reason: "Needs live process state" },
      { decision: "final" as const, answer: "Yes — Orca.exe is running." },
    ];
    const planner: AgentPlanner = async (turn) => {
      expect(turn.request).toBe("Would Orca happen to be alive on this computer at the moment?");
      return plans.shift()!;
    };
    const tools: AgentTool[] = [{
      id: "observer.process.running",
      description: "Check whether a named process is running",
      risk: "read-only",
      execute: async (args) => ({ query: args.query, running: true }),
    }];

    const result = await executeAgentTurn(
      "Would Orca happen to be alive on this computer at the moment?",
      planner,
      tools,
    );

    expect(result).toEqual({ kind: "final", answer: "Yes — Orca.exe is running." });
  });

  it("passes bounded prior conversation context to every selected-agent planning step", async () => {
    const history = [
      { role: "user" as const, content: "Open Notepad++" },
      { role: "assistant" as const, content: "Notepad++ is open and verified." },
    ];
    const planner: AgentPlanner = async (turn) => {
      expect(turn.history).toEqual(history);
      return { decision: "final", answer: "I will continue in Notepad++." };
    };

    await executeAgentTurn("Now show me how to open a file", planner, [], history);
  });

  it("returns an approval request instead of executing a consequential tool", async () => {
    let executed = false;
    const planner: AgentPlanner = async () => ({
      decision: "tool",
      toolId: "process.terminate_matching",
      arguments: { query: "notepad++.exe", all: true },
      reason: "The user explicitly requested all matching processes be closed",
    });
    const tools: AgentTool[] = [{
      id: "process.terminate_matching",
      description: "Terminate matching local processes",
      risk: "consequential",
      execute: async () => { executed = true; return {}; },
    }];

    const result = await executeAgentTurn("close all notepad++ applications", planner, tools);

    expect(result).toMatchObject({
      kind: "approval-required",
      toolId: "process.terminate_matching",
      arguments: { query: "notepad++.exe", all: true },
    });
    expect(executed).toBe(false);
  });

  it("stops repeated tool calls that make no progress", async () => {
    const planner: AgentPlanner = async () => ({
      decision: "tool",
      toolId: "observer.process.running",
      arguments: { query: "orca.exe" },
      reason: "retry",
    });
    const tools: AgentTool[] = [{
      id: "observer.process.running",
      description: "Check process",
      risk: "read-only",
      execute: async () => ({ running: true }),
    }];

    await expect(executeAgentTurn("check Orca", planner, tools))
      .rejects.toThrow("repeated the same tool call");
  });
});
