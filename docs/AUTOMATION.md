# Script and Automation Procedure

## Context continuity and reset regression — ADA-080

- Run `npm test -- --run tests/conversationContext.test.ts tests/conversationContinuity.test.ts` and `cargo test --manifest-path src-tauri/Cargo.toml contextual_follow_up_includes_the_prior_email_result_and_current_request` before the full gate.
- Retain the exact two-turn fixture: assistant result `I found the quarterly report email from Alex.` followed by user request `can you get me the link to the email`. The provider input must contain both turns with explicit roles and must keep the current request last.
- Verify **Clear** is wired to `ConversationContext.clear()`, removes pending approval/prepared-app state, resets the visible card, and is unavailable while a request is active. Conversation text must not enter diagnostics.
- Packaged UI acceptance requires a clean process and the user's exact real two-turn read-only email flow. Verify the second runtime session invokes the configured email-search capability and does not ask which email. Inspect only privacy-safe tool names/categories—never email content, addresses, IDs, or connector URLs.
- Live acceptance passed after relaunching the canonical release executable: the user independently completed the real email search followed by the contextual link request and confirmed the flow works. Preserve this as behavioral acceptance without recording private email details.

## Cross-platform installation automation

- Windows: `powershell -ExecutionPolicy Bypass -File scripts/install-mybuddy.ps1` verifies dependencies, installs the portable harness, and runs all source gates. Add `-BuildBundle` to package or `-Install` to package and launch the exact NSIS installer.
- macOS/Linux: `bash scripts/install-mybuddy.sh` performs the equivalent source verification. Add `--build` for native bundles or `--install` for a per-user `.app`/AppImage installation.
- These scripts intentionally do not install system prerequisites, choose a model, enter credentials, grant OS permissions, enable startup, or create schedules. Follow `docs/INSTALL.md` or `docs/AI-INSTALL.md` for those explicit boundaries.

## YouTube-to-vault regression and acceptance — ADA-078

- Run `npm run test -- tests/youtubeVaultCapture.test.ts tests/harnessPortability.test.ts`. Retain the exact regression where a 7:33 video's final caption starts at 7:31; no validator may require a cue exactly at 7:30 or another guessed second.
- The project-owned `youtube-to-vault` helper validates the video ID, nonempty monotonic caption timestamps, segment count, near-zero start, and final timestamp within the declared duration. It writes through a same-directory temporary file, atomically replaces the destination, and reads the bytes back exactly.
- Acceptance requires JSON `status: saved-and-verified`, then a read of the exact destination confirming video ID, source, transcript heading, segment count, and final timestamp. Do not accept a fetched temporary transcript as completion.

## Provider cancellation, live-log, and process-target verification — ADA-077

- Run `npm run test -- tests/requestLifecycle.test.ts tests/requestProgressUi.test.ts tests/thinkingOrb.test.ts tests/userRequest.test.ts` and `cargo test --manifest-path src-tauri/Cargo.toml cancellation_terminates_the_registered_provider_process` plus the full gate.
- Run `ambient-desktop-agent.exe --smoke-provider-cancellation`. Require `activity-log-toggled { open: true }`, provider `started`, `provider-cancel-requested`, provider `cancelled`, and `provider-cancel-completed { cancelled: true, confirmed: true }`; then verify the normal avatar returned and no provider descendant remains. Do not print prompt/output content during acceptance.
- Retain exact regressions for `MS Edge browser window` resolving to `msedge.exe` and for execute intent independent of sentence shape. Never require user-supplied PID/HWND. Consequential termination must still stop at allow-once approval and verify zero matching processes afterward.
- Windows CLI launches must be assigned to a kill-on-close Job Object immediately after spawn. Cancellation uses the request-owned Job Object, not only a wrapper PID; stale request results must fail the frontend generation check.

## Profile-backed selected-agent capability — ADA-074/075

