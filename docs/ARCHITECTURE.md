# Architecture

## Relocatable repository and machine boundaries

All project assets are addressed relative to the repository root during development and relative to the packaged resource root after installation. Machine-owned locations—user profiles, application installation roots, vaults, credentials, and provider state—are discovered from platform APIs, environment variables, or explicit operator input. The configured Git remote is not a runtime dependency, and tracked files do not encode its host, owner, clone URL, or visibility.

## Bounded provider continuity and explicit new-conversation boundary — ADA-080

The composer owns one process-local `ConversationContext` capped at eight role-labelled messages and 2,000 characters per message. Before recording a new user turn, the frontend snapshots the prior window and supplies it with ordinary selected-provider completion calls. Native code validates roles, re-bounds the payload, serializes the recent exchange as delimited context, and leaves the current user request last. Empty history preserves the original one-shot prompt exactly.

This repairs a transport discontinuity: selected-agent planning already received prior messages, but ordinary equipped-agent passthrough called `ask_qwen` with only the latest sentence. Because each Hermes CLI invocation is a fresh bounded query, `can you get me the link to the email` arrived without the preceding email result and correctly—but unhelpfully—asked which email. The fix preserves runtime-owned email/vault tools; it does not add email logic to MBAI.

The visible **Clear** control defines a new conversation. It resets messages and prepared-application identity, removes pending approval state, clears the composer/card, and does not affect provider settings or external data. The control is hidden during active work so users cancel the owned request before discarding its context. Conversation content remains absent from diagnostics.

## Profile-backed selected-agent bridge — ADA-074/075

The persisted `codex-cli`, `claude-cli`, and `qwen-cli` choices launch `hermes -p hermescodex`, `hermes -p hermesclaude`, and `hermes -p hermesqwen` respectively. Startup loads that persisted selection before enabling the composer or running provider health checks; a settings-load failure leaves input disabled instead of silently retaining the HTML `lm-studio` default. These are the full configured agent runtimes, invoked through stdin-driven `hermes chat --query-file - --quiet` with a five-minute bound and no `--yolo` or permission-bypass flag.

This boundary was selected from live evidence: bare Codex and Claude advertised no email-search tool, bare Qwen lacked noninteractive authentication, while the installed Composio SDK had two active Gmail connections. The credential-free `composio-gmail` skill now lives in the project-owned `harness/skills` directory and exposes bounded read-only status/search to every selected-model profile. It discovers active connections dynamically, reads the machine-local credential without printing it, emits header metadata only, and implements no send/delete/move operation.

Ordinary questions sent to an equipped profile bypass MBAI's smaller host-tool planner and are passed directly with bounded role-labelled recent conversation when available, allowing the selected runtime to resolve follow-ups and discover its own skills, MCP, shell, email, and vault tools. System-state, demonstrate, and execute requests still use MBAI's bounded host planning. Nonvisual email/vault requests never fall back to `desktop.visual_workflow`. Provider-native access still does not bypass consequence policy: read/search and send/delete remain distinct, and explicit user intent is required for external mutation.

High-risk checks compare normalized complete words and phrases. Terms such as `format` still block a destructive formatting goal, but no longer reject benign words such as `information`.

## Portable selected-agent harness — ADA-076

`harness/` is the canonical portable source for MBAI-specific skills, workflow declarations, and cron definitions. Tauri maps the complete directory into the installed application's `harness/` resources. Native provider execution resolves that resource directory (falling back to the source tree during development) and sets `MBAI_HARNESS_PATH` on every CLI-provider child. Hermes profiles consume `harness/skills` through the documented `skills.external_dirs` setting; `harness/scripts/install_harness.py` performs and verifies that configuration through `hermes config set`.

Portable definitions are versioned with MBAI. Provider credentials, authorized connection identifiers, profile configuration, sessions, approvals, and live scheduler state remain machine-local. `harness/cron/jobs.json` is declarative and empty until a scheduled workflow is explicitly approved; `sync_cron.py` previews by default and creates only missing named jobs when invoked with `--apply`.

## Generic target-bound visual workflow and conversation context — ADA-073

Selected-agent turns now include up to eight prior user/assistant messages. Verified application preparation is also retained as explicit session state so a follow-up `show me` goal can resolve to the application MBAI just opened instead of the latest unrelated foreground window. This state is process-local, content-bounded, and not persisted to diagnostics.

