/// <reference types="vite/client" />

import manifest from "../agent_icons/manifest.json";

const avatarUrls = import.meta.glob("../agent_icons/all/*.png", {
  eager: false,
  import: "default",
  query: "?inline",
}) as Record<string, () => Promise<string>>;

export interface OrbAvatar {
  id: string;
  displayName: string;
  loadUrl: () => Promise<string>;
}

interface ManifestAvatar {
  id: string;
  display_name: string;
  file: string;
}

const entries = (manifest as { avatars: ManifestAvatar[] }).avatars;

export const defaultAvatarId = (manifest as { default_avatar: string }).default_avatar;
export const orbAvatars: OrbAvatar[] = entries.map((entry) => {
  const fileName = entry.file.split("/").pop();
  const match = Object.entries(avatarUrls).find(([path]) => path.endsWith(`/${fileName}`));
  if (!match) throw new Error(`Missing bundled avatar: ${entry.id}`);
  return { id: entry.id, displayName: entry.display_name, loadUrl: match[1] };
});

export function findOrbAvatar(id: string): OrbAvatar {
  return orbAvatars.find((avatar) => avatar.id === id)
    ?? orbAvatars.find((avatar) => avatar.id === defaultAvatarId)
    ?? orbAvatars[0];
}