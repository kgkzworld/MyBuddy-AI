const EQUIPPED_AGENT_PROVIDERS = new Set([
  "codex-cli",
  "claude-cli",
  "qwen-cli",
  "hermes-cli",
]);

export function shouldPassThroughToSelectedAgent(
  provider: string,
  requestClass: string,
): boolean {
  return requestClass === "question" && EQUIPPED_AGENT_PROVIDERS.has(provider);
}
