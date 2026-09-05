import type { TakeoverCapability } from "../core/userRequest";

export type QuestionAnswerSource =
  | "local-qwen"
  | "codex-cli"
  | "agent-runtime"
  | "agent-passthrough"
  | "local-qwen-window-context"
  | "desktop-metadata"
  | "in-process"
  | "window-context-unavailable";

export interface WindowContextAction {
  title: string;
}

export interface FileOpenGuidanceContext {
  processName: string;
  title: string;
}

export function fileOpenGuidanceCard(
  _request: string,
  context: FileOpenGuidanceContext | null,
  steps: readonly string[],
): Record<string, unknown> {
  const application = context?.processName.trim() || "the current app";
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "Open a file", size: "Large", weight: "Bolder", wrap: true },
      { type: "TextBlock", text: `In ${application}:`, wrap: true, weight: "Bolder", spacing: "Small" },
      {
        type: "TextBlock",
        text: steps.map((step, index) => `${index + 1}. ${step}`).join("\n"),
        wrap: true,
        spacing: "Small",
      },
      {
        type: "TextBlock",
        text: "Choose a demonstration speed to watch MyBuddy perform and verify these actions.",
        wrap: true,
        weight: "Bolder",
        spacing: "Medium",
      },
      {
        type: "TextBlock",
        text: "Computer Use scope: open this application's file picker and stop. No file will be selected.",
        wrap: true,
        size: "Small",
        isSubtle: true,
      },
    ],
    actions: [
      {
        type: "Action.Submit",
        title: "Normal",
        style: "positive",
        data: {
          action: "start_computer_use_demo",
          speed: "normal",
          request: "Open the current application's file picker and stop before selecting a file",
        },
      },
      {
        type: "Action.Submit",
        title: "Slow",
        data: {
          action: "start_computer_use_demo",
          speed: "slow",
          request: "Open the current application's file picker and stop before selecting a file",
        },
      },
      { type: "Action.Submit", title: "Cancel", data: { action: "back_status" } },
    ],
  };
}

export function fileOpenGuidanceUnavailableCard(
  _request: string,
  context: FileOpenGuidanceContext | null,
  canOfferComputerUse = true,
): Record<string, unknown> {
  const application = context?.processName.trim() || "the current app";
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "Open a file", size: "Large", weight: "Bolder", wrap: true },
      {
        type: "TextBlock",
        text: `I could not verify click-by-click instructions from ${application}'s current visible controls. No clicks or screen actions were attempted.`,
        wrap: true,
      },
      ...(canOfferComputerUse
        ? [{
            type: "TextBlock",
            text: "Would you like Computer Use to inspect the app and try opening its file picker? It will stop before selecting a file.",
            wrap: true,
            weight: "Bolder",
          }]
        : []),
    ],
    actions: [
      ...(canOfferComputerUse
        ? [{
            type: "Action.Submit",
            title: "Yes — let Computer Use inspect and try",
            style: "positive",
            data: {
              action: "request_computer_use",
              request: "Open the current application's file picker and stop before selecting a file",
            },
          }]
        : []),
      { type: "Action.Submit", title: "Back", data: { action: "back_status" } },
    ],
  };
}

export function demonstrationRunningCard(
  application: string,
  speed: "normal" | "slow",
): Record<string, unknown> {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "Visible demonstration in progress", size: "Large", weight: "Bolder", wrap: true },
      {
        type: "TextBlock",
        text: `${application} · ${speed === "slow" ? "Slow" : "Normal"} speed · each action is re-inspected before the next step.`,
        wrap: true,
      },
      {
        type: "TextBlock",
        text: "Tap MyBuddy's orb to return here, then choose Stop demonstration. The current short action will be killed and no further action will run.",
        wrap: true,
        size: "Small",
        isSubtle: true,
      },
    ],
    actions: [
      {
        type: "Action.Submit",
        title: "Stop demonstration",
        style: "destructive",
        data: { action: "cancel_autohotkey_demo" },
      },
    ],
  };
}

export function questionAnswerCard(
  question: string,
  answer: string,
  source: QuestionAnswerSource = "local-qwen",
  windowContextAction?: WindowContextAction,
): Record<string, unknown> {
  const sourceLabel = source === "in-process"
    ? "Answered in-process · no helper process or screen content"
    : source === "desktop-metadata"
      ? "Answered in-process from local desktop metadata · no screenshot or screen pixels"
    : source === "agent-runtime" || source === "agent-passthrough"
      ? "Answered by the selected AI agent · local tools available · no screenshots"
    : source === "local-qwen-window-context"
      ? "Answered by the selected model provider · bounded visible-window accessibility text was included"
      : source === "window-context-unavailable"
        ? "No window content was read"
        : "Answered by the selected model provider · no screen content was included";
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "MyBuddy-AI", size: "Large", weight: "Bolder" },
      { type: "TextBlock", text: question, wrap: true, isSubtle: true, spacing: "Small" },
      { type: "TextBlock", text: answer, wrap: true, spacing: "Medium" },
      {
        type: "TextBlock",
        text: sourceLabel,
        wrap: true,
        size: "Small",
        isSubtle: true,
      },
    ],
    actions: [
      ...(windowContextAction
        ? [{
            type: "Action.Submit",
            title: windowContextAction.title,
            style: "positive",
            data: { action: "analyze_current_window", request: question },
          }]
        : []),
      { type: "Action.Submit", title: "Back", data: { action: "back_status" } },
    ],
  };
}