- Run `npm run test -- tests/providerSettings.test.ts tests/agentRuntime.test.ts tests/genericVisualWorkflow.test.ts`, the full TypeScript/Rust/build gate, and `npm run tauri build`.
- Require startup to call `loadProviderSettings()` before health checks and before enabling composer input. Require equipped providers to pass ordinary questions directly to `ask_qwen`; HTTP endpoints must remain outside this passthrough.
- Run `ambient-desktop-agent.exe --smoke-important-email-request` and `--smoke-vault-todo-request` from separate clean processes. For each, require `provider: codex-cli`, `mode: agent-passthrough`, `capabilityRefusal: false`, and a nonzero `listItemCount`; reject approval, visual-workflow, fallback, or execution-error events.
- Inspect the corresponding Hermes session metadata without printing response content. Email must show `composio-gmail`/email-triage skill loading and helper execution; vault must show `master-vault`/`obsidian` loading plus scoped search/read calls. A completed turn alone is not acceptance.
- Never print email bodies, vault contents, connector URLs, credentials, tokens, connection IDs, or addresses during acceptance. Do not execute send/delete/write operations.
- Retain `Find information in my vault and email` as a benign boundary regression and `Format the system drive` as a blocked destructive-goal regression.

## Generic compound and follow-up visual acceptance — ADA-073

- Run `npm run test -- --run tests/genericVisualWorkflow.test.ts tests/conversationContext.test.ts tests/userRequest.test.ts tests/agentRuntime.test.ts`. Require one generic model-visible tool, no registered Word/Notepad++ launch or File/Open visual commands, bounded conversation history, generic application resolution, and same-process transition selection.
- Manual one-turn acceptance: submit `Open Notepad++ or bring it to the foreground and then show me how to open a file`, approve the generated `desktop.visual_workflow` action, and require a verified same-process Open dialog with no file selected.
- Manual two-turn acceptance: first submit `Open Notepad++`, then separately submit `Show me how to open a file`. The second selected-AI plan must derive Notepad++ from bounded conversation history and use the same generic tool.
- Repeat the same behavioral acceptance with a second accessible desktop application. A generic architecture is not accepted from a Notepad++-only result. Never add app-specific smoke commands, menu coordinates, command IDs, COM dialog calls, or process-name branches to make an acceptance pass.

## Request-progress UI verification — ADA-072

- Run `npm run test -- --run tests/requestProgressUi.test.ts`. It asserts that `clearCardForNewRequest()` runs before `beginThinking()` and `executeAgentTurn()`, and that production references only `thinking-green-question.png` / `thinking-green-question` for the transient state.
- For packaged acceptance, start with `--smoke-auto-suggestion --smoke-provider-question`. Verify the mock suggestion appears first, then disappears while the provider request is pending; the header must show provider progress, the input must be disabled, and the native orb must be the green question mark. After completion, verify the configured avatar returns.

## Agent-first runtime verification — ADA-071

- Run `npm run test -- --run tests/agentRuntime.test.ts` for the coordinator, production registry, approval/result cards, and non-actuating exact close-request smoke.
- Run `cargo test --manifest-path src-tauri/Cargo.toml qwen::tests::agent_step`, `cargo test --manifest-path src-tauri/Cargo.toml provider::tests::codex_structured_answer_is_not_mistaken_for_event_jsonl`, and `cargo test --manifest-path src-tauri/Cargo.toml process_control::tests`. The disposable integration test must terminate only its uniquely renamed temporary executable and verify zero remain.
- Canonical packaged acceptance is `ambient-desktop-agent.exe --smoke-agent-close-app-request`. It must log `agent-tool-approval-requested` for `process.terminate_matching` and render the exact target/scope/warning. This smoke must never synthesize `approve_agent_tool`; verify the named user application count is unchanged.
- Full release gate is `npm run test && npm run build && cargo test --manifest-path src-tauri/Cargo.toml && cargo fmt --manifest-path src-tauri/Cargo.toml --check && git diff --check && npm run tauri build`. Stop any running release executable first because Windows locks the output path.

## Executable-name process regression — ADA-070

- Retain exact `is orca.exe running?` plus other `.exe` variants in request tests. The release smoke must use the exact reported phrase and visibly return a local yes/no answer.

## Largest-file adapter checks — ADA-069

- Retain a synthetic misspelled-directory regression, 1–10 result bound, explanation-intent exclusion, one-edit typo test, native-command registration test, smoke flag, and internal Windows device-prefix formatting regression. Test data must not use a developer's real filesystem path.
- Verify with focused TypeScript tests, frontend build, Rust tests/formatting, canonical packaging, exact release smoke, full gate, and `git diff --check`.

