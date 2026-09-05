# As-Built Record

Date: 2026-09-04
Status: Interactive Windows suggestion mockup; not configured for startup
Source: repository root

## Source-control publication

The user authorized commit and publication after live contextual-email acceptance. The canonical `main` branch is committed and pushed to its configured remote. Repository hosting and visibility are intentionally not encoded in tracked content. Generated dependencies/build output and machine-local credentials, sessions, approvals, and provider state remain excluded.

## Repository portability correction

- Removed developer checkout, user-profile, vault, and fixed program-installation locations from tracked guidance and native launch candidates. Documentation now uses repository-relative paths, environment-variable roots, or operator-supplied placeholders.
- Removed the hard-coded hosting account/clone URL and repository-visibility characterization. Git publication is described only through the checkout's configured remote.
- The largest-files packaged smoke now receives `current_dir()` from the native host instead of embedding a workstation directory. Regression fixtures construct synthetic Windows paths, and a portability test scans tracked guidance for absolute home/drive paths, owner-specific clone URLs, and visibility claims.

## Contextual equipped-agent follow-ups and Clear reset — ADA-080

- The reported email-link failure was traced across the real routing seam. `ConversationContext` already retained the prior answer and agent-first planning consumed it, but the ordinary equipped-agent passthrough invoked `ask_qwen` with only the newest request. Each `hermes chat --query-file -` call starts a fresh query, so the selected AI had no representation of “the email” and asked the user to identify it again.
- The frontend now supplies the bounded prior user/assistant window to ordinary selected-provider calls. Native code validates user/assistant roles, caps history to the newest eight messages and 2,000 characters each, clearly delimits the prior exchange, and places the current request last. Empty history preserves the existing direct prompt.
- Added a visible **Clear** action that starts a new conversation by discarding message and prepared-application context, pending approval state, composer text, and the current card. Clear is hidden during an active request; **Cancel** remains the safe way to stop owned work first. No conversation text is added to diagnostics.
- RED–GREEN regressions cover the exact `can you get me the link to the email` follow-up, backend role/context transport, bounded context clearing, and UI reset wiring. Final automated verification passed 210 TypeScript tests across 74 files, 57 Rust unit tests, 3 orb-safety tests, the frontend production build, Cargo check, Rust formatting, and canonical MSI/NSIS packaging. MSI: 13,000,704 bytes, SHA-256 `4a834b88e9b16119ed6a279b9ceda61a3dcd69ed3e6628086327fc3f351e68d4`; NSIS: 11,517,522 bytes, SHA-256 `c114ca49e6f87c83e03ce3ca68fde7658706e37e52cf0fd18f69c14a9dae5a85`. After relaunching the canonical release executable, the user completed the real two-turn email/link flow and confirmed it works. No private email content was copied into diagnostics or documentation.

## Canonical Git repository, portable installers, and durable transcript capture — ADA-078/079

The relocation milestone copied the complete source into a clean repository root without `.git`, `node_modules`, `dist`, `.hermes`, or `src-tauri/target`; 216 included files matched by relative SHA-256. The target was initialized on branch `main`. Developer checkout locations remain operational state outside tracked documentation.

Added `docs/INSTALL.md`, `scripts/install-mybuddy.ps1`, `scripts/install-mybuddy.sh`, and `docs/AI-INSTALL.md`. They provide parallel click-through, code-automated, and AI-agent installation paths for Windows, macOS, and Linux. Windows remains the verified native implementation; macOS/Linux packaging steps are documented without claiming Win32 orb or adapter parity. The companion-first vision now cites the supplied 1980s My Buddy commercial while explicitly avoiding affiliation or reuse of toy assets.

The failed YouTube request was traced to the exact equipped-agent session. Caption retrieval succeeded with 189 segments and a declared duration of 7:33. The generated fallback script then asserted that the transcript must contain a cue exactly at 7:30, but the real final cue was 7:31. A prior `execute_code` attempt had also been blocked in unattended single-query mode; after the assertion failed, the turn hit its tool-iteration ceiling before retrying, so no vault write occurred.

Added the project-owned `youtube-to-vault` skill and deterministic helper. It validates video identity, nonempty monotonic timestamps, segment count, near-zero start, and duration bounds—never an exact guessed cue—then writes atomically and reads the exact bytes back. The original Floci transcript was saved and verified at `010_Personal/035_Knowledge_Base/DevOps/This Tool Runs Real AWS Services on Your Laptop For Free (Floci).md`, including all 189 segments through 7:31. Focused RED–GREEN regressions cover the exact 7:31/7:33 case and vault-root containment.

Clean canonical-checkout automation passed 207 TypeScript tests, 56 Rust unit tests, 3 orb-safety tests, frontend production build, and Rust check. PowerShell and Bash installer syntax checks passed. Native installer packaging and interactive app launch were not rerun for this documentation/harness milestone.

## Cancellable provider requests, safe live activity, and natural Edge targeting — ADA-077

- Diagnostic evidence showed the original Edge request selected `process.terminate_matching` but matched zero because `MS Edge browser window` was treated as a literal executable query; a later attempt fell through to equipped-agent passthrough and remained active until the five-minute provider bound. The visible Edge top-level process was identified and its exact PID tree was terminated; subsequent capture verified no Edge window remained. Edge may separately relaunch its configured `--no-startup-window` background process.
- Request IDs now cross the composer/provider boundary. The mini-screen exposes request-scoped **Cancel** and **Live log** controls; only host-authored stage labels/timestamps appear. Cancel invalidates the request before backend termination, discards late results, restores request-owned thinking state without disturbing newer work, and re-enables input.
- Windows equipped-agent processes are assigned to kill-on-close Job Objects. Live smoke exposed that a launcher PID can exit and re-parent the real provider descendant to MBAI; Job Object termination fixed that root cause and emitted a confirmed terminal cancellation with no young provider descendant left.
- Process lookup now normalizes natural display wording against running executable names, including `MS Edge browser window` → `msedge.exe`, while keeping PID/HWND internal. Protected-target rejection, target-specific allow-once approval, bounded matching, and post-action re-enumeration remain unchanged.
- Final gate passed 201 TypeScript tests, 56 Rust unit tests, 3 orb-safety tests, Cargo check/format, frontend production build, `git diff --check`, and canonical MSI/NSIS packaging. MSI: 13,275,136 bytes, SHA-256 `0b63359547dd04f1cb5eafd29e17ee30bcea952152e999cc00c5824eccdd7d93`; NSIS: 11,507,686 bytes, SHA-256 `8913111be4b5d64bfd67380a9468456f1a3fd6e0b1e2e403adcc3c53dcb81239`.

## Thin selected-agent passthrough for email and vault — ADA-074/075

- Root cause of the repeated capability refusals was a split startup state: native provider commands loaded the persisted `codex-cli` selection, but the frontend never loaded settings and continued routing as the HTML-default `lm-studio`. The reduced `agent-first` planner then framed requests around MBAI host tools and returned polite refusals.
- Startup now disables the composer, loads persisted settings, then runs provider health; failure stops safely instead of silently using another route. Ordinary questions for Codex/Claude/Qwen/Hermes pass verbatim to the full equipped profile. Local machine, demonstration, and execution intents retain bounded MBAI host planning.
- Added privacy-safe answer-quality diagnostics (`length`, `capabilityRefusal`, `listItemCount`) so a refusal cannot pass acceptance merely because a turn completed. Added exact packaged smoke phrases for important email and vault TODO requests. The equipped-agent subprocess timeout is bounded at five minutes.
- Packaged email acceptance used `codex-cli` → `agent-passthrough`, returned 13 list items with `capabilityRefusal: false`, and the Hermes session loaded `composio-gmail` plus `email-inbox-triage` before invoking the Gmail helper. The user independently confirmed email retrieval worked perfectly.
- Packaged vault acceptance used `codex-cli` → `agent-passthrough`, returned 48 list items with `capabilityRefusal: false`, and the Hermes session loaded `master-vault` plus `obsidian`, then performed master-vault searches and reads. Neither acceptance invoked MBAI visual workflow or host-tool approval. No private email or vault content was copied into diagnostics or this record.
- Final gate passed 185 TypeScript tests, 53 Rust unit tests, 3 orb-safety tests, frontend production build, Rust formatting, and `git diff --check`. Canonical packaging passed. SHA-256: MSI `7ae8a02eff7d8fd5775489137203f6c5ac9d0dcc16d3f3ee6b6505014d9f7fb1`; NSIS `38cdfccbe05d3516ca550a4d77a2b6aef2d94a8421d643d52d7e750156fe9ef3`.

