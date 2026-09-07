const EQUIPPED_AGENT_PROVIDERS = new Set([
  "codex-cli",
  "claude-cli",
  "qwen-cli",
  "hermes-cli",
]);

export function shouldPassThroughToSelectedAgent(
  provider: string,
  _requestClass: string,
): boolean {
  return EQUIPPED_AGENT_PROVIDERS.has(provider);
}