## Resource paraphrase matrix — ADA-068

- `tests/userRequest.test.ts` must retain the exact `can you give me the top 3 apps that use the most memory` failure plus answer variants beginning with please/tell/I want/show/could and explanation variants using how/show me how/teach/walk me through.
- Count extraction accepts digits in `top N`, `N apps`, and `N highest` positions plus words one–ten. Run the focused request/desktop-state tests, full suite, canonical package, and exact release smoke.

## Capability-plan regression — ADA-067

- Retain the exact regression `what 10 apps take up the most resources on this machine` in `tests/userRequest.test.ts` and the packaged smoke in `tests/desktopState.test.ts`.
- Verify `resolveLocalAnswerPlan` returns `top-resource-applications`, limit 10, metric `working-set-memory`, and `interpretedBroadResources: true`; `how do I find...` must return no execution plan.
- Live acceptance must show ten ranked entries, the broad-resource interpretation, local process-memory attribution, and no Task Manager/provider refusal text.

## Local answer routing and top-memory verification — ADA-066

- Run `npm test -- --run tests/userRequest.test.ts tests/desktopState.test.ts`. Both singular and plural/top-N memory questions must classify as `top-memory-application-status`; `how do I find...` remains an explanation request. Requested counts default to 1 and are bounded to 10.
- Run `cargo test --manifest-path src-tauri/Cargo.toml observer::tests::memory_usage_is_aggregated_by_application_before_selecting_the_top_one`. The native adapter must use ToolHelp plus `GetProcessMemoryInfo`, aggregate case-insensitive executable names, sort by total working set, skip inaccessible/system processes, and return only the requested bounded list.
- Run the packaged executable with `--smoke-top-memory-application-status`. The rendered answer must contain five ranked applications and memory values, identify local process-memory metadata, and contain no Task Manager tutorial or selected-provider attribution.

## Services, Notepad++, and provider-capability verification — ADA-065

- Run `npm test -- --run tests/desktopState.test.ts tests/userRequest.test.ts tests/notepadTakeover.test.ts tests/conversationCard.test.ts tests/capabilityGrant.test.ts tests/providerSettings.test.ts`. The exact two service questions must classify as `running-services-status`, never `running-app-status`; ordinary Notepad++ foreground variants must not resolve to a fixed capability; the exact story request must resolve to nonrememberable `notepad-story`; output validation must reject more than 500 words.
- Run `cargo test --manifest-path src-tauri/Cargo.toml provider::tests::` plus the full Rust suite. The service adapter must call `OpenSCManagerW`/`EnumServicesStatusExW` with active Win32-service scope and bounded names. The optional story adapter must write/read-back a uniquely named temporary draft, open it with `-multiInst -nosession`, and verify the exact tab/window title before returning `verified: true`. It must not use clipboard, synthetic typing, or `SendMessageTimeoutW` editor injection.
- Live service acceptance uses `--smoke-running-services-status`. The optional script-style story acceptance retains `--smoke-notepad-story-acceptance`; ordinary launch and menu/dialog acceptance must use the generic selected-AI workflow without app-specific smoke flags.
- Provider regression requires Codex without MBAI-supplied sandbox, ephemeral, ignored-config, or ignored-rules overrides; Claude `--permission-mode dontAsk --no-session-persistence` without restricted/safe mode; Qwen through `qwen` without safe mode or bypass; and Hermes without empty toolsets or ignored rules. Confirm capability availability with a content-free probe and never print or copy MCP credentials.
- Explicit request tests must prove `qwenOnline` is not a refusal gate: startup health remains available to autonomous suggestion logic, while explicit questions, approved window help, guidance, and story creation invoke the selected provider and handle its actual result. Codex normalization must accept both plain text and legacy JSONL assistant events.
- Canonical acceptance remains `npm run tauri -- build`; direct Cargo release is not a packaged-runtime substitute. Inspect the rendered card, Codex plain-text result, verified draft read-back, Notepad++ title/tab, and exact target state before claiming each smoke passed.

## Canonical vault-schedule verification — ADA-063

