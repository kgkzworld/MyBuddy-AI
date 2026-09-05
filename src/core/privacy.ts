import type { PrivacyDecision, WindowSnapshot } from "./contracts";

export interface PrivacyPolicy {
  evaluate(snapshot: WindowSnapshot): PrivacyDecision;
}

const blockedTerms = [
  "1password",
  "bitwarden",
  "keepass",
  "credentialuibroker",
  "windows security",
  "sign in",
  "two-factor",
  "2fa",
  "bank",
  "payment",
  "checkout",
  "incognito",
  "inprivate",
  "private browsing",
];

export function createDefaultPrivacyPolicy(): PrivacyPolicy {
  return {
    evaluate(snapshot) {
      const context = `${snapshot.processName} ${snapshot.title}`.toLowerCase();
      const blocked = blockedTerms.find((term) => context.includes(term));

      return blocked
        ? { allowed: false, reason: `blocked:${blocked}` }
        : { allowed: true, reason: "allowed" };
    },
  };
}
