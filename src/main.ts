import "adaptivecards/lib/adaptivecards.css";
import * as AdaptiveCards from "adaptivecards";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { defaultAvatarId, findOrbAvatar, orbAvatars } from "./avatarCatalog";
import thinkingAvatarUrl from "../agent_icons/system/thinking-green-question.png?inline";
import {
  agentToolApprovalCard,
  agentToolResultCard,
  capabilityRequestSavedCard,
  demonstrationRunningCard,
  fileOpenGuidanceCard,
  fileOpenGuidanceUnavailableCard,
  questionAnswerCard,
  takeoverLaunchResultCard,
  takeoverRequestCard,
  takeoverResultCard,
} from "./cards/conversationCard";
import { buildSuggestionCard, type SuggestionCardPayload } from "./cards/suggestionCard";
import {
  isFixedCapability,
  parseCapabilityGrants,
  recordCapabilityUse,
  rememberCapability,
  revokeCapability,
  type CapabilityGrant,
} from "./core/capabilityGrant";
import type {
  InterventionCandidate,
  Suggestion,
  WindowSnapshot,
} from "./core/contracts";
import { PatternDetector } from "./core/detector";
import { buildManualAnalysisCandidate } from "./core/manualAnalysis";
import { answerLocalUtility } from "./core/localUtility";
import { executeAgentTurn, type AgentStep } from "./core/agentRuntime";
import { createAgentTools } from "./core/agentTools";
import { inspectAnswerQuality } from "./core/answerQuality";
import { ConversationContext } from "./core/conversationContext";
import { createDefaultPrivacyPolicy } from "./core/privacy";
import { shouldPassThroughToSelectedAgent } from "./core/providerSettings";
import { buildEpisodePrompt, parseSuggestionResponse } from "./core/qwen";
import {
  buildWindowContextPrompt,
  requestsCurrentWindowContext,
  shouldOfferWindowContext,
  type WindowTextContext,
} from "./core/windowContext";
import {
  classifyUserRequest,
  extractRunningAppQuery,
  extractTopMemoryApplicationLimit,
  formatActiveWindowStatus,
  formatRunningAppStatus,
  formatTopMemoryApplicationStatus,
  formatLargestFilesStatus,
  formatRunningServicesStatus,
  buildNotepadStoryPrompt,
  resolveLocalAnswerPlan,
  resolveLargestFilesPlan,
  resolveTakeoverCapability,
  validateGeneratedStory,
  type TakeoverCapability,
} from "./core/userRequest";
import { ThinkingOrbController } from "./core/thinkingOrb";
import { RequestLifecycle } from "./core/requestLifecycle";
import {
  captureComputerUseApproval,
  type ComputerUseApproval,
  type WindowContextTarget,
} from "./core/computerUseApproval";
import {
  orbClickSurfaceAction,
  suggestionSurfaceRequest,
  surfaceVisibilityAfterPause,
  type AgentSurfaceState,
  type SuggestionTrigger,
} from "./core/surfacePolicy";
import "./styles.css";

interface NativeWindowSnapshot {
  processName: string;
  title: string;
  processId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  windowHandle: number;
}

interface RunningAppStatus {
  query: string;
  running: boolean;
  matchedProcesses: string[];
}

interface RunningServicesStatus {
  services: Array<{ name: string; displayName: string }>;
}

interface TopMemoryApplicationsStatus {
  applications: Array<{
    processName: string;
    workingSetBytes: number;
    processCount: number;
  }>;
}

interface LargestFilesStatus {
  requestedPath: string;
  resolvedPath: string;
  corrected: boolean;
  files: Array<{ path: string; sizeBytes: number }>;
  truncated: boolean;
}

interface ProcessTerminationResult {
  verified: boolean;
  message: string;
  matchedCount: number;
  terminatedCount: number;
  remainingProcesses: string[];
}

interface PendingAgentToolApproval {
  request: string;
  toolId: string;
  arguments: Record<string, unknown>;
  reason: string;
}

interface TakeoverExecutionResult {
  application: string;
  action: string;
  verified: boolean;
  message: string;
}

interface ComputerUseGuidance {
  steps: string[];
}

type ProviderKind =
  | "lm-studio"
  | "openai-compatible"
  | "codex-cli"
  | "claude-cli"
  | "qwen-cli"
  | "continue-cli"
  | "hermes-cli"
  | "opencode-cli"
  | "antigravity-cli";

interface ProviderSettingsView {
  provider: ProviderKind;
  endpoint: string;
  chatModel: string;
  analysisModel: string;
  apiKeyConfigured: boolean;
}

interface ProviderTestResult {
  provider: ProviderKind;
  success: boolean;
  message: string;
}

interface ProviderAvailability {
  provider: ProviderKind;
  displayName: string;
  executable: string;
  installed: boolean;
  version: string | null;
}

interface ProviderProgressEvent {
  requestId: string;
  stage: "started" | "working" | "completed" | "cancelled" | "timed-out";
  elapsedSeconds: number;
}

interface ProviderCancellationResult {
  requestId: string;
  cancelled: boolean;
  message: string;
}

type CardPayload = SuggestionCardPayload | Record<string, unknown>;

const collapseButton = document.querySelector<HTMLButtonElement>("#collapse")!;
const cardHost = document.querySelector<HTMLElement>("#card-host")!;
const statusDot = document.querySelector<HTMLElement>("#status-dot")!;
const modeLabel = document.querySelector<HTMLElement>("#mode-label")!;
const runtimeLabel = document.querySelector<HTMLElement>("#runtime-label")!;
const messageForm = document.querySelector<HTMLFormElement>("#message-form")!;
const messageInput = document.querySelector<HTMLInputElement>("#message-input")!;
const messageSend = document.querySelector<HTMLButtonElement>("#message-send")!;
const clearConversationButton = document.querySelector<HTMLButtonElement>("#clear-conversation")!;
const cancelRequestButton = document.querySelector<HTMLButtonElement>("#cancel-request")!;
const activityLogButton = document.querySelector<HTMLButtonElement>("#activity-log-button")!;
const activityPanel = document.querySelector<HTMLElement>("#activity-panel")!;
const activityLog = document.querySelector<HTMLOListElement>("#activity-log")!;
const settingsButton = document.querySelector<HTMLButtonElement>("#settings-button")!;
const settingsDialog = document.querySelector<HTMLDialogElement>("#settings-dialog")!;
const avatarSelect = document.querySelector<HTMLSelectElement>("#avatar-select")!;
const avatarPreview = document.querySelector<HTMLImageElement>("#avatar-preview")!;
const providerSelect = document.querySelector<HTMLSelectElement>("#provider-select")!;
const providerAvailabilityLabel = document.querySelector<HTMLElement>("#provider-availability")!;
const providerEndpoint = document.querySelector<HTMLInputElement>("#provider-endpoint")!;
const providerChatModel = document.querySelector<HTMLInputElement>("#provider-chat-model")!;
const providerAnalysisModel = document.querySelector<HTMLInputElement>("#provider-analysis-model")!;
const providerApiKey = document.querySelector<HTMLInputElement>("#provider-api-key")!;
const providerSaveTest = document.querySelector<HTMLButtonElement>("#provider-save-test")!;
const providerTestResult = document.querySelector<HTMLElement>("#provider-test-result")!;
const capabilityGrantList = document.querySelector<HTMLElement>("#capability-grant-list")!;

const capabilityGrantStorageKey = "mybuddy-capability-grants";
let providerAvailability = new Map<ProviderKind, ProviderAvailability>();
const capabilityLabels: Record<TakeoverCapability, string> = {
  "notepad-story": "Write a bounded story in a new Notepad++ tab",
};
const capabilityApprovalActions: Record<TakeoverCapability, string> = {
  "notepad-story": "approve_notepad_story",
};