- Run `cargo test --manifest-path src-tauri/Cargo.toml explicit_vault_schedule` and `cargo test --manifest-path src-tauri/Cargo.toml vault_schedule_grounding`. Acceptance requires explicit vault-plus-schedule intent, the canonical relative path only, a 64 KiB bound, untrusted-reference framing, and no read for ordinary questions.
- Confirm `OBSIDIAN_VAULT_PATH` resolves to the master vault before launching MyBuddy. Do not hard-code a user profile path or broaden the host adapter. Selected CLI runtimes may independently use only their already-configured vault tools and permissions.
- Live acceptance asks **Check my schedule in the vault** through the normal composer with the selected provider. The answer must cite the vault schedule boundary, identify real schedule content, and avoid claiming Google Calendar, Apple Calendar, or Apple Reminders were checked.
- Diagnostics may record only the existing `requestClass: question`; do not log the submitted question, schedule contents, paths, appointments, or provider answer.

## Retired Word-launch routing regression — ADA-062

- Run `npm test -- --run tests/genericVisualWorkflow.test.ts tests/userRequest.test.ts tests/wordTakeover.test.ts`. The exact phrase `click on the start menu icon and run word` must not resolve to a fixed capability, and no Word launch/File Open command may be registered.
- Validate it manually through `desktop.visual_workflow` with one-time approval. No `--smoke-word-launch-acceptance` bypass exists.


## AutoHotkey-guided demonstration verification — ADA-061

- Verify AutoHotkey v2 without a tray/console using `%ProgramFiles%\AutoHotkey\v2\AutoHotkey64.exe` (or the path derived from the corresponding system environment variable). Do not reinstall or update when the installed probe already passes.
- Run `npm test -- --run tests/autohotkeyDemo.test.ts tests/computerUseApproval.test.ts tests/fileOpenGuidance.test.ts tests/thinkingOrb.test.ts tests/userRequest.test.ts`. Acceptance requires Normal/Slow/Cancel, immutable approval target capture, native cancellation, thinking-avatar restoration, and a test-only smoke event routed through the same production handler.
- Run `cargo test --manifest-path src-tauri/Cargo.toml computer_use_takeover::tests::`. Native acceptance requires exact HWND activation, fresh token-center resolution, smooth visible `SetCursorPos`, exact child-window and same-PID validation, direct down/up window messages, no `BlockInput`/hooks/clipping, 10-second child timeout, 120-second scope, and generic semantic file-picker completion.
- Planner `type` is accepted only for current enabled Edit/ComboBox roles when its bounded text is a verbatim substring of the approved goal. Generated scripts contain numeric UTF-16 units rather than raw text or model-authored source.
- For a live Word acceptance, place Word in Home state and exact foreground, then explicitly launch `ambient-desktop-agent.exe --smoke-autohotkey-demo`. The flag is a test-only command-line authorization; the model and normal executor cannot launch or press it. Pass requires `file-open-guidance-shown`, `autohotkey-demo-result` with `verified: true`, a visible standard Open picker, an empty filename, and no selected file.
- Use `npm run tauri -- build` for canonical production artifacts. Plain `cargo build --release` omits Tauri's `custom-protocol` production path and can produce a binary that tries `localhost:1420`; it is not a valid packaged-runtime test.

Verified 2026-08-29: 115 TypeScript tests, 26 Rust unit tests, 3 orb-safety tests, Cargo check, frontend build, live Word demonstration, and canonical MSI/NSIS packaging passed.

## Panel focus, CLI discovery, contrast, and black-screen verification — ADA-057–060