## Generic target-bound visual workflow correction — ADA-073

- Root cause evidence from the diagnostic log showed `Show me how to open a file` was classified independently, captured Orca as the active process, and never ran the preceding Notepad++ launch as part of the compound goal. The generic executor then remained bound to the original main HWND and could not reliably follow the transient File menu.
- Added a bounded eight-message in-memory conversation window to selected-agent turns and a separately retained prepared-application identity. A verified Notepad++ launch records that identity; a later file-open teaching request resolves back to Notepad++ rather than whichever window became foreground. Context resets when MBAI exits and is not written to diagnostics.
- Removed the rejected `notepad-file-open-demonstration`, its native menu-coordinate code, frontend capability/card branch, and package smoke flags. Also retired the older Word/Notepad++ launch and File/Open visual command registrations so ordinary visual work no longer falls back to per-app executors.
- Added model-visible `desktop.visual_workflow(application, goal, mode)`. Generic native acquisition resolves or launches the requested application through cua-driver, binds the origin PID, observes the highest eligible same-process workflow HWND, follows owned dialogs/popups, validates fresh semantic tokens, and stops on wrong-process drift.
- Conversation history remains bounded to eight messages so contextual follow-ups can name the prior application. The selected-AI prompt explicitly requires application resolution from the current request or history and forbids substituting the incidental foreground window.
- Automated gates cover arbitrary application names, launch fallback, empty/ambiguous application rejection, same-process dialog transition selection, wrong-process exclusion, and absence of registered per-app visual commands. The canonical MSI/NSIS packages rebuilt successfully. Live requests selected `desktop.visual_workflow`; the only Notepad++ instance was elevated, minimized, and marked unsaved, so execution stopped safely rather than crossing integrity/scope. A later reported Windows Notepad dialog could not be corroborated by the process/window inventory or MBAI log and is not counted as acceptance. Compound/cross-turn plus second-application live acceptance remains pending.
- Final automated gate: 172 TypeScript tests, 44 Rust unit tests, 3 orb-safety tests, frontend build, Rust formatting, `git diff --check`, MSI, and NSIS packaging. SHA-256: MSI `edae17ab54e077b3a234293111ff0acd121ffeb369c6996d30f081bc9bc9add5`; NSIS `93c26bdff3a8c21f6821a20a2001149b18944e7983b1e2a7fa3834d6bb54930b`.

## Immediate request-progress reset and green thinking state — ADA-072

- New composer submissions now clear the prior Adaptive Card immediately, before selected-provider planning starts. The header changes to `Selected AI agent is working…` and subsequent route-specific progress text may refine it, so stale answer/suggestion text no longer makes a live request look idle.
- Replaced the blue transient question-mark orb with `agent_icons/system/thinking-green-question.png` and the `thinking-green-question` native avatar identity. The selected profile avatar is restored when nested work completes or fails.
- Added two regressions covering clear-before-thinking/provider ordering and removal of every blue-question reference. Final gate: 176 TypeScript tests, 42 Rust unit tests, 3 orb-safety tests, frontend build, Rust formatting, `git diff --check`, MSI, and NSIS packaging.
- Packaged live acceptance first rendered a stale mock suggestion, then submitted a real provider request. During provider work, the card body was visually blank, the header read `Asking selected model provider…`, the input was disabled, and the orb showed the green question mark. After completion, the configured blue bot avatar was visibly restored.
- Bundles: MSI 13,238,272 bytes, SHA-256 `242f61986967f9832a877e7ffd22fce10862bc13f901f422f0a44d054788fa24`; NSIS 11,486,263 bytes, SHA-256 `126bce2cb26ab057d18906c4005033a0b5c9637cdfa0d1d8a7d8b426de71a73e`.

## Agent-first selected-AI runtime and verified named-process termination — ADA-071

- Replaced classifier-first composer dispatch as the primary path with a bounded selected-provider `plan → tool → observation → answer` coordinator. The model receives a typed registry rather than relying on sentence-shape branches; unknown tools, repeated calls, malformed decisions, and overlong loops fail closed. Legacy classification remains only as compatibility fallback for capabilities not yet migrated.
- Registered active-window metadata, process status, running services, aggregated working-set ranking, bounded largest-file metadata, local date/time, and named-process termination. Read-only tools execute automatically and observations return to the selected provider before its final answer.
- `close all Notepad++ applications` now selects generic `process.terminate_matching` with `{ query: "Notepad++", all: true }`. Planning stops at an exact allow-once card warning about unsaved work. The native background adapter rejects protected/system/MyBuddy targets, caps matching processes, terminates only the named target set, re-enumerates, and reports success only when none remain. Generic cards no longer use file-picker copy.
- Fixed a live Codex boundary bug: a valid JSON agent decision was mistaken for Codex event JSONL. Codex output is now treated as an event stream only when its objects carry recognized Codex event types; strict planner JSON remains the answer.
- Packaged non-actuating acceptance displayed the exact Notepad++ target, all-process scope, unsaved-work warning, allow-once action, and verification promise. Approval was not clicked; Notepad++ remained at three processes. A disposable uniquely named process integration test verified real termination and zero matching processes afterward.
- Final gate: 174 TypeScript tests, 42 Rust unit tests, 3 orb-safety tests, frontend build, Rust formatting, `git diff --check`, MSI, and NSIS packaging. Bundles: MSI 13,238,272 bytes, SHA-256 `14f4888f4ff92041fd397187c32f6ef77ce24364edec002ab8423202ff9f661e`; NSIS 11,487,266 bytes, SHA-256 `6dae743dccd97f31d60acf62277fcb0739d9a6e8fea0660f8d1032cad83e30ea`.

## Executable-name process questions — ADA-070

- Root cause: running-process classification excluded periods, so ordinary executable names such as `orca.exe` fell through to the tool-free provider path even though native process inspection already supported `.exe` normalization.
- Process-status grammar now permits dots in bounded executable/application names and removes an optional natural-language `process` suffix before native lookup.
- Permanent regressions cover Orca, Chrome, and Notepad++ executable forms. Packaged acceptance for exact `is orca.exe running?` returned `Yes — Orca.exe is running.` from local process metadata.
- Final gate passed 165 TypeScript, 36 Rust unit, and 3 orb-safety tests plus build, formatting, and diff checks. SHA-256: MSI `8c7ce5739de06d0e2fa46708257f7bda96bd084e991230c27accdc012ffb9e6d`; NSIS `5329defa176a76e7059c8b4bfe7a0c735496f903ad4d0e52939d6f0dd1af78fd`.

## Bounded largest-file inspection — ADA-069

