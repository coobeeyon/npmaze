// Skinny pig themed color palette
export const COLORS = {
  // Background and surfaces
  bgPrimary: "#FFF5EE", // seashell
  bgSecondary: "#FAEBD7", // antique white
  bgPanel: "#FFF0E6",

  // Pig skin tones
  pigPink: "#F4C2C2",
  pigTan: "#D2B48C",
  pigDark: "#C4A882",

  // Maze colors
  wallColor: "#8B6F5E", // warm brown
  wallHover: "#D4886B", // highlighted wall
  pathColor: "#FFF5EE",
  cellBg: "#FFFAF5",

  // Wrap indicators
  wrapNorth: "#E88D9E", // soft rose
  wrapSouth: "#9ED4E8", // soft blue
  wrapEast: "#B5E89E", // soft green
  wrapWest: "#E8D49E", // soft gold
  wrapFlip: "#D49EE8", // soft purple (for flip indicators)

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
} as const;
