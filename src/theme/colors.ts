// Skinny pig themed color palettes

export type ThemeMode = "light" | "dark";

const LIGHT = {
  // Background and surfaces
  bgPrimary: "#FFF5EE", // seashell
  bgSecondary: "#FAEBD7", // antique white
  bgPanel: "#FFF0E6",

  // Pig skin tones
  pigPink: "#F4C2C2",
  pigTan: "#D2B48C",
  pigDark: "#C4A882",

  // Maze colors
  wallColor: "#7A5F4E", // warm brown (darkened for better contrast with corridors)
  wallHover: "#D4886B", // highlighted wall
  pathColor: "#FFF5EE",
  cellBg: "#FFFAF5",
  bridgeShadow: "rgba(93, 64, 55, 0.15)", // subtle shadow for crossing underpasses

  // UI accents
  accent: "#D4886B", // warm coral
  accentHover: "#C47A5E",
  text: "#5D4037",
  textLight: "#8D6E63",
  buttonBg: "#D4886B",
  buttonText: "#FFF5EE",

  // Solver animation
  explored: "#F0D4C4", // warm peach for explored cells

  // Start/end
  startColor: "#F4C2C2",
  endColor: "#FF8A65", // carrot orange
};

const DARK = {
  // Background and surfaces
  bgPrimary: "#1A1210",
  bgSecondary: "#2A2018",
  bgPanel: "#231A14",

  // Pig skin tones
  pigPink: "#C4898A",
  pigTan: "#A08060",
  pigDark: "#8A7560",

  // Maze colors
  wallColor: "#C0A090", // lighter brown on dark (brightened for better contrast)
  wallHover: "#E8A080",
  pathColor: "#1A1210",
  cellBg: "#2A1E1A",
  bridgeShadow: "rgba(0, 0, 0, 0.2)", // subtle shadow for crossing underpasses

  // UI accents
  accent: "#E8A080",
  accentHover: "#D09070",
  text: "#E8D8D0",
  textLight: "#B0988E",
  buttonBg: "#D4886B",
  buttonText: "#FFF5EE",

  // Solver animation
  explored: "#3A2820",

  // Start/end
  startColor: "#C4898A",
  endColor: "#E07848",
};

export type ColorPalette = typeof LIGHT;

const PALETTES: Record<ThemeMode, ColorPalette> = { light: LIGHT, dark: DARK };

// Mutable current theme — kept in sync by useTheme hook
let currentTheme: ThemeMode = "light";

export function setCurrentTheme(mode: ThemeMode) {
  currentTheme = mode;
}

export function getColors(): ColorPalette {
  return PALETTES[currentTheme];
}

// Backwards-compatible export — canvas code uses COLORS directly
// This proxy dynamically delegates to the active palette
export const COLORS: ColorPalette = new Proxy(LIGHT, {
  get(_target, prop: string) {
    return PALETTES[currentTheme][prop as keyof ColorPalette];
  },
}) as ColorPalette;
