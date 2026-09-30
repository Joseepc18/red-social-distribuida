import { createContext, useContext } from "react";
export type Theme = "light" | "dark";
export const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
} | null>(null);
export function useTheme() {
  const state = useContext(ThemeContext);
  if (!state) throw new Error("ThemeProvider is required");
  return state;
}