The selected AI receives one application-agnostic `desktop.visual_workflow(application, goal, mode)` capability. The host resolves or launches the requested application through cua-driver, binds the workflow to the selected process, foregrounds it only for an approved visible demonstration, and repeatedly observes the frontmost eligible same-process window. Dialog and popup transitions may change HWND but never origin PID; a window from another process is rejected. Every semantic token is re-read before actuation, and the host—not application-specific code—verifies completion from fresh state.

Ordinary application launches, foreground actions, menus, and dialogs no longer register Word or Notepad++ visual commands. The selected AI supplies general application knowledge and intent; the native host supplies target acquisition, semantic interaction, transition ownership, policy, and verification. Specialized adapters are permitted only as optional deterministic API/script accelerators for bounded non-general tasks; they are not required for visual automation.

## Agent-first selected-provider runtime — ADA-071

MBAI is the visual and local-capability host for the selected AI, not a phrase gate in front of it. Composer requests now enter `executeAgentTurn` before the legacy compatibility classifier. Each turn supplies a typed registry, the selected provider returns one strict `tool | final | stop` decision, read-only tools execute automatically, observations return to the provider, and the loop ends after bounded progress or four planning rounds.

The current registry exposes active-window metadata, named-process status, running services, aggregated working-set ranking, bounded largest-file metadata, local date/time, consequential named-process termination, and the allow-once generic visual workflow. Unknown tools are rejected natively. Repeated identical calls stop the loop. Consequential process termination never executes during planning: the UI displays the exact process target, all/single scope, unsaved-work warning, and an allow-once action. The native adapter blocks protected/system/MyBuddy targets, caps matches, terminates in the background, re-enumerates processes, and reports success only when no requested target remains.

The existing classifier remains temporarily as a compatibility fallback when planning fails or explicitly stops for a capability not yet migrated. It is no longer the primary intelligence boundary. The current in-panel allow-once card is a UX boundary, not the independent native approval broker planned under ADA-600–613; the model cannot invoke its submit action, and production smoke does not synthesize approval.

## Explicit canonical vault-schedule context — ADA-063

CLI providers inherit their existing user-configured vault/email tools and permissions. Separately, the deterministic canonical-schedule adapter remains a narrow host capability for explicit vault/Obsidian plus schedule/calendar/appointment/event questions: it may resolve exactly one allowlisted note from `OBSIDIAN_VAULT_PATH`, `010_Personal/001_Schedule/001_Schedule.md`. Native code enforces a 64 KiB limit and wraps the content as untrusted reference data. This adapter grants no broader host-side vault search or write authority and is not a replacement for provider-owned tools.

## Three-state panel and detected CLI providers — ADA-057–059

Orb events now read a native `AgentSurfaceState { open, focused }`. Shared policy maps closed/minimized to show, open/unfocused to activate-only, and open/focused to hide; the activate-only branch deliberately avoids card rendering. Provider Settings resolves a fixed CLI catalog from `PATH`/`PATHEXT`, reports versions, and disables missing routes. Supported aliases are Codex `codex`, Claude `claude`, Qwen `qwen`, Continue `cn`, Hermes `hermes`, OpenCode `opencode`, and Antigravity `agy`. Discovery is informational: persisted user selection remains authoritative and no fallback is automatic. Settings colors are theme tokens rather than a hard-coded dark dialog mixed with light-theme text.

## Reasoning-disabled structured local planning — ADA-056

The Computer Use planner and guidance generator now use `provider::complete_structured`. LM Studio is routed through `/v1/responses` with per-request reasoning effort `none`; other OpenAI-compatible providers retain Chat Completions schema requests and CLI providers retain strict prompt/validator handling. Responses output is still parsed by native `PlannerAction`/`ComputerUseGuidance` validation because the live LM Studio build ignored its advertised `text.format` JSON schema. Guidance failures have a dedicated frontend boundary and cannot become generic question failures.

## Verified exact-window foreground primitive — ADA-055

Foreground/front/focus/activate wording now enters the same app-general approval route instead of ordinary Qwen. `PlannerDecision::BringToFront` is schema-constrained and independently rejected unless the approved goal explicitly requests focus. Native execution passes only the exact retained PID/HWND to cua-driver `bring_to_front`; `verify_foreground` parses integer or hexadecimal `now_fg_hwnd` and requires equality with the approved HWND. This deliberately visible operation has no app-name branch, UI walkthrough, `SetForegroundWindow`, keystroke, coordinate, or pixel fallback.

