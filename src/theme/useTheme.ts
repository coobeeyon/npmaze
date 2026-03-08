import { useState, useEffect, useCallback } from "react";
import { type ThemeMode, setCurrentTheme, COLORS } from "./colors";

const STORAGE_KEY = "skinny-pig-theme";

function getInitialTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {}
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

/** Apply CSS custom properties for the current theme */
function applyCSSVars(mode: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute("data-theme", mode);
  root.style.setProperty("--bg-primary", COLORS.bgPrimary);
  root.style.setProperty("--bg-secondary", COLORS.bgSecondary);
  root.style.setProperty("--bg-panel", COLORS.bgPanel);
  root.style.setProperty("--text", COLORS.text);
  root.style.setProperty("--text-light", COLORS.textLight);
  root.style.setProperty("--accent", COLORS.accent);
  root.style.setProperty("--accent-hover", COLORS.accentHover);
  root.style.setProperty("--pig-tan", COLORS.pigTan);
  root.style.setProperty("--button-bg", COLORS.buttonBg);
  root.style.setProperty("--button-text", COLORS.buttonText);
  root.style.setProperty("--cell-bg", COLORS.cellBg);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);

  // Sync the module-level theme on mount and change
  useEffect(() => {
    setCurrentTheme(theme);
    applyCSSVars(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return { theme, toggleTheme };
}