const detector = new PatternDetector({ switchThreshold: 4, windowSeconds: 75, dwellSeconds: 45 });
const privacy = createDefaultPrivacyPolicy();
let expanded = false;
let paused = false;
let analyzing = false;
let lastIdentity = "";
let latestSnapshot: WindowSnapshot | null = null;
let latestContextTarget: WindowContextTarget | null = null;
let pendingComputerUseApproval: ComputerUseApproval | null = null;
let pendingAgentToolApproval: PendingAgentToolApproval | null = null;
const conversationContext = new ConversationContext(8);
const requestLifecycle = new RequestLifecycle();
let requestCounter = 0;
let snoozedUntil = 0;
let lastSuggestionAt = 0;
let qwenOnline = false;

const statusCard = (): CardPayload => ({
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  type: "AdaptiveCard",
  version: "1.5",
  body: [
    {
      type: "TextBlock",
      text: paused ? "Observation paused" : "Quietly observing",
      size: "Large",
      weight: "Bolder",
      wrap: true,
    },
    {
      type: "TextBlock",
      text: paused
        ? "No window metadata is being collected. Resume whenever you are ready."
        : "I watch active-window changes locally and only call the selected model provider when a pattern may be useful.",
      wrap: true,
      isSubtle: true,
      spacing: "Small",
    },
    {
      type: "Container",
      style: "emphasis",
      spacing: "Medium",
      items: [
        {
          type: "FactSet",
          facts: [
            { title: "Capture", value: "Window title + app name" },
            { title: "Screenshots", value: "Off" },
            { title: "Control", value: "Allowlisted + explicit approval" },
            { title: "Reasoning", value: qwenOnline ? "Selected model provider ready" : "Rules fallback" },
          ],
        },
      ],
    },
  ],
  actions: [
    { type: "Action.Submit", title: "Analyze current work", style: "positive", data: { action: "analyze_now" } },
    { type: "Action.Submit", title: paused ? "Resume" : "Pause", data: { action: "pause_toggle" } },
    { type: "Action.Submit", title: "Show mock suggestion", data: { action: "show_demo" } },
  ],
});

const detailCard = (suggestion: Suggestion): CardPayload => ({
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  type: "AdaptiveCard",
  version: "1.5",
  body: [
    { type: "TextBlock", text: suggestion.title, size: "Large", weight: "Bolder", wrap: true },
    { type: "TextBlock", text: suggestion.message, wrap: true, spacing: "Medium" },
    {
      type: "TextBlock",
      text: "A useful next move: write down the exact outcome you expect, then compare only the next observable result against it. This breaks the editor/documentation loop without taking control away from you.",
      wrap: true,
      spacing: "Medium",
    },
    { type: "TextBlock", text: "Was this useful?", weight: "Bolder", spacing: "Large" },
  ],
  actions: [
    { type: "Action.Submit", title: "Helpful", style: "positive", data: { action: "feedback_helpful" } },
    { type: "Action.Submit", title: "Not useful", data: { action: "feedback_unhelpful" } },
    { type: "Action.Submit", title: "Back", data: { action: "back_status" } },
  ],
});

const takeoverPreviewCard = (): CardPayload => ({
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  type: "AdaptiveCard",
  version: "1.5",
  body: [
    { type: "TextBlock", text: "Takeover preview", size: "Large", weight: "Bolder" },
    {
      type: "TextBlock",
      text: "Type the specific outcome you want. MyBuddy will show the exact goal and application, then wait for your one-time Computer Use approval before acting.",
      wrap: true,
      spacing: "Small",
    },
    {
      type: "Container",
      style: "emphasis",
      spacing: "Medium",
      items: [
        { type: "TextBlock", text: "1. Inspect the current app's semantic controls", wrap: true },
        { type: "TextBlock", text: "2. Show the requested goal and scope", wrap: true },
        { type: "TextBlock", text: "3. Wait for your explicit Yes", wrap: true },
        { type: "TextBlock", text: "4. Act one verified step at a time", wrap: true },
      ],
    },
    {
      type: "TextBlock",
      text: "Scope: preview only · Target: current app · Expires: immediately",
      wrap: true,
      size: "Small",
      isSubtle: true,
    },
  ],
  actions: [{ type: "Action.Submit", title: "Back", data: { action: "back_status" } }],
});

function recordEvent(type: string, detail: Record<string, unknown> = {}): void {
  const at = new Date().toISOString();
  const existing = JSON.parse(localStorage.getItem("ambient-agent-events") ?? "[]") as unknown[];
  existing.push({ at, type, ...detail });
  localStorage.setItem("ambient-agent-events", JSON.stringify(existing.slice(-100)));
  void invoke("append_diagnostic_log", { at, event: type, detail }).catch(() => undefined);
}

function nextRequestId(): string {
  requestCounter += 1;
  return `request-${Date.now().toString(36)}-${requestCounter}`;
}