- Run `npm test -- --run tests/surfacePolicy.test.ts tests/windowSafety.test.ts`. Acceptance is the three-state orb policy: closed/minimized → show, open/background → focus without card re-render, open/focused → hide. Native state must include both `is_minimized` and `is_focused`.
- Run `npm test -- --run tests/providerSettings.test.ts tests/settingsContrast.test.ts` and `cargo test --manifest-path src-tauri/Cargo.toml provider::tests::`. Acceptance includes `PATH`/`PATHEXT` discovery for `codex`, `claude`, `cn`, `hermes`, `opencode`, and Antigravity's actual `agy` command; version/status rendering; disabled missing routes; safe stdin command specs; and measured settings text contrast of at least 4.5:1 in both palettes.
- `--smoke-provider-question` submits `Reply with exactly MYBUDDY_CODEX_READY and nothing else.` through the normal provider request handler. With `codex-cli` persisted, pass requires a normal answer card containing that sentinel and no generic provider-error event.
- For black-screen correlation, monitor new process identities and visible top-level window classes across a natural five-minute boundary, then compare exact timestamps with `%USERPROFILE%\.lmstudio\startup\ensure-local-models.log` and MyBuddy JSONL. Do not attribute unrelated processes by timing alone and do not disable a task unless a visible window/process owner is captured.
- ADA-060 acceptance uses `%LOCALAPPDATA%\Temp\watch-825-black-flash.py` at 20 ms polling. Before the correction it captured a top-level `WindowsTerminal.exe` window titled for Administrator PowerShell at the task boundary. After changing only the action to `%USERPROFILE%\.lmstudio\startup\run-ensure-local-models-no-console.exe`, run `schtasks /run /tn "\LM Studio - Ensure Local Models"`, verify `Last Result: 0`, then capture a natural five-minute boundary. Pass requires zero `visible-window` events and no PowerShell/Windows Terminal process in the relevant watcher set.
- Verify the helper is PE32+ with Windows GUI subsystem (`Subsystem = 2`), and verify `%USERPROFILE%\.lmstudio\startup\no-console-launcher.log` records exit code `0`. Run `lms ps`; `instruct` must remain at 65,536 context and `autocomplete` at 8,192. The task XML backup is `%USERPROFILE%\.lmstudio\startup\backups\LM Studio - Ensure Local Models.before-no-console.xml`.

## Structured guidance provider verification — ADA-056

Run `npm test -- --run tests/fileOpenGuidance.test.ts tests/userRequest.test.ts` and `cargo test --manifest-path src-tauri/Cargo.toml computer_use_takeover`. LM Studio guidance and action planning must use `/v1/responses` with `reasoning.effort = none`, explicit exact-JSON instructions, and native schema validation. OpenAI-compatible and CLI providers retain their existing routes. A guidance failure must log `file-open-guidance-error` and render the dedicated guidance card rather than `qwen-question-error`.

Runtime acceptance: launch `ambient-desktop-agent.exe --smoke-file-open-guidance` with Word as the prior app. The real form must log `requestClass: show-file-open-guidance` followed by `file-open-guidance-shown` for Microsoft Word and no later generic Qwen error.

## Foreground/focus verification — ADA-055

Run `npm test -- --run tests/userRequest.test.ts tests/capabilityRequest.test.ts tests/fileOpenGuidance.test.ts` and `cargo test --manifest-path src-tauri/Cargo.toml computer_use_takeover`. Acceptance requires foreground/front/focus/activate wording to classify as `takeover-preview`, never reach generic `ask_qwen`, expose `bring_to_front` only in the strict planner schema, reject it outside an explicit foreground goal, pass exact PID/HWND to cua-driver, and verify both integer and hexadecimal `now_fg_hwnd` response shapes.

Live Windows acceptance used Word PID 49884/HWND 590358. `cua-driver call bring_to_front` returned `landed_on_target: true`, `raised: true`, and `now_fg_hwnd: "0x90216"`; hexadecimal `0x90216` equals decimal 590358. No app-name branch or direct `SetForegroundWindow` code was added.

## Dynamic show-how and app-general Computer Use verification — ADA-053/054

Run `npm test -- --run tests/fileOpenGuidance.test.ts tests/capabilityRequest.test.ts tests/userRequest.test.ts` to verify that instructional wording outranks takeover, supplied state-derived click steps render without code, Computer Use is a separate action, and unknown apps receive the general allow-once route rather than an adapter queue.

Rust tests for `computer_use_takeover` verify two state-driven contracts. `plan_computer_use_guidance` sends only the exact app's bounded semantic inventory to local Qwen and rejects code/command/shortcut output. `execute_computer_use_goal` performs at most eight 45-second inspect/plan/validate/click/fresh-inspect steps. The only mutating driver tool is `click`, and only a current enabled opaque token with an allowed semantic role is accepted. No app name, menu path, key, coordinate, typed value, shell command, or model-generated tool name is executable.