- Direct largest/biggest-file questions with a Windows root now route to a native metadata-only adapter before provider dispatch.
- The adapter limits results to 1–10, visits at most 100,000 entries, skips symlink traversal, reads paths/sizes only, and never opens file contents.
- A synthetic misspelled-directory request is retained as a regression. Live packaged acceptance verified that an absent requested directory with exactly one one-edit sibling is corrected transparently and returns five ranked files rather than a provider refusal. No workstation directory is embedded in the fixture.
- Final gate passed 162 TypeScript tests, 36 Rust unit tests, 3 orb-safety tests, frontend build, Rust formatting, and diff checks. SHA-256: MSI `4aa6ea7e2f879703f7fe47e5812aecf0fb4b4583869abb481e5dba8f06ef759a`; NSIS `95922b4330e27e0d7dffdc9c2b81efdad158b8c4d9068b52ff326345a7f594e8`.

## Sentence-shape-independent resource intent — ADA-068

- Root cause: the first capability planner still required a request to begin with `what`, `which`, or `list`; `can you give me...` was rejected before its resource meaning was evaluated.
- Removed sentence-opening gating. Ranked-resource intent now requires the semantic combination of application/process target, top/most/highest ranking, and memory/RAM/resources metric while explicitly excluding `how do I`, `show me how`, `teach me how`, and `walk me through` explanation intent.
- Added a six-answer paraphrase matrix, four explanation-boundary cases, exact reported wording, numeric counts in varied positions, number words one through ten, and packaged smoke coverage.
- Live packaged acceptance for the exact top-three phrase returned Chrome 3.23 GiB, Edge WebView2 2.64 GiB, and VmmemWSL 2.24 GiB at that moment. Final gate: 158 TypeScript, 35 Rust unit, and 3 orb-safety tests plus build, format, and diff checks. SHA-256: MSI `b26e0c0b4043a251c28f87cf42fd264f00ff2203c78f2b6ff625ae11b8465fcc`; NSIS `391b396728c9fd8c45c6c49b2ed8ca8ef1fce21ee80b6eec419a09ca88992516`.

## Capability-planned broad resource answers — ADA-067

- Root cause: MBAI's host routed requests before the selected model and exposed no general local tool-call loop to provider-only questions. Earlier singular/plural fixes still required memory-specific words, so **resources** escaped to plain text completion.
- Added `resolveLocalAnswerPlan` as the reusable boundary between user wording and registered read-only capabilities. It normalizes top/most/highest, app/application/process, memory/RAM/resources, requested count, metric, and interpretation disclosure. Explanation wording does not create an execution plan.
- The exact reported top-ten resources phrase is a permanent regression and packaged smoke. Broad resources currently means aggregated working-set memory, stated explicitly; this avoids a fabricated cross-unit CPU/memory/disk score.
- Live packaged acceptance returned ten ranked entries and exposed entries 9–10 through the scrollable card; no provider refusal or Task Manager instructions appeared. The final gate passed 148 TypeScript tests, 35 Rust unit tests, 3 orb-safety tests, frontend build, Rust formatting, and `git diff --check`. Package SHA-256: MSI `6b1dd53b3bf00630619c44b2689445ce393d08d6d5e1774984f5954a8d2bfb58`; NSIS `4c7f897a917e0c06d1cc73a50d4c1c29ab6c467039d7ce2aba9a75f99a46971d`.

## General local-answer routing and memory ranking — ADA-066

- Root cause: the first memory fix recognized only the singular phrase `what application...`. The plural request `what are the 5 applications...` fell through to the selected provider, which had no process snapshot and returned Task Manager instructions. This was phrase overfitting at the request classifier.
- The request class now recognizes bounded singular/plural top-memory questions across app/application/process, most/highest/top, and memory/RAM wording. It deliberately excludes **how do I** explanation wording. A count extractor defaults to one and caps requests at ten.
- A read-only Win32 adapter enumerates processes with ToolHelp, reads working-set bytes with `GetProcessMemoryInfo`, skips inaccessible/system processes, aggregates case-insensitive executable groups, ranks by total working set, and returns only the requested entries. No provider, screenshot, Task Manager, shell, process control, or approval is involved.
- Product rule: direct machine questions perform the needed read-only local work and answer; **how** explains; **show/teach** offers a paced demonstration; **do it for me** uses scoped API/code first and AutoHotkey or verified Computer Use when clicks are required.
- Live packaged acceptance answered the exact five-application question with Google Chrome 5.57 GiB, VmmemWSL 2.83 GiB, Msedgewebview2 2.70 GiB, Svchost 1.72 GiB, and Llama-server 1.23 GiB at that moment. Final gates passed 146 TypeScript tests, 35 Rust unit tests, 3 orb-safety tests, frontend build, Rust format, `git diff --check`, and MSI/NSIS packaging. SHA-256: MSI `618953c5cef4755c60aa9ce48850ad0826ff0e3b0737f1970e33a451d14bc04d`; NSIS `8dca2c9a67a15285b232fa1a30c497a06baf37dfcb8659f94df0594815860ca3`.

## Assistant-first services, Notepad++, and connected tools — ADA-065

- Root causes: service questions were consumed by the named-application regex; named Notepad++ launch/foreground goals were bound to the unrelated latest Orca/Explorer window; story creation entered a click-only executor that prohibited launch and typing; Claude was started with `--safe-mode --tools ""`, disabling the user's connected Composio MCP.
- Added a separate pre-provider Windows-service request class and native Service Control Manager adapter. It reports the running count and at most 40 sorted display names without shelling out, exposing configuration, or granting service-control authority.
- Added fixed Notepad++ launch/foreground and one-time generated-story capabilities. Launch starts/restores only Notepad++ and verifies exact foreground HWND. Story creation asks the selected provider for story-only text, enforces nonempty/≤500-word/20,000-character/control-character bounds, writes and reads back a uniquely named Windows temporary draft, opens it in a dedicated Notepad++ instance, and verifies the exact file tab/window title. This replaced unreliable cross-process Scintilla messages.
- Changed provider inheritance intentionally: Codex keeps user config in a read-only ephemeral sandbox; Claude runs restricted with `dontAsk`, no session persistence, and user MCP connections available instead of safe-mode tool erasure. A content-free live Claude probe confirmed Composio categories including Gmail; the current Codex CLI MCP list did not show Composio and is documented honestly.
- Corrected the provider contract: Codex plain-text output is accepted directly while legacy JSONL assistant events remain supported, and explicit user requests no longer refuse based only on stale startup health. Autonomous background suggestions may still use the health hint.
- Exact regression tests and release smokes now cover both service phrases, Notepad++ foregrounding, and the complete ≤500-word story workflow. Normal action flow still requires approval; test-only acceptance flags are not model-accessible capabilities.
- Final acceptance passed 142 TypeScript tests, 34 Rust unit tests, 3 orb-safety tests, frontend build, Rust format, `git diff --check`, MSI/NSIS packaging, live 149-service enumeration, verified Notepad++ foregrounding, and a verified 111-word Codex story draft. Package SHA-256 values: MSI `05073404992cad9bcc831b8914d5105a91eebddd053d69faf99c0fadf72641cd`; NSIS `b5ff13cb95cee811a8532fc41ccc8f9bfbcb80802a70007d1ccbd148c4edbe13`.

## Direct local desktop-state answers — ADA-064

- Root cause: both reported phrases fell through to the generic selected-provider branch. That branch intentionally receives no desktop tools or screen content, so the model accurately refused but MBAI failed to use the bounded local state it already owned.
- Added a pre-provider `active-window-status` route for **what do you see on the screen**. It reports only the last privacy-approved non-MyBuddy process/window metadata, explicitly says it cannot see pixels, and fails closed when no approved snapshot exists.
- Added a pre-provider `running-app-status` route for **is Notepad++ running/runing**. A native ToolHelp process snapshot matches canonical executable names and returns only the boolean/matched names to the frontend; it uses no shell, Task Manager, model, launch, or control path.
- Live release acceptance answered **Before you opened MyBuddy, the active app was Orca, with the window “Orca”. I can inspect active-window metadata, not screen pixels.** It separately answered the exact typoed phrase **Yes — Notepad++ is running.** Diagnostics recorded both request classes and both `desktop-state-answer` outcomes.
- Final verification passed 127 TypeScript tests, 30 Rust unit tests, 3 orb-safety tests, Rust format/check, frontend build, `git diff --check`, and canonical MSI/NSIS packaging. Final unsigned bundles: MSI SHA-256 `a2deb2b49fd67a1ace0c319a4d3bfbb3aef0df19f9c6e29634587a10ee37b5fb`; NSIS SHA-256 `f155d03256872128e2b406961efb5ed8ce839c5304dfeb3683b538fb0001f223`.

