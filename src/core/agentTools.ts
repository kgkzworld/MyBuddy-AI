import type { AgentTool } from "./agentRuntime";

export type NativeInvoker = (
  command: string,
  argumentsValue?: Record<string, unknown>,
) => Promise<unknown>;

interface ReadOnlyToolOptions {
  getActiveWindow?: () => unknown;
  now?: () => Date;
}

function boundedString(argumentsValue: Record<string, unknown>, name: string, maxLength: number): string {
  const value = argumentsValue[name];
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new Error(`${name} must be a nonempty string of at most ${maxLength} characters.`);
  }
  return value.trim();
}

function boundedInteger(argumentsValue: Record<string, unknown>, name: string, minimum: number, maximum: number, fallback: number): number {
  const value = argumentsValue[name];
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.trunc(value)));
}

function visualWorkflowMode(argumentsValue: Record<string, unknown>): "act" | "demonstrate" {
  if (argumentsValue.mode === "act" || argumentsValue.mode === "demonstrate") return argumentsValue.mode;
  throw new Error("mode must be either act or demonstrate.");
}

export function createReadOnlyAgentTools(
  invokeNative: NativeInvoker,
  options: ReadOnlyToolOptions = {},
): AgentTool[] {
  return [
    {
      id: "observer.process.running",
      description: "Read local process metadata to check whether a named application or executable is currently running. Arguments: { query: string }.",
      risk: "read-only",
      execute: (argumentsValue) => invokeNative("get_running_app_status", {
        query: boundedString(argumentsValue, "query", 80),
      }),
    },
    {
      id: "observer.services.running",
      description: "List currently running Windows services. Arguments: {}.",
      risk: "read-only",
      execute: () => invokeNative("get_running_services_status"),
    },
    {
      id: "observer.memory.top_applications",
      description: "Rank applications by aggregated current working-set memory. Arguments: { limit: integer from 1 to 10 }.",
      risk: "read-only",
      execute: (argumentsValue) => invokeNative("get_top_memory_applications_status", {
        limit: boundedInteger(argumentsValue, "limit", 1, 10, 5),
      }),
    },
    {
      id: "observer.files.largest",
      description: "Find the largest files under an exact requested directory using bounded metadata-only traversal. Arguments: { path: string, limit: integer from 1 to 10 }.",
      risk: "read-only",
      execute: (argumentsValue) => invokeNative("get_largest_files_status", {
        path: boundedString(argumentsValue, "path", 1_024),
        limit: boundedInteger(argumentsValue, "limit", 1, 10, 5),
      }),
    },
    {
      id: "observer.window.active_metadata",
      description: "Read the privacy-approved active application name and window-title metadata captured by MyBuddy-AI. Arguments: {}.",
      risk: "read-only",
      execute: async () => options.getActiveWindow?.() ?? { available: false },
    },
    {
      id: "utility.local_datetime",
      description: "Read the current local date and time from MyBuddy-AI's host. Arguments: {}.",
      risk: "read-only",
      execute: async () => {
        const value = options.now?.() ?? new Date();
        return { iso: value.toISOString(), local: value.toLocaleString() };
      },
    },
  ];
}

export function createAgentTools(
  invokeNative: NativeInvoker,
  options: ReadOnlyToolOptions = {},
): AgentTool[] {
  return [
    ...createReadOnlyAgentTools(invokeNative, options),
    {
      id: "process.terminate_matching",
      description: "Close one or all processes matching a named desktop application. This can discard unsaved work and always requires one-time approval. Arguments: { query: string, all: boolean }.",
      risk: "consequential",
      execute: (argumentsValue) => invokeNative("terminate_matching_processes", {
        query: boundedString(argumentsValue, "query", 80),
        all: argumentsValue.all === true,
      }),
    },
    {
      id: "desktop.visual_workflow",
      description: "Execute a bounded visual workflow in any named desktop application. Do not use for email, inbox, mail, vault, or Obsidian retrieval; those require a configured nonvisual data connector. The host resolves or launches the application, binds one process, observes fresh accessibility state, follows only windows owned by that process, and verifies the requested outcome. Use mode demonstrate for show/teach requests and act for direct visual action. Arguments: { application: string, goal: string, mode: 'act' | 'demonstrate' }.",
      risk: "consequential",
      execute: (argumentsValue) => invokeNative("execute_application_visual_workflow", {
        application: boundedString(argumentsValue, "application", 80),
        goal: boundedString(argumentsValue, "goal", 500),
        mode: visualWorkflowMode(argumentsValue),
      }),
    },
  ];
}