## State-derived guidance and app-general Computer Use — ADA-053/054

`src/core/userRequest.ts` gives instructional wording precedence over takeover verbs. For **show me**, `plan_computer_use_guidance` revalidates the exact target, captures a bounded accessibility inventory, asks local Qwen for schema-constrained ordinary click steps, rejects code/commands/shortcuts, and passes the validated steps to `fileOpenGuidanceCard`. Guidance performs no action and the card separately offers explicit Computer Use.

After approval, `execute_application_visual_workflow` resolves the named application and `execute_computer_use_goal` runs a bounded inspect → plan → validate → semantic action → fresh inspect loop against the origin PID and current same-process workflow HWND. Local Qwen receives the approved goal, current element tokens/roles/labels, and prior semantic action summaries; it returns strict `click|done|stop` JSON. Native code accepts only a current enabled token with an activation role, calls only cua-driver `click` in background mode, and revalidates privacy/identity after each mutation. Limits are eight steps and 45 seconds. There are no app-name branches, fixed walkthroughs, generated tool names, scripts, keys, typing, coordinates, or pixel/foreground fallback.

The executor is general across accessible applications but intentionally limited to semantic activation. Typed input and consequential/sensitive classes remain separate capabilities. The MyBuddy approval surface is outside the executor and synthetic Computer Use cannot authorize itself.

## Explicit exact-window accessibility context — ADA-052

The metadata observer now retains the HWND/PID of the last privacy-approved non-MyBuddy window. Explicit diagnostic wording or a one-click **Analyze current terminal** action invokes a Windows-only adapter that revalidates the exact window and metadata policy, then reads only `IUIAutomationTextPattern::GetVisibleRanges`. macOS/Linux return unsupported rather than inheriting Windows behavior. No screenshot/OCR dependency was added.

Frontend processing removes terminal cell-grid padding, bounds text to 12,000 characters, redacts common secrets, and wraps it as untrusted observed data before calling local Qwen. Raw text is never added to the detector, history, or JSONL. Reading, file selection, and execution remain separate authorities.

LM Studio question traffic uses `/v1/responses` with reasoning effort `none`; Qwen3.6 otherwise consumed the short Chat Completions budget in `reasoning_content` and returned empty `content`. Ambient structured analysis and OpenAI-compatible/CLI provider routes remain unchanged.

## Utility and child-process execution

Simple local utilities are resolved before provider availability checks. The current-time recognizer uses the WebView runtime's local `Date` and `Intl` APIs and returns without invoking Tauri or a model. LM Studio and OpenAI-compatible providers continue through in-process HTTP. Explicit CLI providers use one centralized background-process configurator: Windows adds `CREATE_NO_WINDOW`; macOS/Linux retain direct executable launch with piped streams and no terminal wrapper.

## Decision

Use a cross-platform Tauri host with a shared TypeScript policy/detection layer and replaceable native adapters. Do not make a Windows Service the application architecture.

## Why not a Windows Service

Windows Services execute in Session 0 and are intentionally separated from the logged-in interactive desktop. A proactive observer, card renderer, tray icon, and approval UI belong in the user session. If privileged operations are ever necessary, add a narrow helper service behind authenticated local IPC rather than moving the observer into Session 0.

The macOS analogue is a per-user LaunchAgent/menu-bar application with an optional privileged helper.

## Current component map

```text
active-win-pos-rs
  active app/title metadata
          ↓
src/core/privacy.ts
  fail-closed sensitive-context filter
          ↓
src/core/detector.ts
  repeated-switch episode detector
          ↓
src/core/agentRuntime.ts + qwen::plan_agent_step
  selected-agent plan → tool → observation loop
          ↓
src/core/agentTools.ts + native bounded adapters
  typed read-only and consequential capability registry
          ↓
Adaptive Cards + explicit approval/result cards
  visual progress, exact scope, and verified outcome
          ↓
Windows native orb + Tauri WebView + tray shell
  bounded nonactivating status · no-activate suggestions · explicit interaction
```

## Adaptive Cards