## Start-menu wording to verified Word launch — ADA-062

- Root cause: `resolveTakeoverCapability` correctly recognized `run word`, but `src/main.ts` discarded the result by rendering `takeoverRequestCard(request, null)`. The request inherited foreground Orca as its Computer Use target and the exact-window guard stopped it.
- Fix: the frontend now renders the resolved fixed capability, avoids capturing current-app approval for fixed actions, and records `takeover-preview-rendered` with the selected route. Unknown goals retain exact-current-app Computer Use.
- Live release smoke submitted the exact reported phrase and logged `word-launch` → `approve_word_launch` → `verified: true`. It created `WINWORD.EXE` PID 12124 and a visible Word window, while the thinking avatar restored and LM Studio remained running.
- Final verification: 117 TypeScript tests, 26 Rust unit tests, 3 orb-safety tests, Cargo check/format, frontend build, `git diff --check`, and canonical MSI/NSIS packaging passed.
- Final packages: MSI SHA-256 `ae2a7cefe8d0851c77619ea9ae5765242306e7ac7ff39e900e97c66c48d9f561`; NSIS SHA-256 `f1c09da10f812df96463949af5f50afaceb08fea6d8549a8ff410ae6bcb587a2`.


## Visible AutoHotkey-guided demonstrations — ADA-061

- Changed instructional intent to the user-approved demonstration contract: `show me`, `teach me`, and `walk me through` render state-derived guidance plus Normal/Slow/Cancel. Selecting a speed starts one scoped run.
- Fixed the Word failure caused by approval-time target drift from Microsoft Word to Windows Shell Experience Host. The guidance card now captures an immutable exact PID/HWND/title/goal; later observer updates cannot replace it.
- Detected and runtime-verified existing AutoHotkey v2.0.26. MyBuddy generates fixed one-step scripts with no tray/console, exact target activation, paced visible cursor movement, exact child/same-PID validation, direct click messages, cancellation polling, per-step fresh state, eight-step and 120-second ceilings, and no hooks/input blocking.
- Added validated `type`: current enabled Edit/ComboBox token, text verbatim from the approved goal, numeric UTF-16 script payload, and no raw/model-authored AutoHotkey source. Added generic semantic file-picker completion and a blue question-mark thinking avatar with guaranteed selected-profile restoration.
- Live production acceptance against Word PID 49884/HWND 590358 dynamically navigated File → Open → Browse at Normal speed, opened and semantically verified the standard picker, left the filename empty, selected no file, restored Friendly Blue Orb Bot, and logged `autohotkey-demo-result` with `verified: true`.
- Verification passed 115 TypeScript tests, 26 Rust unit tests, 3 orb-safety tests, Cargo check, frontend build, canonical Tauri build, MSI, and NSIS packaging.

Final unsigned bundles: MSI 13,160,448 bytes, SHA-256 `f755dd3e2af3ff18f9130a0e64561db8f1441f90b0c1a88d6cd7e30495a1070e`; NSIS 11,421,111 bytes, SHA-256 `1f69cdd4861e7c3d895b00113f96a72b172e129e1701b9a7e31b7b8241c4807c`.

## Panel focus, detected CLI providers, Codex trial, and Settings contrast — ADA-057–060

- Replaced the orb's two-state visible toggle with native `open/focused` readback and a shared three-state policy. An open background panel is activated without hiding or re-rendering; hidden/minimized opens and focused-visible hides. Automated state/native tests pass. High-DPI synthetic clicks were verified lost, so final physical mouse acceptance remains in Testing rather than being fabricated.
- Added PATH/PATHEXT discovery and version/status UI for Codex (`codex`), Claude (`claude`), Continue (`cn`), Hermes (`hermes`), OpenCode (`opencode`), and Antigravity (`agy`). Missing routes are disabled, discovery never changes selection, and all Windows probes/provider processes use no-window creation.
- Persisted `codex-cli` for the trial. The exact read-only/ephemeral/no-rules/no-git-check stdin route returned `MYBUDDY_PROVIDER_OK`; rebuilt MyBuddy then rendered `MYBUDDY_CODEX_READY` through its normal question path. Normal runtime PID is 48024. LM Studio `instruct` and `autocomplete` remain loaded.
- Replaced the light-theme dark-on-dark Settings defect with theme-aware surface/label/field/placeholder/border tokens. Automated contrast is at least 4.5:1; live light-mode inspection showed readable labels, selected Codex/version, and provider status text.
- Two natural five-minute captures found no MyBuddy shell child or visible console. The LM Studio keepalive ran during the observed boundary without a visible window. Windows Desktop Spotlight `backgroundTaskHost.exe` is only a lead; ADA-060 remains Testing pending exact flash-time ownership.
- The user subsequently reported an exact 20:25 local flash. Task Scheduler recorded `LM Studio - Ensure Local Models` at 20:25:02, and its log completed at 20:25:03.250 with both aliases already loaded. A 20 ms process/window capture across the next 20:35 boundary detected a top-level `WindowsTerminal.exe` window titled for the system PowerShell executable while the same interactive task ran. The task invokes `powershell.exe ... -WindowStyle Hidden` every five minutes under an interactive token; Windows Terminal hosting can therefore exist before the hidden state is applied. Desktop Spotlight also started at 20:35 but created no visible window in that capture. This makes the LM Studio task launcher the leading root cause of the black terminal flash, not MyBuddy or model loading. No task, Spotlight, MyBuddy, or LM Studio state was changed pending approval of a true no-console launcher correction.
- After the user reported the same flash exactly at the 20:40 run and approved a launcher-only correction, the task XML was backed up and its action was changed to `run-ensure-local-models-no-console.exe`. The 5,632-byte PE32+ helper is Windows GUI subsystem 2, starts only the existing script with `CreateNoWindow = true`, waits, logs, and returns the child exit code. A forced task run and the natural 21:00 run both returned `0`; the 20 ms natural-boundary watcher recorded 17 process starts and zero visible windows, with no PowerShell or Windows Terminal process in the relevant set. `instruct` remained Qwen3.6 35B at 65,536 context and `autocomplete` remained Qwen2.5 Coder 3B at 8,192. Five-minute cadence and LM Studio persistence are unchanged.
- Verification: 107 TypeScript tests, 20 Rust unit tests, 3 orb-safety tests, Cargo check, frontend build, diff check, canonical Tauri packaging, Codex smoke, and live Settings inspection.

Final unsigned bundles: MSI 13,103,104 bytes, SHA-256 `60fc53d84ea08985c7f6badfc57dff7ed6da46514cb7b38465dafb61d45cb9a6`; NSIS 11,390,571 bytes, SHA-256 `d97c426d4dd6ac083f4b0cec3d3cb569bd359da630186ce98e0e342d4a590a74`.

## Reliable local show-how guidance — ADA-056

