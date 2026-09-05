export function surfaceVisibilityAfterPause(paused: boolean, currentlyVisible: boolean): boolean {
  return paused ? false : currentlyVisible;
}

export type SuggestionTrigger = "automatic" | "explicit";

export function suggestionSurfaceRequest(trigger: SuggestionTrigger): {
  visible: true;
  activate: boolean;
} {
  return { visible: true, activate: trigger === "explicit" };
}

export type AgentSurfaceState = {
  open: boolean;
  focused: boolean;
};

export type OrbClickSurfaceAction = "show" | "focus" | "hide";

export function orbClickSurfaceAction(state: AgentSurfaceState): OrbClickSurfaceAction {
  if (!state.open) return "show";
  return state.focused ? "hide" : "focus";
}
