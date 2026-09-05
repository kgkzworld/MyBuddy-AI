export interface AnswerQuality {
  length: number;
  capabilityRefusal: boolean;
  listItemCount: number;
}

const CAPABILITY_REFUSAL_PATTERNS = [
  "can't access",
  "cannot access",
  "currently registered tools",
  "please enable",
  "provide the emails",
  "provide the todo",
];

export function inspectAnswerQuality(answer: string): AnswerQuality {
  const normalized = answer.trim();
  const lower = normalized.toLowerCase();
  const listItemCount = normalized
    .split(/\r?\n/u)
    .filter((line) => /^\s*(?:[-*]|\d+[.)])\s+/u.test(line)).length;

  return {
    length: normalized.length,
    capabilityRefusal: CAPABILITY_REFUSAL_PATTERNS.some((pattern) => lower.includes(pattern)),
    listItemCount,
  };
}