- Reproduced the live failure: the guidance branch correctly classified the request, but LM Studio Chat Completions returned HTTP 200 with `finish_reason: length`, empty visible content, and 1,092 hidden reasoning characters. The outer catch then incorrectly rendered the generic Qwen failure card.
- Added `provider::complete_structured`: LM Studio planning/guidance now uses Responses with reasoning effort `none`, explicit exact-JSON instructions, and unchanged native schema/safety validation. Added a dedicated guidance-unavailable card and branch-specific audit event.
- Live rebuilt smoke against Word logged `show-file-open-guidance` followed by `file-open-guidance-shown` for Microsoft Word in 13.7 seconds with no generic Qwen error. No click or file selection occurred.
- Verification passed 98 TypeScript tests, 17 Rust unit tests, 3 native orb tests, Cargo check, diff validation, production build, and canonical Tauri packaging.

Final unsigned bundles: MSI 13,107,200 bytes, SHA-256 `398d649c41a03723dedff3f6910afcb1b41b6c615fc4118442c8eaafe81ddbe2`; NSIS 11,393,858 bytes, SHA-256 `ed24843288324961a07cbde1254e66c514636fce82f424b161c08ad915d52d1b`.

## Exact-window foreground intent and execution — ADA-055

- Reproduced the bad response: **bring it to the foreground** was classified as `question`, sent to text-only local Qwen without screen context, and produced a false manual refusal.
- Added foreground/front/focus/activate intent classification into the app-general Computer Use approval route. Added schema action `bring_to_front`, explicit-goal enforcement, exact PID/HWND invocation, integer/hexadecimal HWND parsing, exact `now_fg_hwnd` verification, and immediate completion for pure foreground goals.
- Live runtime action brought Word PID 49884/HWND 590358 forward. Driver read-back was `landed_on_target: true`, `raised: true`, `now_fg_hwnd: "0x90216"`; `0x90216` equals the approved decimal HWND 590358.
- Verification passed 97 TypeScript tests, 16 Rust unit tests, 3 native orb tests, Cargo check, production build, diff validation, and canonical Tauri packaging.

Final unsigned bundles: MSI 13,107,200 bytes, SHA-256 `6bd68ce41cd40bcd6e4902cf8c15cff25d0a247ba5284397f237406729699cff`; NSIS 11,392,226 bytes, SHA-256 `6beec97b96b8d569f03eaf612ece1568acaf39ec2a64ba413098fac5c8439930`.

## App-general state-driven Computer Use correction — ADA-054

- Reproduced the Word failure from the exact initial state. Word exposes `Button "File Tab"`, then `ListItem "Open"`, then `Button "Browse"`; the previous one-shot native-menu path could not see those staged Ribbon/Backstage controls. A live semantic inspect/click/fresh-inspect sequence opened and verified Word's native file picker without selecting a file.
- Removed the fixed `["File","Open"]` executor and the unknown-app adapter queue from the active route. `execute_computer_use_goal` now uses local Qwen to select one current semantic token per fresh state, validates that token natively, rechecks exact target/privacy, and stops on visible completion, ambiguity, sensitivity, no progress, eight steps, or 45 seconds. No app or walkthrough is encoded.
- Removed the static instruction walkthrough. `plan_computer_use_guidance` derives schema-validated ordinary steps from the exact app's current accessibility inventory and rejects code/commands/shortcuts. Guidance and execution approval remain separate.
- The protected MyBuddy approval UI correctly rejected synthetic self-approval during acceptance. Final rebuilt in-product Word proof is therefore pending one physical **Yes — use Computer Use** click; no bypass was added. External live Computer Use proved the dynamic Word sequence and the file picker outcome.

Verification passed 94 TypeScript tests across 22 files, 15 Rust unit tests, 3 native orb safety tests, frontend production build, Cargo check, diff validation, and canonical Tauri packaging.

Final unsigned, uninstalled bundles:

- MSI `MyBuddy-AI_0.1.5_x64_en-US.msi` — 13,103,104 bytes — SHA-256 `7ce867f2df5efc05393a6c9d9747b24304c125e1efa5c4f5e65c9fba402eb425`
- NSIS `MyBuddy-AI_0.1.5_x64-setup.exe` — 11,390,168 bytes — SHA-256 `e655682dafd885ee616de245e887a66abfdf1b224f07356d36a22fd3f214010f`

## Explicit bounded terminal/window diagnostics — ADA-052

- Reproduced the report against Windows Terminal: metadata observation knew the terminal title/process but ordinary Qwen received no terminal text. The visible error was `ipmo .\PSInlineAI -Force -Verbose`; PowerShell was at `~` and could not find a valid module file.
- Added exact HWND/PID retention after frontend privacy approval and a native Windows UI Automation adapter using visible text ranges only. Explicit diagnostic wording reads immediately; relevant generic troubleshooting answers can offer **Analyze current terminal**. No screenshot/OCR, hidden scrollback, clipboard, keystroke, broad control, file read, or execution capability was added.
- Added terminal-padding normalization, 12,000-character bounds, secret redaction, untrusted-data framing, truthful answer provenance, raw-text-free diagnostics, empty-answer rejection, and a no-invented-path rule.
- Diagnosed Qwen3.6 `instruct` empty answers: Chat Completions exhausted 320 and then 1,024 tokens in `reasoning_content`. LM Studio question calls now use `/v1/responses` with per-request reasoning effort `none`; ambient analysis and other providers are unchanged.
- Final `--smoke-window-context` runtime read 3,658 bounded characters from exact process `Windows Terminal Host`, recorded `window-context-analyzed` with source `accessibility-visible-text`, rendered a non-empty diagnosis, and declined to invent the absent module path. Raw terminal text was not logged.

Verification passed 87 TypeScript tests across 21 files, 11 Rust unit tests, 3 native orb safety tests, production builds, Rust format/check, and canonical packaging.

Final unsigned, uninstalled bundles:

- MSI `MyBuddy-AI_0.1.5_x64_en-US.msi` — 13,033,472 bytes — SHA-256 `5e8baa0825654b3b70a119e927d219642fe7d9a976ac7445f8c0dfb337ad33c8`
- NSIS `MyBuddy-AI_0.1.5_x64-setup.exe` — 11,333,444 bytes — SHA-256 `8675a018fc7eefbe641ebb6c8a519243b0e358ab05c8aec58ea8dd523c50466c`

## In-process time and cross-platform no-popup execution — ADA-051

- Traced `what time is it` through `question → ask_qwen`; LM Studio used in-process HTTP, but no local clock route existed. Added a direct time recognizer before provider health/model calls using `Date`/`Intl`, so the request creates no helper process and works independently of model availability.
- Corrected the card footer to **Answered in-process · no helper process or screen content** rather than claiming local Qwen handled the clock.
- Centralized CLI child configuration in `provider.rs`. Windows applies `CREATE_NO_WINDOW` to Codex, Claude, and Continue command paths; macOS/Linux launch the selected executable directly with piped streams and no Terminal/xterm/AppleScript wrapper.
- Did not adopt `wscript.exe` or a new .NET host: both are unnecessary for the clock and would add another process. Platform-specific native process creation is narrower and preserves bounded arguments.
- Live `--smoke-time-question` runtime recorded `local-utility-answer` with `process: "in-process"`; a 50 ms watcher found no MyBuddy-AI shell/console descendant and no newly visible console window. Final capture showed the correct local time and truthful in-process footer.

Verification passed 77 TypeScript tests across 20 files, 8 Rust unit tests, 3 native orb safety tests, frontend/Rust builds, Rust format/check, `git diff --check`, canonical packaging, and guarded runtime with `failure: null`.

Final unsigned, uninstalled bundles:

- MSI `MyBuddy-AI_0.1.5_x64_en-US.msi` — 12,996,608 bytes — SHA-256 `59db74255745d285fc0e28392a5d551d8ee34f760317b2b8f0d0e02acab0509c`
- NSIS `MyBuddy-AI_0.1.5_x64-setup.exe` — 11,311,583 bytes — SHA-256 `f2599602d383577431ad8b59e8dd3f2654a7dd7d0844ee98e11ca8fdb135fc4f`