`--smoke-file-open-guidance` remains instruction-only and cannot approve itself. Final native takeover acceptance must start with the target app in a known state, use a physical click on MyBuddy's protected Yes action, then prove fresh same-process UI state and a `computer-use-result` audit event. Synthetic Computer Use must not be able to press MyBuddy's approval UI.

## Bounded visible-window diagnostic verification — ADA-052

Run `npm test -- --run tests/windowContext.test.ts tests/providerNoConsole.test.ts` for intent classification, one-click terminal offers, secret redaction, whitespace normalization, bounded prompts, truthful card provenance, exact-window native command registration, no screenshot/OCR API, and blank-provider-response rejection. Rust tests cover pre-capture sensitive-window blocking, LM Studio Responses request shape, and non-empty `output_text` extraction.

`--smoke-window-context` waits for normal observation, opens the existing bounded panel, and submits **Read the error in my terminal and help me fix the command** through the real form handler. Before launch, place the intended terminal in the foreground. Pass requires `window-context-analyzed` with the exact terminal process, `source: "accessibility-visible-text"`, no raw text in JSONL, a non-empty card labeled as bounded visible-window text, and no invented path when the path is absent. Use `--smoke-window-context` only for an approved interactive test with an independent escape route.

LM Studio ordinary questions use `/v1/responses` with `reasoning: { effort: "none" }`; ambient structured analysis and non-LM-Studio providers retain their existing routes. Do not replace this with a larger Chat Completions token budget: Qwen3.6 can consume that budget entirely in `reasoning_content` and return empty `content`.

## Local desktop-state verification — ADA-064

Run `npm test -- --run tests/desktopState.test.ts tests/userRequest.test.ts tests/windowContext.test.ts` for the two intent routes, typo-tolerant application extraction, truthful card provenance, bounded native process matching, command registration, and non-actuating smoke hooks. Rust coverage canonicalizes `.exe` names and the Microsoft Word/`WINWORD.EXE` alias without invoking a shell.

`--smoke-active-window-status` leaves the panel hidden for eight seconds so normal observation can retain the current privacy-approved foreground app, then submits **what do you see on the screen** through the real form handler. `--smoke-running-app-status` submits the exact reported **is notepad++ runing** phrase. Pass requires `user-request` with `active-window-status` or `running-app-status`, followed by `desktop-state-answer`; the rendered card must state local desktop metadata and no screenshot/screen pixels. Neither smoke trigger acts on another application.

## No-popup verification

Run `npm test -- --run tests/localUtility.test.ts tests/providerNoConsole.test.ts` to verify in-process clock handling, truthful source labeling, Windows `CREATE_NO_WINDOW`, and direct non-terminal macOS/Linux CLI execution. `--smoke-time-question` opens the existing panel and submits the fixed text `what time is it` through the real form handler for deterministic runtime inspection.

For Windows runtime evidence, snapshot process IDs and visible `ConsoleWindowClass`/`CASCADIA_HOSTING_WINDOW_CLASS` windows before the smoke, poll through the answer, and compare ancestry against the exact MyBuddy-AI PID. Pass requires `local-utility-answer` with `process: "in-process"`, no shell descendant of MyBuddy-AI, and no newly visible console window. Unrelated shells must be reported as non-descendants rather than attributed to the app.

## 0.1.5 operational additions

The main Tauri window uses `decorations: false`, `transparent: true`, `resizable: false`, and `alwaysOnTop: false`. Transparency is constrained by `apply_thought_bubble_region`: Win32 `SetWindowRgn` combines one rounded body and exactly three elliptic trail regions, so the transparent 430×610 WebView does not retain a rectangular hit surface. The custom `.panel-header` remains the drag region and the in-panel minimize control remains the restoration-safe hide affordance.

## 0.1.6 portable harness verification

Run `npm run test -- tests/harnessPortability.test.ts` to verify the canonical harness structure, bundled Tauri resource mapping, child-process `MBAI_HARNESS_PATH`, credential-free cron registry, absence of workstation-specific paths, and the opaque macOS window override.

Run `python harness/scripts/install_harness.py` to configure and verify the default, Codex, Claude, and Qwen Hermes profiles. Run `python harness/scripts/sync_cron.py` to validate the declarative cron registry without changing scheduler state. Use `--apply` only after explicit approval for the jobs present in `harness/cron/jobs.json`.

