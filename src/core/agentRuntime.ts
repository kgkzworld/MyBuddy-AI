export type AgentToolRisk = "read-only" | "reversible" | "consequential" | "high-risk";

export interface AgentTool {
  id: string;
  description: string;
  risk: AgentToolRisk;
  execute(argumentsValue: Record<string, unknown>): Promise<unknown>;
}

export interface AgentObservation {
  toolId: string;
  arguments: Record<string, unknown>;
  result: unknown;
}

export interface AgentTurnState {
  request: string;
  history: readonly AgentConversationMessage[];
  tools: ReadonlyArray<Pick<AgentTool, "id" | "description" | "risk">>;
  observations: readonly AgentObservation[];
}

export interface AgentConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export type AgentStep =
  | { decision: "tool"; toolId: string; arguments: Record<string, unknown>; reason: string }
  | { decision: "final"; answer: string }
  | { decision: "stop"; reason: string };

export type AgentPlanner = (turn: AgentTurnState) => Promise<AgentStep>;

export type AgentTurnResult =
  | { kind: "final"; answer: string }
  | {
      kind: "approval-required";
      toolId: string;
      arguments: Record<string, unknown>;
      reason: string;
      risk: Exclude<AgentToolRisk, "read-only">;
    }
  | { kind: "stopped"; reason: string };

const MAX_AGENT_STEPS = 6;
const NONVISUAL_DATA_TERMS = new Set([
  "email",
  "emails",
  "mail",
  "inbox",
  "gmail",
  "outlook",
  "vault",
  "obsidian",
]);

function requiresNonvisualDataConnector(request: string): boolean {
  return request
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.some((term) => NONVISUAL_DATA_TERMS.has(term)) ?? false;
}

function canonicalCall(toolId: string, argumentsValue: Record<string, unknown>): string {
  return `${toolId}:${JSON.stringify(argumentsValue, Object.keys(argumentsValue).sort())}`;
}

export async function executeAgentTurn(
  request: string,
  planner: AgentPlanner,
  registeredTools: readonly AgentTool[],
  history: readonly AgentConversationMessage[] = [],
): Promise<AgentTurnResult> {
  const boundedRequest = request.trim();
  if (!boundedRequest || boundedRequest.length > 2_000) {
    throw new Error("The agent request must be between 1 and 2,000 characters.");
  }
  const excludesVisualFallback = requiresNonvisualDataConnector(boundedRequest);
  const availableTools = excludesVisualFallback
    ? registeredTools.filter(({ id }) => id !== "desktop.visual_workflow")
    : registeredTools;
  const tools = new Map(availableTools.map((tool) => [tool.id, tool]));
  const descriptions = availableTools.map(({ id, description, risk }) => ({ id, description, risk }));
  const observations: AgentObservation[] = [];
  const boundedHistory = history.slice(-8).map(({ role, content }) => ({
    role,
    content: content.trim().slice(0, 2_000),
  })).filter(({ content }) => content.length > 0);
  const completedCalls = new Set<string>();

  for (let stepIndex = 0; stepIndex < MAX_AGENT_STEPS; stepIndex += 1) {
    const step = await planner({ request: boundedRequest, history: boundedHistory, tools: descriptions, observations });
    if (step.decision === "final") {
      const answer = step.answer.trim();
      if (!answer) throw new Error("The selected agent returned an empty final answer.");
      return { kind: "final", answer };
    }
    if (step.decision === "stop") return { kind: "stopped", reason: step.reason };

    const tool = tools.get(step.toolId);
    if (!tool && excludesVisualFallback && step.toolId === "desktop.visual_workflow") {
      return {
        kind: "stopped",
        reason: "The selected runtime did not provide a configured connector for this nonvisual data request. Computer Use was not attempted.",
      };
    }
    if (!tool) throw new Error(`The selected agent requested an unknown tool: ${step.toolId}`);
    const callKey = canonicalCall(step.toolId, step.arguments);
    if (completedCalls.has(callKey)) {
      throw new Error("The selected agent repeated the same tool call without making progress.");
    }
    if (tool.risk !== "read-only") {
      return {
        kind: "approval-required",
        toolId: tool.id,
        arguments: step.arguments,
        reason: step.reason,
        risk: tool.risk,
      };
    }
    completedCalls.add(callKey);
    const result = await tool.execute(step.arguments);
    observations.push({ toolId: tool.id, arguments: step.arguments, result });
  }
  throw new Error(`The selected agent exceeded the ${MAX_AGENT_STEPS}-step limit.`);
}
