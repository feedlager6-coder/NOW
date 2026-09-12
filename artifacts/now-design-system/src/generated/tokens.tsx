/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#F5F7FA",
      "foreground": "#08090A",
      "border": "#D8DDE5",
      "card": "#FFFFFF",
      "cardForeground": "#08090A",
      "popover": "#FFFFFF",
      "popoverForeground": "#08090A",
      "primary": "#2563EB",
      "primaryForeground": "#FFFFFF",
      "secondary": "#E8EDF5",
      "secondaryForeground": "#172033",
      "muted": "#E9EDF2",
      "mutedForeground": "#5B6472",
      "accent": "#DCE8FF",
      "accentForeground": "#1747A6",
      "destructive": "#DC2626",
      "destructiveForeground": "#FFFFFF",
      "input": "#D8DDE5",
      "ring": "#2563EB",
      "chart1": "#F59E0B",
      "chart2": "#2563EB",
      "chart3": "#22C55E",
      "chart4": "#A855F7",
      "chart5": "#EF4444",
      "sidebar": "#FFFFFF",
      "sidebarForeground": "#334155",
      "sidebarBorder": "#D8DDE5",
      "sidebarPrimary": "#2563EB",
      "sidebarPrimaryForeground": "#FFFFFF",
      "sidebarAccent": "#EAF1FF",
      "sidebarAccentForeground": "#1747A6",
      "sidebarRing": "#2563EB"
    },
    "dark": {
      "background": "#050608",
      "foreground": "#FFFFFF",
      "border": "#232836",
      "card": "#0E1014",
      "cardForeground": "#FFFFFF",
      "popover": "#151922",
      "popoverForeground": "#FFFFFF",
      "primary": "#4B8BFF",
      "primaryForeground": "#FFFFFF",
      "secondary": "#151922",
      "secondaryForeground": "#FFFFFF",
      "muted": "#0E1014",
      "mutedForeground": "#7B8593",
      "accent": "#4B8BFF",
      "accentForeground": "#FFFFFF",
      "destructive": "#EF4444",
      "destructiveForeground": "#FFFFFF",
      "input": "#232836",
      "ring": "#78A9FF",
      "chart1": "#F4B860",
      "chart2": "#4B8BFF",
      "chart3": "#5FD49A",
      "chart4": "#B58CFF",
      "chart5": "#FF6B7A",
      "sidebar": "#050608",
      "sidebarForeground": "#B7BFCA",
      "sidebarBorder": "#232836",
      "sidebarPrimary": "#4B8BFF",
      "sidebarPrimaryForeground": "#FFFFFF",
      "sidebarAccent": "#151922",
      "sidebarAccentForeground": "#FFFFFF",
      "sidebarRing": "#78A9FF"
    }
  },
  "fontFamily": {
    "sans": [
      "-apple-system",
      "BlinkMacSystemFont",
      "SF Pro Display",
      "SF Pro Text",
      "Segoe UI",
      "sans-serif"
    ],
    "serif": [
      "Georgia",
      "serif"
    ],
    "mono": [
      "SFMono-Regular",
      "Menlo",
      "monospace"
    ]
  },
  "radius": "0.75rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;
