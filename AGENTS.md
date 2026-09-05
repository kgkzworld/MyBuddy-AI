# MyBuddy-AI Repository Guide

## Mission

MyBuddy-AI gives an equipped AI assistant a friendly, quickly available desktop face. Preserve normal question answering, bounded read-only local work, visible teaching, and scoped verified execution. The startup overlay, always-on-top orb, automatic suggestions, and usable composer are product requirements.

## Canonical records

Read before changes:

1. `README.md`
2. `docs/ARCHITECTURE.md`
3. `docs/PRIVACY.md`
4. `docs/MANUAL.md`
5. `docs/AUTOMATION.md`
6. `docs/AI-PLAYBOOK.md`
7. `docs/INSTALL.md` for installation work
8. `docs/AI-INSTALL.md` for AI-assisted deployment

Treat the directory containing this file as the repository root. Resolve every project file relative to that root; never encode a developer checkout, user profile, vault location, or repository host/visibility in tracked content.

## Development rules

- Inspect definitions and usages before editing.
- Use RED–GREEN–REFACTOR for behavior changes.
- Keep shared logic in `src/core` or `src/cards`; keep native integration in `src-tauri` behind platform gates.
- Never add screenshots, OCR, microphone, clipboard, keystroke capture, broad desktop control, startup registration, or credential persistence without a separately reviewed milestone.
- Preserve exact target binding, consequence-based approval, cancellation, and post-action verification.
- Treat selected Codex, Claude, Qwen, and Hermes routes as equipped profiles; do not suppress their configured tools.
- Keep credentials, sessions, profile state, approvals, and live schedules outside Git.
- Update manual, automation, and AI-agent procedures together when behavior or operation changes.
- Do not claim macOS/Linux parity from compile or packaging success; report the platform matrix honestly.

## Required gates

```text
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
git diff --check
```

Use `npm run tauri build` for canonical native packages on the target OS. Do not launch an interactive desktop smoke test without explicit approval and an external timeout/escape route.

## Vault and transcript work

The project's portable harness is `harness/`. For a requested YouTube-to-vault capture, load `youtube-to-vault`, follow the vault routing records, use structural caption validation, atomically save, and read back the exact destination. A fetched transcript or temporary file is not completion.