Adaptive Cards are an interaction serialization and rendering target. They are not the authorization system.

The current card supports:

- Hint request.
- Takeover preview.
- Snooze.
- Dismiss.
- Helpful/not-useful feedback.
- Pause/resume and manual analysis.

Future card submit payloads must include a correlation ID, episode ID, action name, requested scope, and expiration. An approval broker validates those fields and issues any execution capability independently.

## Platform edges

### Windows now

- Native Win32 circular status orb using `WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE`, native `HTCAPTION` dragging, release-time work-area clamping, a 192-pixel cap, monitor validation, and a timer-based fail-closed guard.
- The caption-hit-tested orb handles both posted `WM_CONTEXTMENU` and physical `WM_NCRBUTTONUP` through one fixed two-item menu. Close exits the application; minimize hides the orb while preserving the tray restoration route.
- Native GDI renderer reproducing the original cyan/violet/pink conic-style palette, radial highlight, edge shading, green status dot, and a bot-face center mark without adding a transparent rectangular WebView hit region.
- Separate transparent, undecorated Tauri/WebView2 Adaptive Card window constrained by a Win32 `SetWindowRgn` union of one rounded body and three elliptic thought dots. This removes the rectangular background without recreating an oversized transparent hit surface. The custom header supplies the drag region and in-panel minimize control. Automatic display remains non-topmost and no-activate.
- Tauri `CloseRequested` interception prevents native title-bar close from terminating the last WebView/app. Close requests hide the suggestion, emit frontend synchronization, and record redacted agent/orb-liveness diagnostics.
- A stationary orb click queries native visible/minimized/focused state: hidden/minimized shows or restores, visible/unfocused activates without replacing its card, and visible/focused hides. Placement uses the actual outer-window rectangle and current orb bounds to avoid physical overlap.
- After `WM_EXITSIZEMOVE`, the bounded orb emits `orb-moved`. A visible panel is repositioned beside the orb, its DOM trail is mirrored to the orb-facing side, and its native region is reapplied with matching geometry. Hidden panels are not opened by movement.
- The composer first asks the selected model to choose from the typed local tool registry or answer normally. The legacy request classifier remains only as compatibility fallback for unmigrated actions. Fixed Notepad++/Word adapters and their existing grant rules remain available through that fallback during migration.
- Fixed-card approvals are not an independent general broker and cannot authorize another application/action. General takeover remains blocked pending the separate broker/capability-token milestone.
- Nonactivating notification/toast surfaces are outside the current active-window metadata sensor. Supporting them requires a separate privacy-reviewed notification adapter or OCR milestone.
- Notification-area icon.
- Cross-platform active-window metadata crate using Windows APIs internally.
- Per-user process launched manually for the mockup.

### macOS status

- `tauri.macos.conf.json` replaces the transparent Windows panel with an opaque window and leaves `macOSPrivateApi` disabled, preserving an App-Store-compatible configuration.
- The Tauri/WebKit conversation panel, tray/menu-bar action, TypeScript core, Adaptive Cards, equipped-agent passthrough, and packaged harness are expected to port, but have not been built or smoke-tested on a Mac.
- The fallback panel is opaque and showable from the tray, but ordinary `window.show()` does not reproduce Windows no-activation or native shaped-region behavior.
- `active-win-pos-rs` can supply initial metadata after Screen Recording permission, but the current non-Windows window handle is `0`; exact-window workflows cannot use that snapshot.
- The native orb, shaped thought bubble, process/service/memory adapters, named-process termination, visible-window text, Word/Notepad++ adapters, AutoHotkey demonstration, and MBAI-owned secure API-key storage lack macOS implementations.
- Finder-launched GUI `PATH`, concurrent bounded CLI pipe draining, and native macOS automation/build scripts remain portability hardening items.
- See `docs/MACOS-COMPATIBILITY.md` for the release gate. Accessibility/AX, macOS credential storage, a native companion surface, and LaunchAgent startup require separate reviewed implementations.

## Buzz path

Add a versioned local transport adapter later:

```text
ObservationEvent → Episode → InterventionRequest
                                  ↕
                       Buzz event/command gateway
                                  ↕
                         InterventionResponse
```

The local agent remains useful if Buzz is unavailable. Buzz may coordinate, route, or display interventions, but it does not bypass local policy or approval.
