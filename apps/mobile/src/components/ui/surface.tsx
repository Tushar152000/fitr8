import { createContext, useContext, type ReactNode } from "react";

/**
 * True inside a white card or panel (Card, onboarding's fold sections, "Your body now"…): inputs
 * there take the grey fill with no outline (v2: fields on white are filled, fields on the canvas
 * are white with a hairline). `filled` on a field still overrides it.
 */
const OnWhite = createContext(false);

export function OnSurface({ children }: { children: ReactNode }) {
  return <OnWhite.Provider value>{children}</OnWhite.Provider>;
}

export function useOnSurface(): boolean {
  return useContext(OnWhite);
}
