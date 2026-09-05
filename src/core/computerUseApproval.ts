import type { WindowSnapshot } from "./contracts";

export interface WindowContextTarget {
  windowHandle: number;
  expectedProcessId: number;
  expectedProcessName: string;
  expectedTitle: string;
}

export interface ComputerUseApproval {
  snapshot: WindowSnapshot;
  target: WindowContextTarget;
  goal: string;
}

export function captureComputerUseApproval(
  snapshot: WindowSnapshot,
  target: WindowContextTarget,
  goal: string,
): ComputerUseApproval {
  const approvedGoal = goal.trim().slice(0, 500);
  if (!approvedGoal) throw new Error("Computer Use approval requires a goal.");
  return {
    snapshot: { ...snapshot },
    target: { ...target },
    goal: approvedGoal,
  };
}
