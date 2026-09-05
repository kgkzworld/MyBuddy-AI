#!/usr/bin/env bash
set -euo pipefail

build_bundle=false
install_bundle=false
profiles=(default hermescodex hermesclaude hermesqwen)

while (($#)); do
  case "$1" in
    --build) build_bundle=true ;;
    --install) build_bundle=true; install_bundle=true ;;
    --profile)
      [[ $# -ge 2 ]] || { printf '%s\n' '--profile requires a value' >&2; exit 2; }
      profiles=("$2"); shift ;;
    -h|--help)
      printf '%s\n' 'Usage: install-mybuddy.sh [--build] [--install] [--profile NAME]'
      exit 0 ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
  shift
done

os="$(uname -s)"
case "$os" in
  Darwin|Linux) ;;
  *) printf 'Unsupported operating system: %s\n' "$os" >&2; exit 1 ;;
esac

for command in node npm rustc cargo python3 hermes; do
  command -v "$command" >/dev/null 2>&1 || {
    printf '%s is required; see docs/INSTALL.md\n' "$command" >&2
    exit 1
  }
done

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

npm ci --include=dev
harness_args=()
for profile in "${profiles[@]}"; do
  harness_args+=(--profile "$profile")
done
python3 harness/scripts/install_harness.py "${harness_args[@]}"
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml

if [[ "$build_bundle" == true ]]; then
  if [[ "$os" == Darwin ]]; then
    npm run tauri build -- --bundles app,dmg
  else
    npm run tauri build -- --bundles appimage,deb
  fi
fi

if [[ "$install_bundle" == true ]]; then
  if [[ "$os" == Darwin ]]; then
    app="$(find src-tauri/target/release/bundle/macos -maxdepth 1 -name '*.app' -print -quit)"
    [[ -n "$app" ]] || { printf '%s\n' 'No macOS app bundle was produced' >&2; exit 1; }
    mkdir -p "$HOME/Applications"
    rm -rf "$HOME/Applications/$(basename "$app")"
    cp -R "$app" "$HOME/Applications/"
    printf 'Installed %s\n' "$HOME/Applications/$(basename "$app")"
  else
    appimage="$(find src-tauri/target/release/bundle/appimage -maxdepth 1 -name '*.AppImage' -print -quit)"
    [[ -n "$appimage" ]] || { printf '%s\n' 'No AppImage was produced' >&2; exit 1; }
    install_dir="$HOME/.local/lib/mybuddy-ai"
    mkdir -p "$install_dir" "$HOME/.local/bin"
    cp "$appimage" "$install_dir/MyBuddy-AI.AppImage"
    chmod +x "$install_dir/MyBuddy-AI.AppImage"
    ln -sfn "$install_dir/MyBuddy-AI.AppImage" "$HOME/.local/bin/mybuddy-ai"
    printf 'Installed %s (ensure ~/.local/bin is on PATH)\n' "$HOME/.local/bin/mybuddy-ai"
  fi
elif [[ "$build_bundle" == true ]]; then
  printf '%s\n' 'Bundles are under src-tauri/target/release/bundle'
else
  printf '%s\n' 'Source dependencies, harness, tests, and builds are verified. Re-run with --build or --install when wanted.'
fi