Syntax-check all harness Python without creating bytecode using `python -c "from pathlib import Path; [compile(p.read_text(encoding='utf-8'), str(p), 'exec') for p in Path('harness').rglob('*.py')]"`. A privacy-safe Gmail readiness check is `python harness/skills/composio-gmail/scripts/composio_gmail.py status`; it may report connection counts but must not print credentials or account identifiers.

`orb.rs` emits `orb-moved` only after a real drag release and work-area clamping. The frontend invokes `reposition_agent_surface`; native code does nothing if the panel is hidden, otherwise it places the panel beside the current orb, emits `thought-trail-side`, mirrors the DOM trail when required, and reapplies the matching native region.

The orb returns `HTCAPTION` from `WM_NCHITTEST`, so physical right-clicks arrive as `WM_NCRBUTTONUP`, not reliably as `WM_CONTEXTMENU`. Both messages must route to the same bounded `show_context_menu` handler. Regression coverage requires the nonclient message explicitly; checking only that popup-menu code exists is insufficient.

Orb `open-panel` handling must call `get_agent_surface_state`. Hidden/minimized means show/restore; visible but unfocused means activate without re-rendering; visible and focused means hide. Do not reintroduce frontend-only visibility/focus decisions.

Word File > Open launches the fixed PowerShell/COM helper with Windows `CREATE_NO_WINDOW` (`0x08000000`). This suppresses only the automation console; `WINWORD.EXE` and its modal Open dialog remain visible.

Persistent approvals are stored under WebView local-storage key `mybuddy-capability-grants`. Only the three compile-time capability IDs are accepted. Each grant records grant time, use count, and last-use time; creation/use/revocation are also sent through redacted diagnostics. Settings must retain per-capability revocation.
LM Studio persistence uses `%USERPROFILE%\.lmstudio\startup\ensure-local-models.ps1` and scheduled task **LM Studio - Ensure Local Models**. The task has a delayed-logon trigger plus an idempotent five-minute health trigger. Recovery preserves `instruct` at 65,536 context, `autocomplete` at 8,192, parallel 1, GPU max, and no TTL. Verify with `lms ps`, `/v1/models`, native allocation metadata, and a real completion.

Always package with `npm run tauri build`; a direct `cargo build --release` can create a native orb whose WebView frontend does not initialize. The guarded timeout range is 5–120 seconds. The internal `--smoke-minimize-panel` trigger exercises the exact frontend minimize handler and must end with the Tauri panel HWND hidden while the orb/process remain visible/alive.

Provider settings are stored in the application config without secrets. OpenAI-compatible keys use Windows Credential Manager target `MyBuddy-AI/OpenAI-Compatible`. CLI discovery resolves executable aliases without a shell and probes versions with no-window creation. CLI prompts go over stdin under restricted modes; never concatenate user text into a shell command.

The bounded Word launch capability is argument-free: `execute_word_launch` uses only approved Office `WINWORD.EXE` locations, restores an existing `OpusApp` window or starts Word, and verifies the main window is visible. Requests matching open/start/launch/run plus MS Word render `approve_word_launch`; they must never fall into the adapter-review queue. Word File > Open remains a separate command and approval.

The canonical automation entry point is:

```powershell
.\scripts\ambient-agent.ps1 -Action <Setup|Status|Logs|Stop|Verify|Dev|Build>
```

## Actions

### Setup

```powershell
.\scripts\ambient-agent.ps1 -Action Setup
```

Checks the Windows prerequisites and installs npm dependencies. It does not modify LM Studio, load or unload models, configure startup, or grant privacy permissions.

### Status

```powershell
.\scripts\ambient-agent.ps1 -Action Status
```

Reports tool versions, loaded LM Studio models, and local API health.

### Verify

```powershell
.\scripts\ambient-agent.ps1 -Action Verify
```

Runs the release gate:

1. `npm test`
2. `npm run build`
3. `cargo test --manifest-path src-tauri/Cargo.toml`
4. `cargo check --manifest-path src-tauri/Cargo.toml`

The script exits on the first failed command.

### Dev

