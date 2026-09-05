# AI-Assisted MyBuddy-AI Installation Playbook

Use this workflow when a user asks an equipped AI agent to install MyBuddy-AI. The goal is a verified native installation, not a list of commands or a claim based only on a successful build.

## Authorization boundary

Installing developer prerequisites, changing package-manager state, configuring Hermes profiles, building bundles, and launching an installer all change the machine. Explain the detected gaps and obtain approval for that scope before installing missing prerequisites. Reading versions and repository state is safe discovery. Never request or print provider credentials.

## Procedure

1. Read `AGENTS.md` if present, then `README.md`, `docs/INSTALL.md`, `docs/PRIVACY.md`, `docs/MACOS-COMPATIBILITY.md`, and the three operating procedures.
2. Detect the real OS and architecture. Do not infer them from a user profile or from the repository path.
3. Confirm the repository is the intended canonical checkout and inspect Git status before changing it. Preserve user changes.
4. Inventory prerequisites using read-only version probes:
   - all platforms: Git, Node/npm, Rust/cargo, Python, Hermes;
   - Windows: MSVC C++ Build Tools and WebView2;
   - macOS: Xcode Command Line Tools;
   - Linux: the distribution's Tauri/WebKit/AppIndicator development libraries.
5. Report missing prerequisites and the exact proposed package-manager or installer changes. Stop for approval if installation is required.
6. After approval, install only the missing prerequisites from official sources. Do not select a model provider, enter credentials, grant Screen Recording/Accessibility, enable startup, or create scheduled jobs on the user's behalf.
7. From the repository root, run the platform automation without native installation first:
   - Windows: `powershell -ExecutionPolicy Bypass -File scripts/install-mybuddy.ps1`
   - macOS/Linux: `bash scripts/install-mybuddy.sh`
8. Require real green output from `npm test`, `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml`, and `cargo check --manifest-path src-tauri/Cargo.toml`.
9. Build the native artifact only on its target OS:
   - Windows: `scripts/install-mybuddy.ps1 -BuildBundle`
   - macOS/Linux: `scripts/install-mybuddy.sh --build`
10. Inspect the produced platform directory and record the exact artifact path. For public macOS delivery, verify signing and notarization; do not bypass Gatekeeper.
11. Ask for approval to launch/install the exact artifact. Then use `-Install` or `--install`, or visibly walk the user through the click path in `docs/INSTALL.md` when they requested a demonstration rather than autonomous execution.
12. After the installer exits, read back the installed application target and launch only if included in the approved scope. Confirm the MyBuddy-AI process/window belongs to that installed target and the composer is usable.
13. Run `hermes doctor`; run `python harness/scripts/install_harness.py --profile NAME`; verify `master-vault`, `composio-gmail`, and `youtube-to-vault` are discovered. Configure machine-local credentials and `OBSIDIAN_VAULT_PATH` only with the user's explicit values and normal provider setup.
14. Perform one nonmutating ordinary-question acceptance. If vault capture was requested, perform a YouTube-to-vault test and read back the exact note, video ID, segment count, and final timestamp before claiming success.
15. Report exact test totals, artifact path, installed target, acceptance result, and every skipped permission or platform capability.

## Platform truthfulness

Do not claim macOS or Linux feature parity. Version 0.1.6 has a verified Windows orb and Windows-native adapters. macOS and Linux currently lack the Win32 orb, Windows process/service/memory adapters, Windows Credential Manager integration, and AutoHotkey demonstrations. A successful compile or package proves installation only; it does not prove those features.

## Failure handling

- If a prerequisite is missing, distinguish setup failure from product failure.
- If a test or build fails, stop installation, preserve logs, and fix the root cause with a regression test.
- If an installer succeeds but the app cannot be found, inspect the exact platform install target; do not claim success from exit code alone.
- If a GUI app cannot find Hermes, account for macOS/Linux desktop sessions not inheriting shell dotfiles.
- If authentication or an OS permission dialog appears, stop and return control to the user.
- Never enable startup, background scheduling, broad Computer Use, or vault/mail mutation as an installation side effect.
