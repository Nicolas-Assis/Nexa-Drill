// Eventos leves de onboarding — permitem que o header (na layout) dispare
// o tour ou o checklist que vivem em outros componentes, sem prop drilling.

export type OnboardingAction = "tour" | "primeiros-passos";

export const ONBOARDING_EVENT = "nexadrill:onboarding";

export function emitOnboarding(action: OnboardingAction) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ONBOARDING_EVENT, { detail: { action } }),
  );
}

export function startTour() {
  emitOnboarding("tour");
}

export function showPrimeirosPassos() {
  emitOnboarding("primeiros-passos");
}