export function agentToolApprovalCard(
  request: string,
  toolId: string,
  argumentsValue: Record<string, unknown>,
  reason: string,
): Record<string, unknown> {
  const closesProcesses = toolId === "process.terminate_matching";
  const visualWorkflow = toolId === "desktop.visual_workflow";
  const target = closesProcesses && typeof argumentsValue.query === "string"
    ? argumentsValue.query
    : visualWorkflow && typeof argumentsValue.application === "string"
      ? argumentsValue.application
      : "the selected target";
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "Approval required", size: "Large", weight: "Bolder", wrap: true },
      { type: "TextBlock", text: request, wrap: true, isSubtle: true, spacing: "Small" },
      { type: "TextBlock", text: closesProcesses
        ? `Close ${argumentsValue.all === true ? "all " : "one "}matching ${target} application process(es). Unsaved work may be lost.`
        : visualWorkflow
          ? `Allow MBAI to acquire ${target}, bind one process, and execute only this visual goal: ${String(argumentsValue.goal ?? "").slice(0, 500)}`
          : reason, wrap: true, spacing: "Medium" },
      { type: "TextBlock", text: "Allow once · exact tool and arguments · verify after execution", wrap: true, size: "Small", isSubtle: true },
    ],
    actions: [
      { type: "Action.Submit", title: closesProcesses
        ? "Allow once and close matching applications"
        : visualWorkflow
          ? "Allow once and run the visual workflow"
          : "Allow once", style: "positive", data: { action: "approve_agent_tool" } },
      { type: "Action.Submit", title: "Cancel", data: { action: "back_status" } },
    ],
  };
}

export function agentToolResultCard(verified: boolean, message: string): Record<string, unknown> {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: verified ? "Action completed and verified" : "Action could not be verified", size: "Large", weight: "Bolder", wrap: true },
      { type: "TextBlock", text: message, wrap: true, spacing: "Medium" },
      { type: "TextBlock", text: "Allow-once scope ended", size: "Small", isSubtle: true },
    ],
    actions: [{ type: "Action.Submit", title: "Back", data: { action: "back_status" } }],
  };
}

export function takeoverRequestCard(
  request: string,
  capability: TakeoverCapability | null = null,
): Record<string, unknown> {
  const approval = capability === "notepad-story"
    ? {
        scope: "Allow once: ask the selected AI to write an original story of 500 words or fewer, start or restore Notepad++, create a new unsaved tab, insert the story, and read the text back for verification.",
        title: "Allow once, write the story, and put it in Notepad++",
        action: "approve_notepad_story",
        capability: "notepad-story" as const,
      }
    : null;
            const generalApproval = {
            scope: "Allow once: use the current application's live accessibility controls only for this requested goal. MyBuddy re-checks the application after every action and stops on sensitive, destructive, ambiguous, or unverified state.",
            title: "Yes — use Computer Use",
            action: "request_computer_use",
            };
            return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "Takeover request", size: "Large", weight: "Bolder", wrap: true },
      { type: "TextBlock", text: request, wrap: true, spacing: "Small" },
      {
        type: "Container",
        style: "emphasis",
        spacing: "Medium",
        items: [
          {
            type: "TextBlock",
            text: approval ? approval.scope : generalApproval.scope,
            wrap: true,
          },
        ],
      },
    ],
    actions: [
      ...(approval
        ? [
            {
              type: "Action.Submit",
              title: approval.title,
              style: "positive",
              data: { action: approval.action, request },
            },
            ...(approval.capability === "notepad-story" ? [] : [{
                type: "Action.Submit",
                title: "Always allow this exact action",
                data: { action: "always_allow_capability", capability: approval.capability },
              }]),
          ]
        : [{
            type: "Action.Submit",
            title: generalApproval.title,
            style: "positive",
            data: { action: generalApproval.action, request },
          }]),
      { type: "Action.Submit", title: approval ? "Cancel" : "Back", data: { action: "back_status" } },
    ],
  };
}

export function capabilityRequestSavedCard(request: string): Record<string, unknown> {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "Capability request saved", size: "Large", weight: "Bolder" },
      { type: "TextBlock", text: request, wrap: true, spacing: "Small", isSubtle: true },
      {
        type: "TextBlock",
        text: "Status: needs a tested adapter. MyBuddy-AI did not execute this request. Once an executor is implemented and verified, the same request can offer a scoped approval button.",
        wrap: true,
        spacing: "Medium",
      },
    ],
    actions: [{ type: "Action.Submit", title: "Back", data: { action: "back_status" } }],
  };
}

export function takeoverLaunchResultCard(
  verified: boolean,
  message: string,
  application = "Microsoft Word",
): Record<string, unknown> {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      {
        type: "TextBlock",
        text: verified ? `${application} is open` : `${application} action stopped`,
        size: "Large",
        weight: "Bolder",
        wrap: true,
      },
      { type: "TextBlock", text: message, wrap: true, spacing: "Medium" },
      { type: "TextBlock", text: "Allow-once scope ended", size: "Small", isSubtle: true },
    ],
    actions: [{ type: "Action.Submit", title: "Back", data: { action: "back_status" } }],
  };
}

export function takeoverResultCard(
  verified: boolean,
  message: string,
  application = "Notepad++",
): Record<string, unknown> {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      {
        type: "TextBlock",
        text: verified ? `${application} Open dialog is ready` : `${application} action stopped`,
        size: "Large",
        weight: "Bolder",
        wrap: true,
      },
      { type: "TextBlock", text: message, wrap: true, spacing: "Medium" },
      { type: "TextBlock", text: "Scope ended · no file was selected", size: "Small", isSubtle: true },
    ],
    actions: [{ type: "Action.Submit", title: "Back", data: { action: "back_status" } }],
  };
}