```powershell
.\scripts\ambient-agent.ps1 -Action Dev
```

Starts Vite and the Tauri Rust host with the bounded native orb. This is an interactive action: do not run it unattended or while the user depends on the desktop. Stop it with `Ctrl+C` or run `-Action Stop` from another terminal.

### Logs

```powershell
.\scripts\ambient-agent.ps1 -Action Logs
```

Prints the last 100 lines of the redacted native JSONL diagnostic log.

### Stop

```powershell
.\scripts\ambient-agent.ps1 -Action Stop
```

Terminates every `ambient-desktop-agent` process and verifies none remains.

### Build

```powershell
.\scripts\ambient-agent.ps1 -Action Build
```

Runs Verify first, then builds native release bundles. Output is under `src-tauri\target\release\bundle`.

### Guarded smoke test

```powershell
.\scripts\guarded-smoke-test.ps1 -TimeoutSeconds 30
```

This separate fail-closed harness:

1. refuses to start if an agent process already exists;
2. launches the release executable with `--smoke-auto-suggestion --smoke-close-suggestion --smoke-minimize-restore`;
3. requires the native orb to report bounded circular topmost/nonactivating geometry;
4. requires the automatic suggestion no-activation path to report success;
5. invokes the native suggestion-close path and requires `suggestion-close-hidden` with `agentAlive`, `orbVisible`, and hidden visibility all true;
6. treats exit before the deadline—including exit after suggestion close—as failure;
7. minimizes the panel and sends the real orb `open-panel` event, requiring a native `surface-restored-from-minimized` record with true → false minimized state;
8. kills the exact process at the deadline, removes any same-name survivor, and verifies absence;
9. writes `src-tauri\target\smoke-test-result.json`.

For interactive orb-drag acceptance, run:

```powershell
.\scripts\guarded-smoke-test.ps1 -TimeoutSeconds 90 -RequireOrbDrag
```

The harness also requires a `panel-positioned` record with `overlapsOrb: false`. With `-RequireOrbDrag`, it waits for `native-orb-moved` and records `orbDragVerified: true`; no synthetic input is generated by the application or harness.

For the inner minimize-to-orb regression path, launch a release build with `--smoke-auto-suggestion --smoke-minimize-panel`, then verify the panel HWND is not visible, the orb HWND is visible, the process remains alive, and diagnostics contain `surface-hidden`. Do not accept a successful framework call without native visibility read-back.

### Fake-toast boundary test

```powershell
.\scripts\show-fake-toast.ps1 -Seconds 15
```

This creates a topmost but nonactivating MyBuddy-AI test message and closes it after the requested duration. It does not inject an observation event. A successful display must never be reported as notification detection because the current observer has no toast API, screenshot, or OCR adapter.

## CI-equivalent commands

A noninteractive agent or CI worker may run:

```powershell
$env:NODE_ENV = "development"
npm ci --include=dev
npm test
npm run build
cargo test --manifest-path src-tauri\Cargo.toml
cargo check --manifest-path src-tauri\Cargo.toml
```

## Automation safety

Automation must not:

- Change LM Studio model aliases or runtime allocation without an explicit task.
- Add the app to startup without user approval.
- Launch `Dev` or a release binary unattended on the user's active desktop outside the guarded test harness.
- Replace the native bounded orb with a transparent WebView overlay.
- Remove `WS_EX_NOACTIVATE`, the circular window region, the 192-pixel hard cap, monitor bounds checks, the runtime guard, or nonactivating automatic suggestion presentation without explicit review and new regression/interactive tests.
- Enable screenshots or input capture implicitly.
- Write secrets to configuration, logs, cards, or documentation.
- Expand the fixed Notepad++ `File > Open` command into general desktop authority. The in-panel confirmation is a bounded UX gate, not the independent capability broker required for broader takeover.
- Treat **Always allow this exact action** as approval for user/model-generated request text or a general executor. It applies only after `isFixedCapability` validates one of the three code-fixed IDs and remains revocable.
- Remove `CREATE_NO_WINDOW` from the modal Word helper unless a replacement proves no automation console can appear.
- Remove `SetWindowRgn`, enlarge its body/trail coordinates, or introduce any other transparent hit area without explicit product and input-safety review.
