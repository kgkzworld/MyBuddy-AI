import type { WindowSnapshot } from "./contracts";

export type UserRequestClass = "question" | "active-window-status" | "running-app-status" | "running-services-status" | "top-memory-application-status" | "largest-files-status" | "show-file-open-guidance" | "takeover-preview";
export type TakeoverCapability = "notepad-story";

const takeoverLanguage =
  /\b(take over|do (?:it|this)|click|type|enter|submit|fill|open|close|kill|terminate|force close|move|delete|send|install|configure|bring\b[^.!?]*\b(?:foreground|front)|focus (?:this|the|that)?\s*(?:app|application|window)|activate (?:this|the|that)?\s*(?:app|application|window)|control (?:my|the) screen)\b/i;

const fileOpenGuidanceLanguage =
  /(?:\b(?:show|teach) me(?: how to)?\b|\bwalk me through\b|\bhow (?:do|can|would) i\b|\bwhat (?:do|should) i click\b)[^.!?]*\bopen(?:ing)? (?:a|the|this)?\s*file\b/i;

const activeWindowStatusLanguage =
  /\b(?:what (?:do|can) you see|what(?:'s| is) (?:on|happening on) (?:my |the )?screen|describe (?:my |the )?screen)\b/i;

const runningAppStatusLanguage = /^\s*(?:is|are)\s+[^\r\n?!]{1,100}?\s+runn?ing\b/i;
const runningServicesStatusLanguage = /\b(?:windows\s+)?services?\b[^.!?]*\b(?:currently\s+)?runn?ing\b/i;
export interface LocalAnswerPlan {
  capability: "top-resource-applications";
  limit: number;
  metric: "working-set-memory";
  interpretedBroadResources: boolean;
}

export interface LargestFilesPlan {
  path: string;
  limit: number;
}

export function resolveLargestFilesPlan(request: string): LargestFilesPlan | null {
  const normalized = request.trim();
  if (/\bhow (?:do|can|would) i\b|\bshow me how\b|\bteach me how\b|\bwalk me through\b/i.test(normalized)) return null;
  if (!/\bfiles?\b/i.test(normalized) || !/\b(?:largest|biggest)\b/i.test(normalized)) return null;
  const pathMatch = normalized.match(/\b([a-z]:\\[^?\r\n"]+)/i);
  if (!pathMatch) return null;
  const path = pathMatch[1].trim().replace(/[.,;!]+$/, "");
  const count = normalized.match(/\b(\d{1,3})\s+(?:largest|biggest)\b/i);
  const limit = count ? Math.max(1, Math.min(10, Number.parseInt(count[1], 10))) : 5;
  return { path, limit };
}

export function resolveLocalAnswerPlan(request: string): LocalAnswerPlan | null {
  const normalized = request.trim().toLowerCase();
  const asksForExplanation = /\bhow (?:do|can|would) i\b|\bshow me how\b|\bteach me how\b|\bwalk me through\b/.test(normalized);
  if (asksForExplanation) return null;
  if (!/\b(?:apps?|applications?|processes?)\b/.test(normalized)) return null;
  if (!/\b(?:top|most|highest)\b/.test(normalized)) return null;
  const namesMemory = /\b(?:memory|ram)\b/.test(normalized);
  const namesResources = /\bresources?\b/.test(normalized);
  if (!namesMemory && !namesResources) return null;
  return {
    capability: "top-resource-applications",
    limit: extractTopMemoryApplicationLimit(normalized),
    metric: "working-set-memory",
    interpretedBroadResources: namesResources && !namesMemory,
  };
}

export function classifyUserRequest(request: string): UserRequestClass {
  const normalized = request.trim();
  if (fileOpenGuidanceLanguage.test(normalized)) return "show-file-open-guidance";
  if (activeWindowStatusLanguage.test(normalized)) return "active-window-status";
  if (runningServicesStatusLanguage.test(normalized)) return "running-services-status";
  if (resolveLargestFilesPlan(normalized)) return "largest-files-status";
  if (resolveLocalAnswerPlan(normalized)) return "top-memory-application-status";
  if (runningAppStatusLanguage.test(normalized)) return "running-app-status";
  return takeoverLanguage.test(normalized) ? "takeover-preview" : "question";
}

export function formatActiveWindowStatus(snapshot: WindowSnapshot): string {
  const application = snapshot.processName.replace(/\.exe$/i, "");
  return `Before you opened MyBuddy, the active app was ${application}, with the window “${snapshot.title}”. I can inspect active-window metadata, not screen pixels.`;
}

export function extractRunningAppQuery(request: string): string | null {
  const match = request.trim().match(/^\s*(?:is|are)\s+(.+?)\s+runn?ing\b/i);
  if (!match) return null;
  const application = match[1].replace(/^the\s+/i, "").replace(/\s+process$/i, "").trim();
  if (!application || application.length > 80) return null;
  return application;
}

export function formatRunningAppStatus(query: string, running: boolean): string {
  const application = query.charAt(0).toUpperCase() + query.slice(1);
  return running
    ? `Yes — ${application} is running.`
    : `No — ${application} is not running.`;
}

export interface TopMemoryApplication {
  processName: string;
  workingSetBytes: number;
  processCount: number;
}

export function extractTopMemoryApplicationLimit(request: string): number {
  const numeric = request.match(/\btop\s+(\d{1,3})\b|\b(\d{1,3})\s+(?:apps?|applications?|processes?|highest|largest|biggest)\b/i);
  const value = numeric?.[1] ?? numeric?.[2];
  if (value) return Math.max(1, Math.min(10, Number.parseInt(value, 10)));
  const numberWords: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };
  const word = request.match(/\btop\s+(one|two|three|four|five|six|seven|eight|nine|ten)\b|\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:apps?|applications?|processes?|highest|largest|biggest)\b/i);
  return numberWords[(word?.[1] ?? word?.[2] ?? "").toLowerCase()] ?? 1;
}

function readableProcessName(value: string): string {
  const processName = value.replace(/\.exe$/i, "");
  const knownNames: Record<string, string> = {
    chrome: "Google Chrome",
    msedge: "Microsoft Edge",
    firefox: "Mozilla Firefox",
    code: "Visual Studio Code",
    devenv: "Visual Studio",
    winword: "Microsoft Word",
    notepad: "Notepad",
    "notepad++": "Notepad++",
  };
  return knownNames[processName.toLowerCase()]
    ?? processName.charAt(0).toUpperCase() + processName.slice(1);
}

export function formatTopMemoryApplicationStatus(
  applications: readonly TopMemoryApplication[],
  interpretedBroadResources = false,
): string {
  if (applications.length === 0) return "No readable application memory data was available.";
  const rows = applications.map((application, index) => {
    const gibibytes = application.workingSetBytes / (1024 ** 3);
    const mebibytes = application.workingSetBytes / (1024 ** 2);
    const memory = gibibytes >= 1
      ? `${gibibytes.toFixed(2)} GiB`
      : `${mebibytes.toFixed(0)} MiB`;
    const processSummary = application.processCount === 1
      ? "1 process"
      : `${application.processCount} processes`;
    return `${index + 1}. ${readableProcessName(application.processName)} — ${memory} across ${processSummary}`;
  });
  const interpretation = interpretedBroadResources
    ? "I interpreted ‘resources’ as current working-set memory, the consistent live metric available to this capability.\n"
    : "";
  return `${interpretation}The applications currently using the most working-set memory are:\n${rows.join("\n")}.`;
}

export interface LargestFileEntry { path: string; sizeBytes: number }

export function formatLargestFilesStatus(
  requestedPath: string, resolvedPath: string, corrected: boolean,
  files: readonly LargestFileEntry[], truncated: boolean,
): string {
  const displayPath = (path: string): string => path.startsWith("\\\\?\\") ? path.slice(4) : path;
  const shownRoot = displayPath(resolvedPath);
  const correction = corrected
    ? `The exact path ${requestedPath} does not exist. I found and inspected the unique close match ${shownRoot}.\n`
    : "";
  const rows = files.map((file, index) => {
    const gib = file.sizeBytes / (1024 ** 3);
    const mib = file.sizeBytes / (1024 ** 2);
    return `${index + 1}. ${displayPath(file.path)} — ${gib >= 1 ? `${gib.toFixed(2)} GiB` : `${mib.toFixed(1)} MiB`}`;
  });
  return `${correction}The largest files under ${shownRoot} are:\n${rows.join("\n")}${truncated ? "\nThe bounded scan reached its 100,000-entry limit." : ""}`;
}

export interface RunningServiceEntry {
  name: string;
  displayName: string;
}

export function formatRunningServicesStatus(services: readonly RunningServiceEntry[]): string {
  const sorted = [...services].sort((left, right) =>
    left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" }));
  if (sorted.length === 0) return "No running Windows services were reported.";
  const shown = sorted.slice(0, 75);
  const rows = shown.map(({ name, displayName }) =>
    displayName === name ? `• ${name}` : `• ${displayName} (${name})`);
  const remainder = sorted.length - shown.length;
  return `${sorted.length} Windows services are currently running:\n${rows.join("\n")}${
    remainder > 0 ? `\n• …and ${remainder} more.` : ""
  }`;
}

export function buildNotepadStoryPrompt(request: string): string {
  return [
    "Write an original story of 500 words or fewer for the user.",
    "Return only the story text: no preface, commentary, Markdown fence, or word count.",
    `User request: ${request.trim().slice(0, 500)}`,
  ].join("\n");
}

export function validateGeneratedStory(value: string): string {
  const story = value.trim();
  if (!story) throw new Error("The selected provider returned an empty story.");
  if (story.length > 20_000 || [...story].some((character) => character < " " && !"\n\r\t".includes(character))) {
    throw new Error("The generated story contains unsupported content.");
  }
  const wordCount = story.split(/\s+/u).filter(Boolean).length;
  if (wordCount > 500) throw new Error("The generated story must be 500 words or fewer.");
  return story;
}

export function resolveTakeoverCapability(request: string): TakeoverCapability | null {
  const normalized = request.toLowerCase();
  const namesNotepad = /notepad\s*\+\+/.test(normalized);

  const requestsStory = /\b(?:story|write|draft|compose)\b/.test(normalized)
    && /\b(?:new\s+(?:file|document|tab)|create)\b/.test(normalized);
  if (namesNotepad && requestsStory) return "notepad-story";
  return null;
}