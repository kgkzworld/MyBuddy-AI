import type { TakeoverCapability } from "./userRequest";

export interface CapabilityGrant {
  capability: TakeoverCapability;
  mode: "always";
  grantedAt: string;
  lastUsedAt?: string;
  useCount: number;
}

const fixedCapabilities = new Set<TakeoverCapability>();

export function isFixedCapability(value: unknown): value is TakeoverCapability {
  return typeof value === "string" && fixedCapabilities.has(value as TakeoverCapability);
}

export function parseCapabilityGrants(raw: string | null): CapabilityGrant[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const candidate = entry as Partial<CapabilityGrant>;
      if (
        !isFixedCapability(candidate.capability)
        || candidate.mode !== "always"
        || typeof candidate.grantedAt !== "string"
        || typeof candidate.useCount !== "number"
        || !Number.isInteger(candidate.useCount)
        || candidate.useCount < 0
        || (candidate.lastUsedAt !== undefined && typeof candidate.lastUsedAt !== "string")
      ) {
        return [];
      }
      return [{
        capability: candidate.capability,
        mode: "always" as const,
        grantedAt: candidate.grantedAt,
        ...(candidate.lastUsedAt ? { lastUsedAt: candidate.lastUsedAt } : {}),
        useCount: candidate.useCount,
      }];
    });
  } catch {
    return [];
  }
}

export function rememberCapability(
  grants: readonly CapabilityGrant[],
  capability: TakeoverCapability,
  grantedAt: string,
): CapabilityGrant[] {
  if (!isFixedCapability(capability)) throw new Error("Unsupported capability grant");
  const existing = grants.find((grant) => grant.capability === capability);
  const remembered: CapabilityGrant = existing
    ? { ...existing, mode: "always", grantedAt }
    : { capability, mode: "always", grantedAt, useCount: 0 };
  return [...grants.filter((grant) => grant.capability !== capability), remembered];
}

export function isCapabilityAlwaysAllowed(
  grants: readonly CapabilityGrant[],
  capability: TakeoverCapability,
): boolean {
  return grants.some((grant) => grant.capability === capability && grant.mode === "always");
}

export function recordCapabilityUse(
  grants: readonly CapabilityGrant[],
  capability: TakeoverCapability,
  lastUsedAt: string,
): CapabilityGrant[] {
  return grants.map((grant) => grant.capability === capability
    ? { ...grant, lastUsedAt, useCount: grant.useCount + 1 }
    : grant);
}

export function revokeCapability(
  grants: readonly CapabilityGrant[],
  capability: TakeoverCapability,
): CapabilityGrant[] {
  return grants.filter((grant) => grant.capability !== capability);
}
