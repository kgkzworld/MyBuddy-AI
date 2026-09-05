import { describe, expect, it } from "vitest";
import html from "../index.html?raw";
import frontend from "../src/main.ts?raw";
import provider from "../src-tauri/src/provider.rs?raw";
import qwen from "../src-tauri/src/qwen.rs?raw";
import { shouldPassThroughToSelectedAgent } from "../src/core/providerSettings";
import { inspectAnswerQuality } from "../src/core/answerQuality";

const requiredProviderValues = [
  "lm-studio",
  "openai-compatible",
  "codex-cli",
  "claude-cli",
  "qwen-cli",
  "continue-cli",
  "hermes-cli",
  "opencode-cli",
  "antigravity-cli",
];

describe("model provider settings", () => {
  it("distinguishes a capability refusal from a populated list without logging content", () => {
    expect(inspectAnswerQuality("I can't access your inbox with the currently registered tools.")).toMatchObject({
      capabilityRefusal: true,
      listItemCount: 0,
    });
    expect(inspectAnswerQuality("Important emails:\n- First result\n- Second result")).toMatchObject({
      capabilityRefusal: false,
      listItemCount: 2,
    });
  });

  it.each(["codex-cli", "claude-cli", "qwen-cli", "hermes-cli"] as const)(
    "passes ordinary questions directly to the equipped %s runtime",
    (providerId) => {
      expect(shouldPassThroughToSelectedAgent(providerId, "question")).toBe(true);
      expect(shouldPassThroughToSelectedAgent(providerId, "takeover-preview")).toBe(false);
      expect(shouldPassThroughToSelectedAgent(providerId, "running-app-status")).toBe(false);
    },
  );

  it("does not treat HTTP model endpoints as equipped agent runtimes", () => {
    expect(shouldPassThroughToSelectedAgent("lm-studio", "question")).toBe(false);
    expect(shouldPassThroughToSelectedAgent("openai-compatible", "question")).toBe(false);
  });

  it("loads the saved provider before startup health checks and user routing", () => {
    const startup = frontend.slice(frontend.indexOf('window.addEventListener("DOMContentLoaded"'));
    expect(startup).toContain("await loadProviderSettings()");
    expect(startup.indexOf("await loadProviderSettings()")).toBeLessThan(
      startup.indexOf('invoke<boolean>("qwen_health")'),
    );
  });

  it("offers redacted Settings controls for every approved provider route", () => {
    for (const id of [
      "provider-select",
      "provider-endpoint",
      "provider-chat-model",
      "provider-analysis-model",
      "provider-api-key",
      "provider-save-test",
      "provider-test-result",
      "provider-availability",
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
    for (const value of requiredProviderValues) expect(html).toContain(`value="${value}"`);
    expect(frontend).toContain('invoke<ProviderSettingsView>("get_provider_settings")');
    expect(frontend).toContain('invoke<ProviderAvailability[]>("get_provider_availability")');
    expect(frontend).toContain('invoke<ProviderTestResult>("save_and_test_provider"');
    expect(frontend).toContain("apiKeyConfigured");
  });

  it("maps selected model agents to their full Hermes profiles", () => {
    expect(provider).toContain("ProviderKind::CodexCli | ProviderKind::ClaudeCli | ProviderKind::QwenCli");
    expect(provider).toContain('Some("hermes")');
    expect(provider).toContain('"-p", "hermescodex"');
    expect(provider).toContain('"-p", "hermesclaude"');
    expect(provider).toContain('"-p", "hermesqwen"');
    expect(provider).toContain('ProviderKind::ContinueCli => Some("cn")');
    expect(provider).toContain('ProviderKind::HermesCli => Some("hermes")');
    expect(provider).toContain('ProviderKind::OpenCodeCli => Some("opencode")');
    expect(provider).toContain('ProviderKind::AntigravityCli => Some("agy")');
    expect(provider).toContain("resolve_executable");
    expect(provider).toContain("get_provider_availability");
    expect(frontend).toContain('entry.installed ? `${entry.displayName} ${entry.version ?? "installed"}`');
  });

  it("stores keys in Windows Credential Manager and excludes them from config and responses", () => {
    expect(provider).toContain("CredWriteW");
    expect(provider).toContain("CredReadW");
    expect(provider).toContain("CREDENTIAL_TARGET");
    expect(provider).toContain("api_key_configured");
    expect(provider).not.toContain("api_key: String");
    expect(provider).not.toContain('json!({ "apiKey"');
  });

  it("runs selected model agents through configured Hermes profiles without bypassing permissions", () => {
    const commands = provider.slice(
      provider.indexOf("fn command_for_cli"),
      provider.indexOf("fn normalize_cli_output"),
    );
    const codex = commands.slice(
      commands.indexOf("ProviderKind::CodexCli"),
      commands.indexOf("ProviderKind::ClaudeCli"),
    );
    expect(codex).toContain('"hermescodex"');
    expect(commands).toContain('"hermesclaude"');
    expect(commands).toContain('"hermesqwen"');
    expect(commands).toContain('"--query-file"');
    expect(commands).not.toContain('"--toolsets"');
    expect(commands).not.toContain('"--ignore-rules"');
    expect(commands).toContain('ProviderKind::QwenCli');
    expect(commands).not.toContain('"--safe-mode"');
    expect(commands).not.toContain('"--dangerously-skip-permissions"');
    expect(commands).not.toContain('"--dangerously-bypass-approvals-and-sandbox"');
    expect(commands).not.toContain('"--yolo"');
    expect(commands).toContain('"--readonly"');
    expect(provider).toContain("Stdio::piped");
    expect(provider).toContain("write_all(prompt.as_bytes())");
    expect(provider).not.toContain("Command::new(prompt");
    expect(qwen).toContain("provider::complete");
    expect(qwen).not.toContain('post("http://127.0.0.1:1234/v1/chat/completions")');
  });

  it("does not restrict tools in equipped-agent question passthrough", () => {
    expect(qwen).not.toContain("Do not use tools");
    expect(qwen).not.toContain("Do not use local shell or file-mutation tools");
    expect(qwen).toContain("question_prompt_for_provider");
    expect(qwen).toContain("is_equipped_agent_provider");
    expect(frontend).toContain("shouldPassThroughToSelectedAgent");
    expect(frontend).toContain('mode: "agent-passthrough"');
  });

  it("has a bounded smoke hook that exercises the selected provider", () => {
    expect(frontend).toContain('listen("smoke-provider-question"');
    expect(frontend).toContain("Reply with exactly MYBUDDY_CODEX_READY");
    expect(provider).toContain("MYBUDDY_PROVIDER_OK");
    expect(frontend).toContain('recordEvent("provider-health"');
    expect(frontend).toContain("errorMessage: String(error).slice(0, 300)");
  });

  it("does not mislabel non-Qwen providers as Local Qwen", () => {
    for (const staleLabel of [
      "Asking local Qwen",
      "Local Qwen is offline",
      "Local Qwen could not answer",
      "Local Qwen ready",
    ]) {
      expect(frontend).not.toContain(staleLabel);
    }
    expect(frontend).toContain("Asking selected model provider");
    expect(frontend).toContain("Rules fallback · provider offline");
  });

  it("attempts explicit user requests even when startup provider health is stale", () => {
    expect(frontend).not.toContain("if (!qwenOnline)");
    expect(frontend).not.toContain("if (!request || !qwenOnline)");
    expect(frontend).toContain('const answer = await invoke<string>("ask_qwen"');
  });
});