## Physical orb right-click lifecycle menu — ADA-050

- Reproduced the defect with foreground `SendInput`: the shaped orb received physical right-click input but displayed no menu, while a posted context-menu path did display it.
- Root cause: `WM_NCHITTEST` returns `HTCAPTION` across the orb for native dragging, so real mouse right-click uses nonclient `WM_NCRBUTTONUP`; the window procedure handled only `WM_CONTEXTMENU`.
- Routed `WM_CONTEXTMENU | WM_NCRBUTTONUP` to the existing fixed menu without changing stationary left click, drag, bubble-follow, input-region, or menu scope.
- Runtime verification exercised the exact corrected message. **Minimize orb to system tray** produced native visibility false while PID 47536 remained responsive and logged `native-orb-minimized-to-tray`. A clean second run selected **Close MyBuddy-AI**, confirmed PID 50264 absent, and logged `native-orb-close-requested`.
- User accepted the ADA-049 result: the thought bubble works and follows MBAI.

Verification passed 71 TypeScript tests across 18 files, 8 Rust unit tests, 3 native orb safety tests, production builds, Rust format/check, `git diff --check`, canonical packaging, and guarded runtime acceptance with `failure: null`.

Final unsigned, uninstalled bundles:

- MSI `MyBuddy-AI_0.1.5_x64_en-US.msi` — 12,996,608 bytes — SHA-256 `40165994fcf69208e0ed2eccb37450ca60b4dea9a6fdec6bb27e9d7aeeec7702`
- NSIS `MyBuddy-AI_0.1.5_x64-setup.exe` — 11,309,863 bytes — SHA-256 `e3fc3fb049d6cf429224704be589724308eb379d2463dd67e780476286327782`

## Frame-free, orb-linked native thought bubble — ADA-049

- Removed the residual rectangular WebView background and the cyan/violet neon top pseudo-element. The document root is transparent while the bubble body itself remains opaque.
- Added `apply_thought_bubble_region`, which uses `CreateRoundRectRgn`, three `CreateEllipticRgn` calls, `CombineRgn`, and `SetWindowRgn`. Input/rendering is therefore limited to the visible rounded body and three dots rather than the full transparent 430×610 rectangle.
- Changed placement from fixed bottom-right collision avoidance to orb-relative placement. A real orb drag release emits `orb-moved`; `reposition_agent_surface` moves only an already-visible panel, mirrors the DOM trail if the panel is on the orb's right, and applies matching left/right native region geometry.
- Live capture confirmed no rendered rectangular frame and no neon top strip. Native rectangles showed the bubble ending at x=1340, the orb beginning at x=1352, and the final dot aligned to the orb center. Synthetic background drag was correctly refused by the native move loop; foreground synthesis was a verified no-op, so physical post-drag follow remains user acceptance rather than fabricated runtime evidence.

Verification passed 71 TypeScript tests across 18 files, 8 Rust unit tests, 3 native orb safety tests, production builds, Rust format/check, `git diff --check`, canonical packaging, and guarded runtime acceptance with `failure: null`, minimized restoration, panel/orb non-overlap, and exact-process cleanup.

Final unsigned, uninstalled bundles:

- MSI `MyBuddy-AI_0.1.5_x64_en-US.msi` — 12,996,608 bytes — SHA-256 `870ecd26296d91e86ce968a02ebb6be7815c63c01acd1813204900fdac1a373b`
- NSIS `MyBuddy-AI_0.1.5_x64-setup.exe` — 11,311,000 bytes — SHA-256 `151b7557d8a54c82d5457bb49a8c74b84e6367f69adee44efe7047288a2aabe4`

## Undecorated MBAI thought-bubble panel — ADA-048

- Removed the native Windows title bar by setting the fixed Tauri panel to `decorations: false`. The window remains hidden at startup, opaque, non-topmost, fixed-size, and nontransparent.
- Preserved the custom `data-tauri-drag-region` MyBuddy header plus in-panel Settings and **Minimize to orb** controls. The accepted native-state orb show/hide toggle is unchanged.
- Replaced the triangular speech pointer with three progressively smaller thought circles leading from the lower-right edge toward the orb and increased the bubble body's rounded silhouette. The thought trail is noninteractive DOM/CSS contained within the existing 430×610 bounded window.
- Visual runtime inspection confirmed no OS title bar, complete readable content, visible thought trail, and retained controls. No transparent or enlarged desktop hit surface was introduced.

Verification passed 70 TypeScript tests across 18 files, 8 Rust unit tests, 3 native orb safety tests, production builds, Rust format/check, `git diff --check`, canonical packaging, and guarded runtime acceptance with `failure: null`, minimized restoration, panel/orb non-overlap, and exact-process cleanup.

Final unsigned, uninstalled bundles:

- MSI `MyBuddy-AI_0.1.5_x64_en-US.msi` — 12,996,608 bytes — SHA-256 `c1b0f12d58457a8c8ea21917d6200e5301d73d01ea2ef2a7d176e6709fba77e4`
- NSIS `MyBuddy-AI_0.1.5_x64-setup.exe` — 11,308,877 bytes — SHA-256 `33f28ded8e711756d6f158a7583bd181e0d6681f19b4a64f3999810f78eb6d3b`

## Orb toggle, visible Word automation, exact persistent approvals, and talk bubble — ADA-047

- Replaced restore-only orb behavior with an authoritative native-state toggle. A stationary click hides a visible panel and shows/restores a hidden or minimized panel. The first guarded attempt exposed stale frontend state after native minimize; `get_agent_surface_open` corrected the root cause and the rerun passed restore and cleanup.
- Identified the reported black surface during Word File > Open as the visible PowerShell automation console held open by Word's modal COM call. The fixed helper now uses Windows `CREATE_NO_WINDOW`; Word and its native Open dialog remain visible.
- Added **Always allow this exact action** beside one-time approval for only `word-launch`, `word-open-dialog`, and `notepad-open-dialog`. Grants track creation, use count, and last use locally, emit redacted lifecycle diagnostics, auto-run later exact matches, and are individually revocable in Settings.
- Restyled the existing opaque bounded panel as a rounded MyBuddy speech bubble with a lower-right pointer and animated voice mark. No transparent window, global input handling, or enlarged hit surface was introduced. Runtime capture confirmed the complete readable panel and pointer.

Final verification passed 70 TypeScript tests across 18 files, 8 Rust unit tests, 3 native orb safety tests, production frontend/Rust builds, Rust format/check, `git diff --check`, canonical Tauri packaging, and a 120-second guarded run with `failure: null`, `minimizedWindowRestored: true`, `panelOrbNonOverlap: true`, and exact-process cleanup.

Final unsigned, uninstalled bundles:

- MSI `MyBuddy-AI_0.1.5_x64_en-US.msi` — 12,996,608 bytes — SHA-256 `2cdc2600ee69690c8bd6831a3a664d34e05ab252d2674be697729994e0681ce0`
- NSIS `MyBuddy-AI_0.1.5_x64-setup.exe` — 11,310,328 bytes — SHA-256 `a9a821363bf9b9b65add6e1a9d38e3cf27d17cf20f2aad37a443a565cc72d3d3`

## Reliability, provider, capability, and avatar completion — version 0.1.5