function renderActivityLog(): void {
  activityLog.replaceChildren(...requestLifecycle.entries().map((entry) => {
    const item = document.createElement("li");
    const time = document.createElement("time");
    time.dateTime = new Date(entry.at).toISOString();
    time.textContent = new Date(entry.at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const message = document.createElement("span");
    message.textContent = entry.message;
    item.dataset.state = entry.state;
    item.append(time, message);
    return item;
  }));
  activityPanel.scrollTop = activityPanel.scrollHeight;
}

function updateRequestProgress(
  requestId: string,
  message: string,
  state: "working" | "cancelled" | "completed" | "failed" = "working",
): void {
  requestLifecycle.update(requestId, message, state);
  renderActivityLog();
}

async function cancelCurrentRequest(): Promise<void> {
  const requestId = requestLifecycle.activeRequestId();
  if (!requestId || !requestLifecycle.cancel(requestId)) return;
  cancelRequestButton.disabled = true;
  cancelRequestButton.textContent = "Stopping…";
  modeLabel.textContent = "Stopping selected AI agent…";
  renderActivityLog();
  recordEvent("provider-cancel-requested", { requestId });
  try {
    const result = await invoke<ProviderCancellationResult>("cancel_provider_request", { requestId });
    updateRequestProgress(
      requestId,
      result.cancelled ? "Selected agent process stopped" : "Request had already finished",
      "cancelled",
    );
    recordEvent("provider-cancel-completed", {
      requestId,
      cancelled: result.cancelled,
      confirmed: true,
    });
    modeLabel.textContent = result.cancelled ? "Request cancelled" : "Request was already finishing";
  } catch {
    updateRequestProgress(requestId, "Cancellation could not be confirmed", "failed");
    recordEvent("provider-cancel-completed", {
      requestId,
      cancelled: false,
      confirmed: false,
    });
    modeLabel.textContent = "Request cancelled locally; provider stop was not confirmed";
  } finally {
    await cancelThinking(requestId);
    cancelRequestButton.hidden = true;
    cancelRequestButton.disabled = false;
    cancelRequestButton.textContent = "Cancel";
    messageInput.disabled = false;
    messageSend.disabled = false;
    clearConversationButton.disabled = false;
    clearConversationButton.hidden = false;
    messageInput.focus();
  }
}

function loadCapabilityGrants(): CapabilityGrant[] {
  return parseCapabilityGrants(localStorage.getItem(capabilityGrantStorageKey));
}

function saveCapabilityGrants(grants: readonly CapabilityGrant[]): void {
  localStorage.setItem(capabilityGrantStorageKey, JSON.stringify(grants));
}

function renderCapabilityGrantSettings(): void {
  const grants = loadCapabilityGrants();
  capabilityGrantList.replaceChildren();
  if (grants.length === 0) {
    const empty = document.createElement("p");
    empty.className = "settings-empty";
    empty.textContent = "No actions are always allowed.";
    capabilityGrantList.append(empty);
    return;
  }
  for (const grant of grants) {
    const row = document.createElement("div");
    row.className = "capability-grant-row";
    const summary = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = capabilityLabels[grant.capability];
    const detail = document.createElement("small");
    detail.textContent = `Allowed ${new Date(grant.grantedAt).toLocaleString()} · used ${grant.useCount} time${grant.useCount === 1 ? "" : "s"}${grant.lastUsedAt ? ` · last ${new Date(grant.lastUsedAt).toLocaleString()}` : ""}`;
    summary.append(title, detail);
    const revoke = document.createElement("button");
    revoke.type = "button";
    revoke.textContent = "Revoke";
    revoke.addEventListener("click", () => {
      saveCapabilityGrants(revokeCapability(loadCapabilityGrants(), grant.capability));
      recordEvent("capability-grant-revoked", { capability: grant.capability });
      renderCapabilityGrantSettings();
    });
    row.append(summary, revoke);
    capabilityGrantList.append(row);
  }
}

function decodeInlinePng(url: string): number[] {
  const prefix = "data:image/png;base64,";
  if (!url.startsWith(prefix)) throw new Error("Bundled avatar is not an inline PNG.");
  const binary = atob(url.slice(prefix.length));
  return Array.from(binary, (character) => character.charCodeAt(0));
}

async function applyOrbAvatar(id: string, persist: boolean): Promise<void> {
  const avatar = findOrbAvatar(id);
  let url: string;
  try {
    url = await avatar.loadUrl();
  } catch (error) {
    recordEvent("orb-avatar-apply-failed", { stage: "bundle-load" });
    throw error;
  }

  let bytes: number[];
  try {
    bytes = decodeInlinePng(url);
  } catch (error) {
    recordEvent("orb-avatar-apply-failed", { stage: "decode" });
    throw error;
  }

  try {
    await invoke("set_orb_avatar", { avatarId: avatar.id, bytes });
  } catch (error) {
    recordEvent("orb-avatar-apply-failed", { stage: "native-invoke" });
    throw error;
  }
  avatarSelect.value = avatar.id;
  avatarPreview.src = url;
  if (persist) localStorage.setItem("mybuddy-orb-avatar", avatar.id);
  recordEvent("orb-avatar-selected", { avatarId: avatar.id });
}

async function applyTransientOrbImage(avatarId: string, url: string): Promise<void> {
  await invoke("set_orb_avatar", { avatarId, bytes: decodeInlinePng(url) });
}

const thinkingOrb = new ThinkingOrbController(
  () => applyTransientOrbImage("thinking-green-question", thinkingAvatarUrl),
  () => applyOrbAvatar(localStorage.getItem("mybuddy-orb-avatar") ?? defaultAvatarId, false),
);

async function beginThinking(owner = "default"): Promise<void> {
  statusDot.classList.add("thinking");
  await thinkingOrb.begin(owner).catch(() => {
    recordEvent("orb-avatar-apply-failed", { stage: "thinking" });
  });
}

async function endThinking(owner = "default"): Promise<void> {
  await thinkingOrb.end(owner).catch(() => {
    recordEvent("orb-avatar-apply-failed", { stage: "restore-selected" });
  });
  statusDot.classList.toggle("thinking", thinkingOrb.isThinking());
}

async function cancelThinking(owner: string): Promise<void> {
  await thinkingOrb.cancel(owner).catch(() => {
    recordEvent("orb-avatar-apply-failed", { stage: "cancel-restore" });
  });
  statusDot.classList.toggle("thinking", thinkingOrb.isThinking());
}

function initializeAvatarSettings(): string {
  const selected = localStorage.getItem("mybuddy-orb-avatar") ?? defaultAvatarId;
  for (const avatar of orbAvatars) {
    const option = document.createElement("option");
    option.value = avatar.id;
    option.textContent = avatar.displayName;
    avatarSelect.append(option);
  }
  const avatar = findOrbAvatar(selected);
  avatarSelect.value = avatar.id;
  return avatar.id;
}

function syncProviderControls(): void {
  const httpProvider = providerSelect.value === "lm-studio" || providerSelect.value === "openai-compatible";
  providerEndpoint.disabled = !httpProvider;
  providerChatModel.disabled = !httpProvider;
  providerAnalysisModel.disabled = !httpProvider;
  providerApiKey.disabled = providerSelect.value !== "openai-compatible";
  const availability = providerAvailability.get(providerSelect.value as ProviderKind);
  providerSaveTest.disabled = availability?.installed === false;
}

async function loadProviderSettings(): Promise<void> {
  const [settings, availability] = await Promise.all([
    invoke<ProviderSettingsView>("get_provider_settings"),
    invoke<ProviderAvailability[]>("get_provider_availability"),
  ]);
  providerAvailability = new Map(availability.map((entry) => [entry.provider, entry]));
  providerAvailabilityLabel.textContent = availability
    .map((entry) => entry.installed ? `${entry.displayName} ${entry.version ?? "installed"}` : `${entry.displayName} not detected`)
    .join(" · ");
  for (const option of providerSelect.options) {
    const entry = providerAvailability.get(option.value as ProviderKind);
    if (!entry) continue;
    option.disabled = !entry.installed;
    option.textContent = entry.installed
      ? `${entry.displayName} — ${entry.version ?? "installed"}`
      : `${entry.displayName} — not detected`;
  }
  providerSelect.value = settings.provider;
  providerEndpoint.value = settings.endpoint;
  providerChatModel.value = settings.chatModel;
  providerAnalysisModel.value = settings.analysisModel;
  providerApiKey.value = "";
  providerApiKey.placeholder = settings.apiKeyConfigured
    ? "A key is stored in Windows Credential Manager"
    : "Optional for endpoints that do not require a key";
  providerTestResult.textContent = "";
  syncProviderControls();
}

async function saveAndTestProvider(): Promise<void> {
  providerSaveTest.disabled = true;
  providerTestResult.textContent = "Saving and testing provider…";
  try {
    const settings = {
      provider: providerSelect.value as ProviderKind,
      endpoint: providerEndpoint.value,
      chatModel: providerChatModel.value,
      analysisModel: providerAnalysisModel.value,
    };
    const apiKey = providerApiKey.value.trim() || null;
    const result = await invoke<ProviderTestResult>("save_and_test_provider", { settings, apiKey });
    providerApiKey.value = "";
    providerTestResult.textContent = result.message;
    qwenOnline = result.success;
    runtimeLabel.textContent = result.success ? "Model provider ready" : "Rules fallback · provider offline";
    statusDot.classList.toggle("offline", !result.success);
    recordEvent("provider-test", { provider: result.provider, success: result.success });
  } catch (error) {
    providerTestResult.textContent = String(error);
    recordEvent("provider-test", { success: false, errorClass: "settings-or-connection" });
  } finally {
    providerSaveTest.disabled = false;
  }
}

function renderCard(payload: CardPayload, context?: Suggestion): void {
  cardHost.replaceChildren();
  const card = new AdaptiveCards.AdaptiveCard();
  card.hostConfig = new AdaptiveCards.HostConfig({
    actions: {
      actionsOrientation: "vertical",
      actionAlignment: "stretch",
      allowTitleToWrap: true,
      buttonSpacing: 8,
    },
  });
  card.onExecuteAction = (action) => {
    const data = (action as AdaptiveCards.SubmitAction).data as
      | { action?: string; request?: string; capability?: string; speed?: string }
      | undefined;
    void handleCardAction(data?.action ?? "", context, data?.request ?? data?.capability, data?.speed);
  };
  card.parse(payload);
  const rendered = card.render();
  if (rendered) cardHost.append(rendered);
}

function clearCardForNewRequest(): void {
  cardHost.replaceChildren();
  modeLabel.textContent = "Selected AI agent is working…";
}

function clearConversation(): void {
  if (requestLifecycle.activeRequestId()) return;
  conversationContext.clear();
  pendingComputerUseApproval = null;
  pendingAgentToolApproval = null;
  messageInput.value = "";
  renderCard(statusCard());
  modeLabel.textContent = "New conversation";
  recordEvent("conversation-cleared", {});
  messageInput.focus();
}

async function executeFixedCapability(capability: TakeoverCapability): Promise<void> {
  await handleCardAction(capabilityApprovalActions[capability]);
}

async function useRememberedCapability(capability: TakeoverCapability): Promise<void> {
  const usedAt = new Date().toISOString();
  saveCapabilityGrants(recordCapabilityUse(loadCapabilityGrants(), capability, usedAt));
  recordEvent("capability-grant-used", { capability, usedAt });
  await executeFixedCapability(capability);
}

async function analyzeWindowContext(request: string, requestId?: string): Promise<void> {
  if (!latestSnapshot || !latestContextTarget) {
    renderCard(questionAnswerCard(
      request,
      "I do not have an exact privacy-approved prior window to inspect. Return to the terminal and try again, or paste the error or script here.",
      "window-context-unavailable",
    ));
    modeLabel.textContent = "No exact window available";
    return;
  }
  if (!privacy.evaluate(latestSnapshot).allowed) {
    recordEvent("privacy-block", { reason: "window-context" });
    renderCard(questionAnswerCard(
      request,
      "Current-window analysis is blocked by the privacy policy. No window content was read.",
      "window-context-unavailable",
    ));
    modeLabel.textContent = "Window analysis blocked by privacy policy";
    return;
  }
  modeLabel.textContent = "Reading the approved visible window text…";
  await beginThinking(requestId);
  try {
    const context = await invoke<WindowTextContext>("get_window_text_context", {
      target: latestContextTarget,
    });
    if (context.source !== "accessibility-visible-text") {
      throw new Error("Unsupported window-context source");
    }
    const prompt = buildWindowContextPrompt(request, context);
    const answer = await invoke<string>("ask_qwen", { question: prompt, requestId });
    if (!answer.trim()) throw new Error("Selected model provider returned an empty answer");
    renderCard(questionAnswerCard(request, answer.trim(), "local-qwen-window-context"));
    recordEvent("window-context-analyzed", {
      processName: context.processName,
      characterCount: context.text.length,
      truncated: context.truncated,
      source: "accessibility-visible-text",
    });
    modeLabel.textContent = "Answered from bounded visible-window text";
  } catch {
    recordEvent("window-context-error", { kind: "capture-or-model-failed" });
    renderCard(questionAnswerCard(
      request,
      "I could not read usable visible text from that exact window. Paste the error or script here and I can still help.",
      "window-context-unavailable",
    ));
    modeLabel.textContent = "Window text unavailable";
  } finally {
    await endThinking(requestId);
  }
}

async function submitUserRequest(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const request = messageInput.value.trim();
  if (!request) return;
  const requestId = nextRequestId();

  const priorConversation = conversationContext.history();
  const requestClass = classifyUserRequest(request);
  conversationContext.remember("user", request);
  pendingComputerUseApproval = null;
  pendingAgentToolApproval = null;
  recordEvent("user-request", { requestId, requestClass, provider: providerSelect.value });
  messageInput.value = "";
  messageInput.disabled = true;
  messageSend.disabled = true;
  clearConversationButton.disabled = true;
  clearConversationButton.hidden = true;
  cancelRequestButton.hidden = false;
  cancelRequestButton.disabled = false;
  cancelRequestButton.textContent = "Cancel";
  requestLifecycle.start(requestId, "Request received");
  renderActivityLog();
  clearCardForNewRequest();
  const windowContextAction = latestContextTarget && shouldOfferWindowContext(request, latestSnapshot)
    ? { title: "Analyze current terminal" }
    : undefined;

  try {
    if (shouldPassThroughToSelectedAgent(providerSelect.value, requestClass)) {
      modeLabel.textContent = "Sending request directly to selected AI agent…";
      await beginThinking(requestId);
      try {
        const answer = await invoke<string>("ask_qwen", {
          question: request,
          conversation: priorConversation,
          requestId,
        });
        if (!requestLifecycle.acceptsResult(requestId)) return;
        qwenOnline = true;
        conversationContext.remember("assistant", answer.trim());
        renderCard(questionAnswerCard(request, answer.trim(), "agent-passthrough", windowContextAction));
        modeLabel.textContent = "Answered directly by selected AI agent";
        const answerQuality = inspectAnswerQuality(answer);
        recordEvent("agent-answer-quality", {
          length: answerQuality.length,
          capabilityRefusal: answerQuality.capabilityRefusal,
          listItemCount: answerQuality.listItemCount,
        });
        recordEvent("agent-turn-completed", {
          mode: "agent-passthrough",
          provider: providerSelect.value,
        });
      } finally {
        await endThinking(requestId);
      }
      return;
    }

    await beginThinking(requestId);
    try {
      const agentResult = await executeAgentTurn(
        request,
        (turn) => invoke<AgentStep>("plan_agent_step", { turn, requestId }),
        createAgentTools(
          (command, argumentsValue) => invoke(command, argumentsValue),
          {
            getActiveWindow: () => latestSnapshot && privacy.evaluate(latestSnapshot).allowed
              ? latestSnapshot
              : { available: false },
          },
        ),
        priorConversation,
      );
      if (!requestLifecycle.acceptsResult(requestId)) return;
      if (agentResult.kind === "final") {
        qwenOnline = true;
        conversationContext.remember("assistant", agentResult.answer);
        renderCard(questionAnswerCard(request, agentResult.answer, "agent-runtime", windowContextAction));
        modeLabel.textContent = "Answered by selected AI agent";
        recordEvent("agent-turn-completed", { mode: "agent-first" });
        return;
      }
      if (agentResult.kind === "approval-required") {
        pendingAgentToolApproval = {
          request,
          toolId: agentResult.toolId,
          arguments: agentResult.arguments,
          reason: agentResult.reason,
        };
        renderCard(agentToolApprovalCard(
          request,
          agentResult.toolId,
          agentResult.arguments,
          agentResult.reason,
        ));
        modeLabel.textContent = "Selected AI agent · waiting for one-time approval";
        recordEvent("agent-tool-approval-requested", {
          toolId: agentResult.toolId,
          risk: agentResult.risk,
        });
        return;
      }
      recordEvent("agent-turn-fallback", {
        kind: agentResult.kind,
        reason: agentResult.kind === "stopped" ? agentResult.reason : "approval-tool-not-migrated",
      });
    } catch (error) {
      if (!requestLifecycle.acceptsResult(requestId)) return;
      recordEvent("agent-turn-fallback", {
        kind: "planner-or-tool-error",
        errorMessage: String(error).slice(0, 300),
      });
    } finally {
      await endThinking(requestId);
    }

    if (requestClass === "active-window-status") {
      if (!latestSnapshot || !privacy.evaluate(latestSnapshot).allowed) {
        renderCard(questionAnswerCard(
          request,
          "I do not have a privacy-approved foreground window to report yet.",
          "window-context-unavailable",
        ));
        modeLabel.textContent = "No approved active-window metadata available";
        return;
      }
      renderCard(questionAnswerCard(
        request,
        formatActiveWindowStatus(latestSnapshot),
        "desktop-metadata",
      ));
      modeLabel.textContent = "Answered from local active-window metadata";
      recordEvent("desktop-state-answer", { kind: "active-window" });
      return;
    }

    if (requestClass === "running-app-status") {
      const application = extractRunningAppQuery(request);
      if (!application) {
        renderCard(questionAnswerCard(
          request,
          "I could not identify the application name to check.",
          "window-context-unavailable",
        ));
        modeLabel.textContent = "Application name unavailable";
        return;
      }
      try {
        const status = await invoke<RunningAppStatus>("get_running_app_status", {
          query: application,
        });
        renderCard(questionAnswerCard(
          request,
          formatRunningAppStatus(application, status.running),
          "desktop-metadata",
        ));
        modeLabel.textContent = "Answered from local running-process metadata";
        recordEvent("desktop-state-answer", { kind: "running-app", running: status.running });
      } catch {
        renderCard(questionAnswerCard(
          request,
          "I could not read the local running-process list.",
          "window-context-unavailable",
        ));
        modeLabel.textContent = "Running-process metadata unavailable";
      }
      return;
    }

    if (requestClass === "running-services-status") {
      try {
        const status = await invoke<RunningServicesStatus>("get_running_services_status");
        renderCard(questionAnswerCard(
          request,
          formatRunningServicesStatus(status.services),
          "desktop-metadata",
        ));
        modeLabel.textContent = "Answered from local Windows service metadata";
        recordEvent("desktop-state-answer", {
          kind: "running-services",
          count: status.services.length,
        });
      } catch {
        renderCard(questionAnswerCard(
          request,
          "I could not read the local Windows service list.",
          "window-context-unavailable",
        ));
        modeLabel.textContent = "Windows service metadata unavailable";
      }
      return;
    }

    if (requestClass === "top-memory-application-status") {
      try {
        const localPlan = resolveLocalAnswerPlan(request);
        const limit = localPlan?.limit ?? extractTopMemoryApplicationLimit(request);
        const status = await invoke<TopMemoryApplicationsStatus>("get_top_memory_applications_status", {
          limit,
        });
        renderCard(questionAnswerCard(
          request,
          formatTopMemoryApplicationStatus(
            status.applications,
            localPlan?.interpretedBroadResources ?? false,
          ),
          "desktop-metadata",
        ));
        modeLabel.textContent = "Answered from local process-memory metadata";
        recordEvent("desktop-state-answer", {
          kind: "top-memory-application",
          applicationCount: status.applications.length,
        });
      } catch {
        renderCard(questionAnswerCard(
          request,
          "I could not read the local application memory data.",
          "window-context-unavailable",
        ));
        modeLabel.textContent = "Application memory metadata unavailable";
      }
      return;
    }

    if (requestClass === "largest-files-status") {
      const plan = resolveLargestFilesPlan(request);
      if (!plan) return;
      try {
        const status = await invoke<LargestFilesStatus>("get_largest_files_status", {
          path: plan.path,
          limit: plan.limit,
        });
        renderCard(questionAnswerCard(
          request,
          formatLargestFilesStatus(status.requestedPath, status.resolvedPath, status.corrected, status.files, status.truncated),
          "desktop-metadata",
        ));
        modeLabel.textContent = "Answered from local file metadata";
      } catch (error) {
        renderCard(questionAnswerCard(request, String(error), "window-context-unavailable"));
        modeLabel.textContent = "Local file metadata unavailable";
      }
      return;
    }

    if (requestClass === "show-file-open-guidance") {
      if (!latestSnapshot || !latestContextTarget || !privacy.evaluate(latestSnapshot).allowed) {
        recordEvent("file-open-guidance-error", { kind: "context-or-model-unavailable" });
        renderCard(fileOpenGuidanceUnavailableCard(request, latestSnapshot, false));
        modeLabel.textContent = "Click instructions unavailable";
        return;
      }
      modeLabel.textContent = "Inspecting the current app for click instructions…";
      let guidance: ComputerUseGuidance;
      await beginThinking(requestId);
      try {
        guidance = await invoke<ComputerUseGuidance>("plan_computer_use_guidance", {
          target: latestContextTarget,
          goal: "Explain how to open a file using the current application's visible controls",
        });
      } catch {
        recordEvent("file-open-guidance-error", { kind: "state-or-structured-planner-failed" });
        pendingComputerUseApproval = captureComputerUseApproval(
          latestSnapshot,
          latestContextTarget,
          "Open the current application's file picker and stop before selecting a file",
        );
        renderCard(fileOpenGuidanceUnavailableCard(request, latestSnapshot));
        modeLabel.textContent = "Verified instructions unavailable · Computer Use optional";
        return;
      } finally {
        await endThinking(requestId);
      }
      renderCard(fileOpenGuidanceCard(request, latestSnapshot, guidance.steps));
      pendingComputerUseApproval = captureComputerUseApproval(
        latestSnapshot,
        latestContextTarget,
        "Open the current application's file picker and stop before selecting a file",
      );
      modeLabel.textContent = "Showing click-by-click instructions";
      recordEvent("file-open-guidance-shown", {
        processName: latestSnapshot?.processName ?? "unknown",
      });
      return;
    }

    if (requestClass === "takeover-preview") {
      const fixedCapability = resolveTakeoverCapability(request);
      pendingComputerUseApproval = !fixedCapability && latestSnapshot && latestContextTarget && privacy.evaluate(latestSnapshot).allowed
        ? captureComputerUseApproval(latestSnapshot, latestContextTarget, request)
        : null;
      modeLabel.textContent = fixedCapability
        ? "Bounded action · waiting for approval"
        : "Computer Use goal · waiting for approval";
      renderCard(takeoverRequestCard(request, fixedCapability));
      recordEvent("takeover-preview-rendered", {
        capability: fixedCapability ?? "current-app-computer-use",
      });
      return;
    }

    const utilityAnswer = answerLocalUtility(request);
    if (utilityAnswer) {
      renderCard(questionAnswerCard(request, utilityAnswer, "in-process"));
      modeLabel.textContent = "Answered locally · no helper process";
      recordEvent("local-utility-answer", { utility: "current-time", process: "in-process" });
      return;
    }

    if (requestsCurrentWindowContext(request)) {
      await analyzeWindowContext(request, requestId);
      return;
    }

    modeLabel.textContent = "Asking selected model provider…";
    await beginThinking(requestId);
    const answer = await invoke<string>("ask_qwen", {
      question: request,
      conversation: priorConversation,
      requestId,
    });
    if (!requestLifecycle.acceptsResult(requestId)) return;
    qwenOnline = true;
    renderCard(questionAnswerCard(request, answer.trim(), "local-qwen", windowContextAction));
    modeLabel.textContent = "Answered locally";
  } catch {
    if (!requestLifecycle.acceptsResult(requestId)) return;
    recordEvent("qwen-question-error", { kind: "request-failed" });
    renderCard(
      questionAnswerCard(
        request,
        "Selected model provider could not answer that request. No provider fallback or screen action was attempted.",
        "local-qwen",
        windowContextAction,
      ),
    );
    modeLabel.textContent = "Local answer unavailable";
  } finally {
    if (requestLifecycle.acceptsResult(requestId)) {
      requestLifecycle.finish(requestId, "completed", "Request finished");
      renderActivityLog();
    }
    await endThinking(requestId);
    if (requestLifecycle.activeRequestId() === null) {
      cancelRequestButton.hidden = true;
      cancelRequestButton.disabled = false;
      cancelRequestButton.textContent = "Cancel";
      messageInput.disabled = false;
      messageSend.disabled = false;
      clearConversationButton.disabled = false;
      clearConversationButton.hidden = false;
      messageInput.focus();
    }
  }
}

async function setExpanded(next: boolean, activate = false): Promise<void> {
  const actualVisibility = await invoke<boolean>("set_agent_surface", { visible: next, activate });
  if (actualVisibility !== next) throw new Error(`Panel visibility mismatch: expected ${next}`);
  expanded = actualVisibility;
  recordEvent(next ? "surface-shown" : "surface-hidden", { mode: "standard-window" });
  if (next) renderCard(statusCard());
}

async function togglePanelFromOrb(): Promise<void> {
  const state = await invoke<AgentSurfaceState>("get_agent_surface_state");
  const action = orbClickSurfaceAction(state);
  if (action === "show") {
    await setExpanded(true, true);
    return;
  }
  if (action === "focus") {
    const visible = await invoke<boolean>("set_agent_surface", { visible: true, activate: true });
    if (!visible) throw new Error("Panel focus returned with the panel hidden.");
    expanded = true;
    recordEvent("surface-foregrounded", { source: "orb-click" });
    return;
  }
  await setExpanded(false, false);
}

async function minimizePanelToOrb(source: "panel-control" | "smoke"): Promise<void> {
  try {
    await setExpanded(false);
  } catch {
    modeLabel.textContent = "Could not minimize panel";
    recordEvent("surface-hide-failed", { source });
  }
}

async function setPaused(next: boolean): Promise<void> {
  paused = next;
  modeLabel.textContent = paused ? "Paused" : "Suggestion prototype";
  statusDot.classList.toggle("paused", paused);
  recordEvent(paused ? "paused" : "resumed");
  const shouldRemainVisible = surfaceVisibilityAfterPause(paused, expanded);
  if (!shouldRemainVisible) {
    await setExpanded(false);
  } else if (expanded) {
    renderCard(statusCard());
  }
}

function mockSuggestion(snapshot: WindowSnapshot | null = latestSnapshot): Suggestion {
  return {
    title: "You may be circling the same step",
    message: "I noticed repeated movement between two work contexts. Want a focused next-step hint?",
    confidence: 0.76,
    source: "local-fallback",
    observedProcess: snapshot?.processName ?? "Demo workspace",
    observedWindow: snapshot?.title ?? "Mock scenario",
  };
}

async function displaySuggestion(
  suggestion: Suggestion,
  trigger: SuggestionTrigger,
): Promise<void> {
  const surface = suggestionSurfaceRequest(trigger);
  renderCard(buildSuggestionCard(suggestion), suggestion);
  const actualVisibility = await invoke<boolean>("set_agent_surface", surface);
  if (!actualVisibility) throw new Error("Suggestion panel did not become visible.");
  expanded = true;
  recordEvent("surface-shown", {
    mode: trigger === "automatic" ? "automatic-no-activate" : "explicit",
  });
}

async function analyze(
  candidate: InterventionCandidate,
  trigger: SuggestionTrigger,
): Promise<void> {
  if (analyzing || Date.now() < snoozedUntil) return;
  analyzing = true;
  await beginThinking();
  runtimeLabel.textContent = qwenOnline ? "Selected model provider is thinking…" : "Using local fallback";

  try {
    let suggestion = mockSuggestion(candidate.observations[candidate.observations.length - 1]);
    if (qwenOnline) {
      try {
        const raw = await invoke<string>("analyze_with_qwen", { prompt: buildEpisodePrompt(candidate) });
        const parsed = parseSuggestionResponse(raw);
        const observed = candidate.observations[candidate.observations.length - 1];
        suggestion = {
          ...parsed,
          source: "qwen",
          observedProcess: observed.processName,
          observedWindow: observed.title,
        };
      } catch (error) {
        qwenOnline = false;
        runtimeLabel.textContent = "Model provider unavailable · rules fallback";
        recordEvent("qwen-error", { message: String(error) });
      }
    }
    lastSuggestionAt = Date.now();
    recordEvent("suggestion", { source: suggestion.source, confidence: suggestion.confidence });
    await displaySuggestion(suggestion, trigger);
  } finally {
    await endThinking();
    runtimeLabel.textContent = qwenOnline ? "Selected model provider" : "Local rules fallback";
    analyzing = false;
  }
}

async function analyzeCurrentWork(): Promise<void> {
  if (!latestSnapshot) {
    try {
      const native = await invoke<NativeWindowSnapshot>("get_active_window_snapshot");
      latestSnapshot = { processName: native.processName, title: native.title, observedAt: new Date().toISOString() };
    } catch {
      latestSnapshot = { processName: "Unknown", title: "Current work", observedAt: new Date().toISOString() };
    }
  }

  const candidate = buildManualAnalysisCandidate(latestSnapshot, privacy);
  if (!candidate) {
    modeLabel.textContent = "Analysis blocked by privacy policy";
    statusDot.classList.add("blocked");
    recordEvent("privacy-block", { reason: "manual-analysis" });
    return;
  }
  await analyze(candidate, "explicit");
}

async function handleCardAction(
  action: string,
  suggestion?: Suggestion,
  requestedCapability?: string,
  requestedSpeed?: string,
): Promise<void> {
  recordEvent("card-action", { action });
  switch (action) {
    case "approve_agent_tool": {
      const approval = pendingAgentToolApproval;
      pendingAgentToolApproval = null;
      if (!approval) {
        renderCard(agentToolResultCard(false, "The one-time approval expired or was already used. No action ran."));
        modeLabel.textContent = "Agent action stopped safely";
        break;
      }
      const tool = createAgentTools((command, argumentsValue) => invoke(command, argumentsValue))
        .find((candidate) => candidate.id === approval.toolId);
      if (!tool || tool.risk === "read-only") {
        renderCard(agentToolResultCard(false, "The approved tool is no longer registered as a consequential action. No action ran."));
        modeLabel.textContent = "Agent action stopped safely";
        break;
      }
      modeLabel.textContent = "Selected AI agent · executing approved background action…";
      await beginThinking();
      try {
        const result = await tool.execute(approval.arguments) as ProcessTerminationResult | TakeoverExecutionResult;
        if (approval.toolId === "desktop.visual_workflow" && result.verified && "application" in result) {
          conversationContext.markPreparedApplication(result.application);
          conversationContext.remember("assistant", result.message);
        }
        renderCard(agentToolResultCard(result.verified, result.message));
        modeLabel.textContent = result.verified
          ? "Agent action verified · scope ended"
          : "Agent action could not be verified";
        recordEvent("agent-tool-result", {
          toolId: approval.toolId,
          verified: result.verified,
          ...("matchedCount" in result ? {
            matchedCount: result.matchedCount,
            terminatedCount: result.terminatedCount,
          } : {
            application: result.application,
            action: result.action,
          }),
        });
      } catch (error) {
        renderCard(agentToolResultCard(false, String(error)));
        modeLabel.textContent = "Agent action failed safely";
        recordEvent("agent-tool-result", {
          toolId: approval.toolId,
          verified: false,
          errorMessage: String(error).slice(0, 300),
        });
      } finally {
        await endThinking();
      }
      break;
    }
    case "analyze_now":
      await analyzeCurrentWork();
      break;
    case "analyze_current_window":
      await analyzeWindowContext(requestedCapability ?? "Help me understand the current window.");
      break;
    case "pause_toggle":
      await setPaused(!paused);
      break;
    case "show_demo": {
      const demo = mockSuggestion();
      renderCard(buildSuggestionCard(demo), demo);
      break;
    }
    case "hint":
      renderCard(detailCard(suggestion ?? mockSuggestion()), suggestion);
      break;
    case "preview_takeover":
      renderCard(takeoverPreviewCard());
      break;
    case "start_computer_use_demo": {
      const approval = pendingComputerUseApproval;
      pendingComputerUseApproval = null;
      const requestedGoal = requestedCapability?.trim().slice(0, 500) ?? "";
      const speed = requestedSpeed === "slow" ? "slow" : "normal";
      if (!approval || !privacy.evaluate(approval.snapshot).allowed || requestedGoal !== approval.goal) {
        recordEvent("autohotkey-demo-result", { verified: false, reason: "approval-or-target-mismatch" });
        renderCard(takeoverResultCard(
          false,
          "The exact inspected application or approved demonstration goal changed. AutoHotkey did not run.",
          approval?.snapshot.processName ?? "Current application",
        ));
        modeLabel.textContent = "Demonstration stopped safely";
        break;
      }
      modeLabel.textContent = `Visible demonstration · ${speed} speed`;
      renderCard(demonstrationRunningCard(approval.snapshot.processName, speed));
      await beginThinking();
      try {
        const result = await invoke<TakeoverExecutionResult>("execute_autohotkey_demo", {
          target: approval.target,
          goal: approval.goal,
          speed,
        });
        recordEvent("autohotkey-demo-result", {
          verified: result.verified,
          processName: approval.snapshot.processName,
          speed,
        });
        renderCard(takeoverResultCard(result.verified, result.message, result.application));
        modeLabel.textContent = result.verified
          ? "Visible demonstration verified · scope ended"
          : "Demonstration stopped safely";
      } catch {
        recordEvent("autohotkey-demo-result", {
          verified: false,
          processName: approval.snapshot.processName,
          speed,
        });
        renderCard(takeoverResultCard(
          false,
          "The visible AutoHotkey demonstration could not complete and verify the approved goal. It stopped without selecting a file.",
          approval.snapshot.processName,
        ));
        modeLabel.textContent = "Demonstration stopped safely";
      } finally {
        await endThinking();
      }
      break;
    }
    case "cancel_autohotkey_demo":
      modeLabel.textContent = "Stopping visible demonstration…";
      await invoke("cancel_autohotkey_demo");
      break;
    case "request_computer_use": {
      const approval = pendingComputerUseApproval;
      pendingComputerUseApproval = null;
      const requestedGoal = requestedCapability?.trim().slice(0, 500) ?? "";
      if (!approval || !privacy.evaluate(approval.snapshot).allowed) {
        recordEvent("computer-use-result", { verified: false, reason: "no-approved-target" });
        renderCard(takeoverResultCard(
          false,
          "The previously observed application is no longer an exact privacy-approved target. Computer Use did not run.",
          approval?.snapshot.processName ?? "Current application",
        ));
        modeLabel.textContent = "Computer Use stopped safely";
        break;
      }
      if (!requestedGoal || requestedGoal !== approval.goal) {
        recordEvent("computer-use-result", { verified: false, reason: "approval-goal-mismatch" });
        modeLabel.textContent = "Computer Use stopped · approval goal changed";
        break;
      }
      modeLabel.textContent = "Computer Use: inspecting the approved application…";
      await beginThinking();
      try {
        const result = await invoke<TakeoverExecutionResult>("execute_computer_use_goal", {
          target: approval.target,
          goal: approval.goal,
        });
        recordEvent("computer-use-result", {
          verified: result.verified,
          processName: approval.snapshot.processName,
        });
        renderCard(takeoverResultCard(result.verified, result.message, result.application));
        modeLabel.textContent = result.verified
          ? "Computer Use verified · scope ended"
          : "Computer Use stopped safely";
      } catch {
        recordEvent("computer-use-result", {
          verified: false,
          processName: approval.snapshot.processName,
        });
        renderCard(takeoverResultCard(
          false,
          "Computer Use could not complete and verify the approved goal. It stopped without using scripts, hotkeys, typing, or pixel clicks.",
          approval.snapshot.processName,
        ));
        modeLabel.textContent = "Computer Use stopped safely";
      } finally {
        await endThinking();
      }
      break;
    }
    case "always_allow_capability": {
      if (!isFixedCapability(requestedCapability)) {
        recordEvent("capability-grant-rejected", { reason: "unknown-capability" });
        modeLabel.textContent = "Persistent approval rejected safely";
        break;
      }
      const grantedAt = new Date().toISOString();
      saveCapabilityGrants(rememberCapability(loadCapabilityGrants(), requestedCapability, grantedAt));
      recordEvent("capability-grant-created", { capability: requestedCapability, grantedAt });
      renderCapabilityGrantSettings();
      await useRememberedCapability(requestedCapability);
      break;
    }
    case "approve_notepad_story": {
      const request = requestedCapability?.trim().slice(0, 500) ?? "";
      recordEvent("notepad-story-stage", {
        stage: "precondition",
        hasRequest: Boolean(request),
        providerOnline: qwenOnline,
      });
      if (!request) {
        renderCard(takeoverLaunchResultCard(
          false,
          "The story request was empty, so no Notepad++ document was created.",
          "Notepad++ story",
        ));
        modeLabel.textContent = "Story provider unavailable";
        break;
      }
      modeLabel.textContent = "Writing a bounded story, then opening Notepad++…";
      await beginThinking();
      try {
        recordEvent("notepad-story-stage", { stage: "provider-start" });
        const generated = await invoke<string>("ask_qwen", {
          question: buildNotepadStoryPrompt(request),
        });
        recordEvent("notepad-story-stage", { stage: "provider-returned" });
        const story = validateGeneratedStory(generated);
        recordEvent("notepad-story-stage", { stage: "native-start" });
        const result = await invoke<TakeoverExecutionResult>("execute_notepad_story", { story });
        recordEvent("takeover-result", {
          capability: "notepad-story",
          verified: result.verified,
          wordCount: story.split(/\s+/u).filter(Boolean).length,
        });
        renderCard(takeoverLaunchResultCard(result.verified, result.message, "Notepad++ story"));
        modeLabel.textContent = result.verified ? "Story inserted and verified · scope ended" : "Story action stopped";
      } catch (error) {
        recordEvent("takeover-result", {
          capability: "notepad-story",
          verified: false,
          reason: String(error).includes("500 words") ? "word-bound" : "provider-or-native-failure",
        });
        renderCard(takeoverLaunchResultCard(
          false,
          "MyBuddy-AI could not generate and verify the bounded story in a new Notepad++ tab.",
          "Notepad++ story",
        ));
        modeLabel.textContent = "Story action failed safely";
      } finally {
        await endThinking();
      }
      break;
    }

    case "request_capability": {
      const request = requestedCapability?.trim().slice(0, 500) ?? "";
      if (!request) {
        modeLabel.textContent = "Capability request was empty";
        break;
      }
      let existing: Array<{ request: string; status: string; requestedAt: string }> = [];
      try {
        const parsed = JSON.parse(localStorage.getItem("mybuddy-capability-requests") ?? "[]");
        if (Array.isArray(parsed)) existing = parsed;
      } catch {
        existing = [];
      }
      if (!existing.some((item) => item.request.toLowerCase() === request.toLowerCase())) {
        existing.push({
          request,
          status: "needs-tested-adapter",
          requestedAt: new Date().toISOString(),
        });
      }
      localStorage.setItem("mybuddy-capability-requests", JSON.stringify(existing.slice(-50)));
      recordEvent("capability-requested", {
        status: "needs-tested-adapter",
        pendingCount: Math.min(existing.length, 50),
      });
      renderCard(capabilityRequestSavedCard(request));
      modeLabel.textContent = "Capability request saved locally";
      break;
    }
    case "snooze":
      snoozedUntil = Date.now() + 15 * 60 * 1000;
      await setExpanded(false);
      break;
    case "dismiss":
      await setExpanded(false);
      break;
    case "feedback_helpful":
    case "feedback_unhelpful":
      modeLabel.textContent = action === "feedback_helpful" ? "Feedback saved · helpful" : "Feedback saved · needs tuning";
      renderCard(statusCard());
      break;
    case "back_status":
      renderCard(statusCard());
      break;
  }
}

async function observe(): Promise<void> {
  if (paused || analyzing) return;
  try {
    const native = await invoke<NativeWindowSnapshot>("get_active_window_snapshot");
    if (/ambient.desktop.agent|mybuddy.ai/i.test(native.processName)) return;

    const snapshot: WindowSnapshot = {
      processName: native.processName,
      title: native.title,
      observedAt: new Date().toISOString(),
    };
    const decision = privacy.evaluate(snapshot);
    statusDot.classList.toggle("blocked", !decision.allowed);
    if (!decision.allowed) {
      latestContextTarget = null;
      recordEvent("privacy-block", { reason: decision.reason });
      return;
    }

    latestSnapshot = snapshot;
    latestContextTarget = native.windowHandle > 0
      ? {
          windowHandle: native.windowHandle,
          expectedProcessId: native.processId,
          expectedProcessName: native.processName,
          expectedTitle: native.title,
        }
      : null;
    const identity = `${snapshot.processName}|${snapshot.title}`;
    if (identity === lastIdentity) return;
    lastIdentity = identity;

    const candidate = detector.record({ ...snapshot, kind: "window-changed" });
    if (candidate && Date.now() - lastSuggestionAt > 5 * 60 * 1000) {
      recordEvent("shadow-candidate", { kind: candidate.kind, confidence: candidate.confidence });
      await analyze(candidate, "automatic");
    }
  } catch (error) {
    statusDot.classList.add("offline");
    recordEvent("observer-error", { message: String(error) });
  }
}

collapseButton.addEventListener("click", () => void minimizePanelToOrb("panel-control"));
messageForm.addEventListener("submit", (event) => void submitUserRequest(event));
clearConversationButton.addEventListener("click", clearConversation);
cancelRequestButton.addEventListener("click", () => void cancelCurrentRequest());
activityLogButton.addEventListener("click", () => {
  const expanded = activityPanel.hidden;
  activityPanel.hidden = !expanded;
  activityLogButton.setAttribute("aria-expanded", String(expanded));
  activityLogButton.textContent = expanded ? "Hide log" : "Live log";
  if (expanded) renderActivityLog();
  recordEvent("activity-log-toggled", { open: expanded });
});
settingsButton.addEventListener("click", () => {
  renderCapabilityGrantSettings();
  void loadProviderSettings()
    .catch((error) => {
      providerTestResult.textContent = `Could not load provider settings: ${String(error)}`;
    })
    .finally(() => settingsDialog.showModal());
});
avatarSelect.addEventListener("change", () => {
  void applyOrbAvatar(avatarSelect.value, true).catch(() => {
    modeLabel.textContent = "Orb image could not be applied";
  });
});
providerSelect.addEventListener("change", syncProviderControls);
providerSaveTest.addEventListener("click", () => void saveAndTestProvider());

void listen("open-panel", () => void togglePanelFromOrb());
void listen<ProviderProgressEvent>("provider-progress", ({ payload }) => {
  const message = payload.stage === "started"
    ? "Selected agent process started"
    : payload.stage === "working"
      ? `Selected agent is still working (${payload.elapsedSeconds}s)`
      : payload.stage === "completed"
        ? "Selected agent returned a result"
        : payload.stage === "timed-out"
          ? "Selected agent timed out"
          : "Selected agent process stopped";
  updateRequestProgress(payload.requestId, message, payload.stage === "timed-out" ? "failed" : "working");
});
void listen("orb-moved", () => void invoke("reposition_agent_surface"));
void listen<string>("thought-trail-side", ({ payload }) => {
  document.documentElement.dataset.bubbleSide = payload;
});
void listen("analyze-now", () => void analyzeCurrentWork());
void listen("toggle-pause", () => void setPaused(!paused));
void listen("suggestion-window-hidden", () => {
  expanded = false;
});
void listen("smoke-auto-suggestion", () =>
  void displaySuggestion(mockSuggestion(), "automatic"),
);
void listen("smoke-time-question", () => {
  messageInput.value = "what time is it";
  messageForm.requestSubmit();
});
void listen("smoke-active-window-status", () => {
  messageInput.value = "what do you see on the screen";
  messageForm.requestSubmit();
});
void listen("smoke-running-app-status", () => {
  messageInput.value = "is orca.exe running?";
  messageForm.requestSubmit();
});
void listen("smoke-agent-close-app-request", () => {
  messageInput.value = "close all Notepad++ applications";
  messageForm.requestSubmit();
});
void listen("smoke-running-services-status", () => {
  messageInput.value = "what services are currently running?";
  messageForm.requestSubmit();
});
void listen("smoke-top-memory-application-status", () => {
  messageInput.value = "can you give me the top 3 apps that use the most memory";
  messageForm.requestSubmit();
});
void listen("smoke-largest-files-status", () => {
  messageInput.value = "get me a list of the 5 largest files under d:\\souce";
  messageForm.requestSubmit();
});
void listen("smoke-notepad-story-request", () => {
  messageInput.value = "open Notepad++, open a new file and create a story that is 500 words or less";
  messageForm.requestSubmit();
});
void listen("smoke-notepad-story-approve", () =>
  void handleCardAction(
    "approve_notepad_story",
    undefined,
    "open Notepad++, open a new file and create a story that is 500 words or less",
  ),
);

void listen("smoke-provider-question", () => {
  messageInput.value = "Reply with exactly MYBUDDY_CODEX_READY and nothing else.";
  messageForm.requestSubmit();
});
void listen("smoke-provider-cancellation", () => {
  messageInput.value =
    "Use your terminal tool to wait for 30 seconds before replying with exactly MYBUDDY_CANCEL_SMOKE_DONE.";
  messageForm.requestSubmit();
  window.setTimeout(() => activityLogButton.click(), 250);
  window.setTimeout(() => cancelRequestButton.click(), 2_500);
});
void listen("smoke-important-email-request", () => {
  messageInput.value = "please get me a list of important emails for the last week";
  messageForm.requestSubmit();
});
void listen("smoke-vault-todo-request", () => {
  messageInput.value = "what todo are in my vault";
  messageForm.requestSubmit();
});
void listen("smoke-window-context", () => {
  messageInput.value = "Read the error in my terminal and help me fix the command";
  messageForm.requestSubmit();
});
void listen("smoke-file-open-guidance", () => {
  messageInput.value = "Show me how to open a file";
  messageForm.requestSubmit();
});

void listen("smoke-autohotkey-demo-normal", () =>
  void handleCardAction(
    "start_computer_use_demo",
    undefined,
    "Open the current application's file picker and stop before selecting a file",
    "normal",
  ),
);
void listen("smoke-minimize-panel", () => void minimizePanelToOrb("smoke"));

window.addEventListener("DOMContentLoaded", async () => {
  messageInput.disabled = true;
  messageSend.disabled = true;
  await setExpanded(false);
  recordEvent("startup", { mode: "tray-hidden-safe" });
  const selectedAvatar = initializeAvatarSettings();
  await applyOrbAvatar(selectedAvatar, false).catch(() => {
    recordEvent("orb-avatar-error", { kind: "default-fallback-used" });
  });
  try {
    await loadProviderSettings();
  } catch (error) {
    qwenOnline = false;
    runtimeLabel.textContent = "Provider settings unavailable";
    modeLabel.textContent = "Open Settings and repair the selected provider";
    statusDot.classList.add("offline");
    recordEvent("provider-settings-error", {
      errorMessage: String(error).slice(0, 300),
    });
    return;
  }
  try {
    qwenOnline = await invoke<boolean>("qwen_health");
    recordEvent("provider-health", { online: qwenOnline });
  } catch (error) {
    qwenOnline = false;
    recordEvent("provider-health", {
      online: false,
      reason: "health-check-failed",
      errorMessage: String(error).slice(0, 300),
    });
  }
  runtimeLabel.textContent = qwenOnline ? "Selected model provider ready" : "Rules fallback · provider offline";
  statusDot.classList.toggle("offline", !qwenOnline);
  messageInput.disabled = false;
  messageSend.disabled = false;
  setInterval(() => void observe(), 1500);
  void observe();
});
