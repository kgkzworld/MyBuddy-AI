# Install MyBuddy-AI

MyBuddy-AI gives an equipped AI agent a friendly, quickly available desktop face. The product name is inspired by the companion idea in the 1980s [My Buddy commercial](https://www.youtube.com/watch?v=OdximU6Ao00): a buddy that stays nearby, helps, teaches, and goes where you work. It is an inspiration, not an affiliation with or reuse of the toy brand, character, music, or artwork.

This guide provides a click-through path and a source-build path for Windows, macOS, and Linux. Read the **current platform limitations** before installing: version 0.1.6 is fully exercised on Windows; macOS and Linux can build the portable conversation/harness layers but do not yet have Windows feature parity.

## Choose an installation route

- **Release installer:** easiest for end users after platform-native artifacts are published.
- **Build from source:** clone or download the repository from the URL supplied by its maintainer.
- **Automated:** use `scripts/install-mybuddy.ps1` on Windows or `scripts/install-mybuddy.sh` on macOS/Linux.
- **AI-assisted:** give `docs/AI-INSTALL.md` to an equipped AI agent and approve only the stated machine changes.

MyBuddy-AI does not store provider credentials in the repository. Hermes profiles, model credentials, vault paths, mail connections, OS permissions, and approvals are configured separately on each machine.

## Windows

### Click-through install

1. Install **Git for Windows** from <https://git-scm.com/download/win> using the default options.
2. Install **Node.js LTS** from <https://nodejs.org/> using the Windows Installer; leave **npm package manager** selected.
3. Install **Rust** from <https://rustup.rs/>. Choose the default stable MSVC toolchain.
4. Open the **Visual Studio Build Tools** installer from <https://visualstudio.microsoft.com/visual-cpp-build-tools/>. Select **Desktop development with C++**, then install.
5. Install the **Microsoft Edge WebView2 Evergreen Runtime** from <https://developer.microsoft.com/microsoft-edge/webview2/> if it is not already present.
6. Install **Python 3.11 or newer** from <https://python.org/> and select **Add Python to PATH**.
7. Install Hermes Agent by opening PowerShell and running the official Windows installer command from <https://hermes-agent.nousresearch.com/docs/installation>. Complete `hermes setup`, then run `hermes doctor`.
8. Obtain the repository using the URL supplied by its maintainer. Use the hosting service's download action, or run `git clone <repository-url>` and then enter the new clone directory.
9. Open PowerShell in the repository folder and run:

   ```powershell
   npm ci --include=dev
   python .\harness\scripts\install_harness.py
   npm test
   npm run build
   cargo test --manifest-path .\src-tauri\Cargo.toml
   npm run tauri build
   ```

10. Open `src-tauri\target\release\bundle\nsis` and double-click the `*-setup.exe`, or open `bundle\msi` and double-click the `.msi`. Accept only the expected MyBuddy-AI installer prompts.
11. Launch **MyBuddy-AI** from Start. Open Settings, select a configured equipped-agent profile or local endpoint, and use **Save and test**.
12. If vault access is wanted, set `OBSIDIAN_VAULT_PATH` as a per-user environment variable to the vault root, restart MyBuddy-AI, and ask a read-only vault question first.

### Build from source

The commands in step 9 are the reproducible source path. Tauri's official prerequisites require the C++ build tools and WebView2; MSI creation may also require Windows' optional **VBSCRIPT** feature. The canonical Windows bundle command is `npm run tauri build`, not a direct `cargo build --release`.

## macOS

### Click-through install

1. Install **Xcode Command Line Tools** by opening Terminal and running `xcode-select --install`; accept the Apple installer dialogs.
2. Install **Node.js LTS** using the macOS installer from <https://nodejs.org/>.
3. Install **Rust** from <https://rustup.rs/> and choose the default toolchain.
4. Install Hermes Agent using the official macOS installer from <https://hermes-agent.nousresearch.com/docs/installation>, run `hermes setup`, and verify with `hermes doctor`.
5. Obtain and open the repository folder as described in the Windows section; keep the clone destination relative to the directory where you run Git unless you intentionally choose another location.
6. In Terminal from that folder, run:

   ```bash
   npm ci --include=dev
   python3 harness/scripts/install_harness.py
   npm test
   npm run build
   cargo test --manifest-path src-tauri/Cargo.toml
   npm run tauri build -- --bundles app,dmg
   ```

7. Open `src-tauri/target/release/bundle/dmg`, double-click the `.dmg`, and drag MyBuddy-AI to **Applications**. If building only an `.app`, drag it from `bundle/macos` to Applications.
8. Launch it from Applications. Grant Screen Recording or Accessibility only when a feature explicitly requires it and only after reviewing the displayed scope.
9. Configure the selected Hermes profile and optional `OBSIDIAN_VAULT_PATH`, then restart the app so Finder-launched processes receive the intended environment.

### Build from source

macOS artifacts must be built on macOS. Public distribution requires Apple signing and notarization. The existing opaque panel and tray path are source-portable, but the floating Win32 orb and Windows desktop adapters are not implemented; see `docs/MACOS-COMPATIBILITY.md`.

## Linux

### Click-through install

1. Use the graphical software center or package manager to install **Git**, **curl**, **xz-utils**, **build-essential**, **Node.js LTS**, and the Tauri Linux libraries for your distribution. On Debian/Ubuntu the official Tauri 2 prerequisites include `libwebkit2gtk-4.1-dev`, `libxdo-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, and `librsvg2-dev`.
2. Install **Rust** from <https://rustup.rs/> using the default toolchain.
3. Install Hermes Agent from <https://hermes-agent.nousresearch.com/docs/installation>, run `hermes setup`, and verify with `hermes doctor`.
4. Obtain the repository folder, open a terminal in it, and run:

   ```bash
   npm ci --include=dev
   python3 harness/scripts/install_harness.py
   npm test
   npm run build
   cargo test --manifest-path src-tauri/Cargo.toml
   npm run tauri build -- --bundles appimage,deb
   ```

5. To use the AppImage, open its Properties, enable **Allow executing file as program**, then double-click it. From a terminal the equivalent is `chmod +x MyBuddy-AI*.AppImage` followed by `./MyBuddy-AI*.AppImage`.
6. On Debian/Ubuntu, double-click the generated `.deb` and install it with the graphical software installer, or use the AppImage without a system install.
7. Configure the selected equipped agent and any vault path. Desktop launchers may not inherit shell-only `PATH` or environment settings, so configure those in the desktop-session environment.

### Build from source

Linux bundles must be built on a compatible Linux host. The portable UI, Tauri host, HTTP-provider routes, and harness are the intended baseline. Win32 orb behavior, Windows services/process adapters, Windows Credential Manager, and AutoHotkey demonstrations are unavailable and must fail truthfully.

## current platform limitations

| Capability | Windows | macOS | Linux |
|---|---|---|---|
| Conversation UI and Adaptive Cards | Verified | Expected; native verification pending | Expected; native verification pending |
| Equipped Hermes profile passthrough | Verified | Expected after PATH/profile setup | Expected after PATH/profile setup |
| Portable vault/email/YouTube harness | Verified | Expected after machine-local configuration | Expected after machine-local configuration |
| Floating always-on-top native orb | Verified Win32 implementation | Not implemented | Not implemented |
| Windows process/service/memory adapters | Verified | Not available | Not available |
| Native packaging | MSI/NSIS verified | Requires Mac verification/signing/notarization | Requires distro-native verification |

Installation success is not feature-parity evidence. Do not advertise macOS or Linux as fully supported until native builds and the platform acceptance matrix pass on real target machines.

## Verify an installation

1. Run `hermes doctor` and confirm the selected profile can answer an ordinary question.
2. Run `python harness/scripts/install_harness.py --profile <profile>` and verify all required skills are discovered.
3. Run `npm test`, `npm run build`, `cargo test`, and `cargo check` in a source checkout.
4. Launch MyBuddy-AI, confirm the panel remains usable, and test a nonmutating question.
5. For vault capture, ask for a YouTube transcript to be saved and require the final response to name a concrete note path that exists and contains the video ID and final timestamp.

Sources: [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/), [Tauri distribution formats](https://v2.tauri.app/distribute/), and [Hermes Agent installation](https://hermes-agent.nousresearch.com/docs/installation/).