- Restored LM Studio after a later application restart left the server empty. The existing recovery script had only a logon trigger and LM Studio had `autoStartOnLaunch: false`; no MyBuddy-AI command unloaded a model. The scheduled task now adds an idempotent five-minute health trigger. Live verification restored `instruct` at 65,536 context and `autocomplete` at 8,192, both parallel 1/GPU max/no TTL, and real completions passed.
- Added explicit provider Settings for LM Studio, OpenAI-compatible HTTP, Codex CLI, Claude Code CLI, and Continue CLI. API keys are stored only in Windows Credential Manager. Default chat routes to `instruct`; ambient analysis routes to `autocomplete`.
- Added local capability requests with `needs-tested-adapter` status and no arbitrary executor. Added a second fixed adapter for Microsoft Word File > Open using Word COM dialog ID 80 and same-process `#32770` verification.
- Corrected simple Word launch requests: `open ms word for me` now resolves to `word-launch` and renders **Allow once and open Microsoft Word** instead of an adapter-review message. The argument-free executor starts/restores only the approved Word executable, verifies a visible `OpusApp` main window, and ends scope without opening a document or dialog.
- Renamed/cataloged 78 profile images, normalized oversized sources to 256×256 with original hashes retained, set `friendly-blue-orb-bot` as default, and added lazy local Settings selection plus native PNG validation/fallback.
- Added native orb right-click menu in required order: Close MyBuddy-AI, Minimize orb to system tray; tray Show Orb reverses minimization.
- Replaced the ambiguous in-panel X with **— Minimize to orb**. Investigation reproduced a black shell because Tauri `window.hide()` returned success while the native HWND stayed visible. Windows now uses targeted `ShowWindow(hwnd, SW_HIDE)` plus `IsWindowVisible(hwnd)` read-back and never blanks the DOM. Deterministic runtime verification showed the Tauri panel hidden while orb and process remained alive.

Final verification passed 63 TypeScript tests across 17 files, 8 Rust unit tests, 3 native orb safety tests, frontend production build, Rust format/check, `git diff --check`, canonical Tauri packaging, and a 120-second guarded run with `failure: null`, `panelOrbNonOverlap: true`, and exact-process cleanup. Runtime avatar diagnostics recorded `native-orb-avatar-updated` and `orb-avatar-selected` for the default image.

Final bundles (unsigned, built, not installed):

- MSI `MyBuddy-AI_0.1.5_x64_en-US.msi` — 13,000,704 bytes — SHA-256 `a0d000573ab15f368e6b3c752b091f2d7e45b1f490a626a0458093056b276945`
- NSIS `MyBuddy-AI_0.1.5_x64-setup.exe` — 11,303,701 bytes — SHA-256 `07c1b036b494a3b3b308ce863679642f2332c809899028cbe3727606625a6da6`

## Draggable orb, collision-free panel, and first bounded interaction — version 0.1.5

Version 0.1.5 makes the shaped native orb draggable through Windows `WM_NCHITTEST`/`HTCAPTION` handling. Windows owns the move loop; MyBuddy-AI clamps and records the released rectangle on `WM_EXITSIZEMOVE`. No global hook, input capture/suppression, raw input, or synthetic input was added. A click without movement still opens/restores the panel. The native orb now publishes the non-sensitive title `MyBuddy-AI Orb` for exact accessibility/test targeting.

The panel-placement path uses the actual physical outer-window size plus the current orb rectangle. Guarded diagnostics prove `overlapsOrb: false`. Live read-back ended with panel `(897,219)-(1340,865)` and orb `(1362,412)-(1438,488)`, leaving a 22-logical-pixel horizontal gap.

The composer recognizes one exact bounded capability: start/focus Notepad++, issue native File Open command `41002`, and verify a same-process `#32770` window titled `Open`. It selects no file and permits no other application action. The in-panel confirmation is a UX boundary, not the independent approval broker required for general takeover.

Verification passed 47 TypeScript tests and 9 Rust tests, frontend build, Rust format/check, and 0.1.5 packaging. A 90-second external-watchdog run reported `panelOrbNonOverlap: true`, `orbDragVerified: true`, no early exit, and exact-process cleanup. A separate guarded UI run created audit event `takeover-result` with `capability: notepad-open-dialog` and `verified: true`; Windows read-back showed Notepad++ PID 40784 with a visible dialog titled `Open`.

Bundles (built, unsigned, not installed):

- MSI `MyBuddy-AI_0.1.5_x64_en-US.msi` — 4,718,592 bytes — SHA-256 `0bb921da3da015b04109619ca9899ac653514348e7638df9efb564a033ae3d78`
- NSIS `MyBuddy-AI_0.1.5_x64-setup.exe` — 3,000,905 bytes — SHA-256 `d1bc89f20f4ad8fc932852d58ef24e2bc76fbca38af0ce297e0138e27783f604`

## MyBuddy-AI composer and minimized-window restoration — version 0.1.4

The approved visible product name is now **MyBuddy-AI**. Tauri product/window labels, tray tooltip, native orb title, package metadata, UI header, PowerShell messages, and MSI/NSIS names use that brand. The existing source directory, Rust executable/process name, and `com.kgkz.ambientagent` identifier remain compatibility internals rather than undergoing a disruptive migration.

- Explicit orb/tray opens inspect the native minimized state and call `unminimize()` before show/focus. Automatic suggestions remain no-activate.
- The footer now provides a 500-character question/help field. Ordinary questions use the local `autocomplete` Qwen route; when LM Studio is offline, the UI states that and does not use cloud fallback.
- Takeover/action wording creates a preview-only proposed scope. It cannot execute, approve itself, or grant desktop authority.
- `scripts/show-fake-toast.ps1` displays a nonactivating advice-worthy message for 15 seconds. The active-window-only observer does not see its text; no detection/advice claim was made. Notification awareness remains a future privacy decision.
- The guarded harness now exercises automatic display, X dismissal, real `open-panel` events, minimize, native restore, deadline cleanup, and exact-process absence.

Verification passed 38 TypeScript tests across 11 files, 8 Rust tests, TypeScript/Vite production build, Rust formatting/check, and 0.1.4 packaging. Guarded 30- and 60-second runs reported `orbReady`, `automaticSuggestionShown`, `suggestionCloseHidden`, `minimizedWindowRestored`, and `processAbsentAfterCleanup` all true with no early exit. The restored panel was visually inspected with the MyBuddy-AI header and persistent composer. LM Studio was not listening during the composer visual run, and the UI accurately showed Qwen offline.

## Close-lifecycle and original-style restoration — version 0.1.3

Version 0.1.3 fixes the acceptance issues found in the first 0.1.2 guarded trial:

- Tauri `WindowEvent::CloseRequested` now calls `prevent_close`, hides the suggestion WebView, emits `suggestion-window-hidden` to synchronize frontend state, and records `suggestion-close-hidden` with hidden visibility and agent/orb liveness. The native title-bar X no longer exits the process.
- The in-app X continues to use `set_agent_surface(visible=false)` and also hides only the suggestion.
- Tray **Quit** and the scripted exact-process `Stop` operation remain the explicit shutdown paths.
- The native orb now recreates the original CSS palette: cyan `#2ed0ef`, violet `#6657e8`, pink `#aa5de8`, an upper-left white highlight, inset edge shading, and a green status indicator.
- A dark friendly bot face with antenna replaces the plain `A` center mark while the 192-pixel cap, circular native region, topmost/nonactivation styles, monitor bounds, and runtime guard remain unchanged.

Verification passed 30 TypeScript tests across 8 files, 7 Rust tests, frontend build, `cargo check`, and 0.1.3 MSI/NSIS packaging. A 30-second guarded run and a second 15-second visual run both verified `suggestionCloseHidden: true`, no early exit, a live 152×152 orb after suggestion close, watchdog deadline termination, and exact-process cleanup. A live 152×152 pixel crop confirmed the recovered gradient and bot face without clipping or transparent corners.

## Safety-preserving product restoration — version 0.1.2 (superseded)

Version 0.1.1 was temporary containment, not the approved product direction. After discussion, the user explicitly required startup with the overlay experience, a floating always-on-top orb, and automatically displayed detected suggestions, provided normal mouse and keyboard use remains available.

Version 0.1.2 implements that requirement without restoring the unsafe 0.1.0 WebView overlay:

- Starts a native Win32 circular orb separate from WebView2.
- Uses `WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE` so the orb stays visible without accepting keyboard focus.
- Applies an elliptic native window region, a hard 192-physical-pixel limit, work-area bounds validation, and a one-second runtime guard that exits if bounds become invalid.
- Uses a separate opaque, decorated, non-topmost Adaptive Card window.
- Automatic suggestions use Win32 `SWP_NOACTIVATE`; explicit orb/tray actions may activate the card window.
- Restores detection-to-analysis-to-display behavior after privacy filtering, cooldown, snooze, and pause checks.
- Preserves redacted native diagnostics plus independent `Logs`, `Stop`, and guarded-smoke-test operations.

The approved 30-second workstation smoke test completed with PID 19444. Runtime evidence reported a 152×152 circular, topmost, nonactivating orb and an `automatic-no-activate` suggestion. Orca remained the active application while the suggestion was present. The external watchdog killed the process at the deadline and verified no agent process remained.

## Temporary containment — version 0.1.1 (historical)

During the first real workstation use, version 0.1.0's transparent, undecorated, always-on-top WebView surface prevented normal mouse and keyboard use. Pause recorded successfully but did not release the surface; terminating `ambient-desktop-agent.exe` immediately restored input.

Investigation found no keyboard/mouse hooks, no input-device mutation, and no matching Windows HID/PnP/crash/hang event. Recovered WebView local storage contained only `card-action: pause_toggle` and `paused` at 2026-08-28 08:33:03 EDT. Tauri/WebView2 upstream documentation confirms transparent areas remain input-capturing and records Windows focus defects for overlay configurations.

Version 0.1.1 temporarily removed—not merely adjusted—the floating overlay:

- Starts hidden in the notification area.
- Uses a normal decorated, opaque, non-topmost window only after an explicit tray action.
- Removes the orb and automatic suggestion pop-ups.
- Pause stops observation and hides the window; Resume does not reopen it.
- Adds redacted native JSONL diagnostics and `Logs`/`Stop` automation actions.
- Deletes the unsafe 0.1.0 MSI and NSIS bundles.

## Installed or changed

- Installed .NET SDK 10.0.400 during an initial WPF host spike. The project was deliberately pivoted to Tauri before application implementation to preserve macOS portability; .NET is not required by the final mockup.
- Created the source repository and Tauri 2 project.
- Reused existing Node.js, Rust, Visual Studio C++ Build Tools, WebView2, LM Studio, and loaded local models.
- Did not enable launch at sign-in.
- Did not change LM Studio aliases, context allocation, or startup persistence.
- Did not enable screenshot or computer-control permissions.

## Verified toolchain

- Node.js `v24.18.0`
- npm `11.17.0`
- Rust `1.95.0`
- Cargo `1.95.0`
- .NET SDK `10.0.400` (not required)
- Tauri CLI `2.11.4`
- Adaptive Cards `3.0.6`
- TypeScript `5.6.3`
- Vitest `4.1.11`

## Local runtime

- LM Studio endpoint: `http://127.0.0.1:1234`
- Fast hint alias: `autocomplete` → Qwen2.5 Coder 3B, 8,192-token active context
- Deep model alias: `instruct` → Qwen3.6 35B A3B, 65,536-token active context
- Qwen3.6 advertises 262,144 maximum context, but the live allocation was intentionally left at 65,536.

## Implemented behavior in 0.1.4

- Native bounded, circular, always-on-top, nonactivating startup orb and notification-area menu.
- Automatic no-activation Adaptive Card suggestions in a separate opaque non-topmost window.
- Explicit orb/tray opening of the interactive card window.
- Native minimized-window restoration for explicit orb/tray opening.
- Persistent local-question/takeover-preview composer.
- Native and in-app X controls hide only the suggestion while the observer, tray process, and orb continue running.
- Original cyan/violet/pink orb palette restored with a bot-face center mark.
- Active-window application/title observation through a cross-platform Rust crate.
- Sensitive-context privacy filter.
- Repeated two-window switching detector.
- Automatic candidate analysis/display plus explicit Analyze current work action.
- Structured local-Qwen response using JSON Schema.
- Adaptive Card hint, snooze, dismiss, feedback, pause/resume, and takeover preview.
- Rules fallback when LM Studio is unavailable.
- Capped coarse WebView event log plus redacted native JSONL diagnostics.

## Verification evidence

- TypeScript: 38 tests passed across 11 files.
- Rust: 8 tests passed, including three native-orb safety/palette integration tests.
- Frontend production build succeeded.
- Rust `cargo check` succeeded.
- Live LM Studio `/v1/models` and native `/api/v1/models` probes succeeded.
- Real structured completion from `autocomplete` returned schema-valid content.
- Version 0.1.2 passed the guarded 30-second workstation smoke test without stealing focus; the external watchdog verified process cleanup.

## Portable selected-agent harness — 0.1.6 / ADA-076

- Created canonical repository `harness/` containing credential-free MBAI skills, workflow declarations, declarative cron definitions, installation automation, and plan-first cron synchronization.
- Tauri packages the complete harness as native application resources. `provider.rs` resolves the packaged resource, falls back to the project source during development, and sets `MBAI_HARNESS_PATH` for selected CLI children.
- Configured the default, Codex, Claude, and Qwen Hermes profiles through `hermes config set`. Profiles store the relocatable `${MBAI_HARNESS_PATH}/skills` value; all named profiles discover `master-vault` and `composio-gmail` from both the source and packaged release harness and no longer reference vault `999_System/Hermes_Skills`.
- Replaced the Gmail skill's workstation-specific Python path with cross-platform interpreter discovery. The project helper reported two active Gmail connections without exposing credentials or account identifiers.
- `harness/cron/jobs.json` validates at schema version 1 with zero jobs; no live schedule was created or changed.
- Added `tauri.macos.conf.json` with an opaque non-private-API panel and `docs/MACOS-COMPATIBILITY.md`. A Mac build remains unverified; native orb/window policy, system-state adapters, exact-window accessibility, AutoHotkey/typing, process control, secure MBAI key storage, GUI PATH resolution, and Mac automation still require implementation or acceptance.
- Added regressions for resource packaging, required harness files, workstation-path exclusion, credential-free cron definitions, bytecode exclusion, and the macOS window override.
- Final gate passed 192 TypeScript, 53 Rust unit, and 3 orb-safety tests, TypeScript/Vite build, Rust formatting, diff hygiene, packaged-resource discovery, and MSI/NSIS packaging. Generated installer manifests contain no `__pycache__` or `.pyc` files.

## Native Windows bundles

- MSI: `src-tauri\target\release\bundle\msi\MyBuddy-AI_0.1.6_x64_en-US.msi`
  - Size: 13,246,464 bytes
  - SHA-256: `c49c80612a6a5924f06e5e04ce09348e9e90fc1d43e6dac1e37c458f8d448395`
- NSIS: `src-tauri\target\release\bundle\nsis\MyBuddy-AI_0.1.6_x64-setup.exe`
  - Size: 11,490,547 bytes
  - SHA-256: `db9114b3a7321a12788d14b7b7fb8160c9ba4966722318511410466b85e1258e`

The 0.1.6 bundles were built but not installed, so no startup entry or installed application state was created. The release executable is launched directly from the verified build output.

## Known limitations

- Windows developer and release runs verified; native installers were built but not installed or signed for distribution.
- macOS source compatibility is designed but not yet built or signed on a Mac.
- Diagnostics are redacted JSONL rather than a production audit database.
- The detector covers repeated switching only; dwell/error/retry detectors remain backlog.
- No Buzz transport or execution approval broker exists yet.
- No notification/toast adapter, screenshot sensor, or OCR exists; nonactivating toast content is invisible to the observer.
