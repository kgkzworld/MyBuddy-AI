from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
from pathlib import Path

DEFAULT_PROFILES = ("default", "hermescodex", "hermesclaude", "hermesqwen")
REQUIRED_SKILLS = ("master-vault", "composio-gmail", "youtube-to-vault")


def hermes_command(profile: str) -> list[str]:
    # Always name the profile. An inherited HERMES_HOME otherwise makes
    # "default" silently mutate whichever profile launched this installer.
    command = ["hermes", "-p", profile]
    return command


def configure_profile(profile: str, harness_root: Path) -> None:
    environment = os.environ.copy()
    environment["MBAI_HARNESS_PATH"] = str(harness_root)
    value = json.dumps(["${MBAI_HARNESS_PATH}/skills"])
    subprocess.run(
        [*hermes_command(profile), "config", "set", "skills.external_dirs", value],
        env=environment,
        check=True,
    )
    result = subprocess.run(
        [*hermes_command(profile), "skills", "list"],
        env=environment,
        check=True,
        capture_output=True,
        text=True,
    )
    missing = [name for name in REQUIRED_SKILLS if name not in result.stdout]
    if missing:
        raise RuntimeError(f"{profile} did not discover required MBAI skills: {', '.join(missing)}")
    print(f"{profile}: MBAI harness configured and verified")


def main() -> int:
    parser = argparse.ArgumentParser(description="Install the portable MBAI harness into Hermes profiles")
    parser.add_argument("--profile", action="append", choices=DEFAULT_PROFILES)
    args = parser.parse_args()

    if shutil.which("hermes") is None:
        raise RuntimeError("Hermes Agent is not installed or is not available on PATH.")
    harness_root = Path(__file__).resolve().parents[1]
    if not (harness_root / "manifest.json").is_file():
        raise RuntimeError("MBAI harness manifest is missing.")
    for profile in args.profile or DEFAULT_PROFILES:
        configure_profile(profile, harness_root)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
