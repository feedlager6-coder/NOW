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
      "background": "#08090A",
      "foreground": "#FFFFFF",
      "border": "#252932",
      "card": "#171A1E",
      "cardForeground": "#FFFFFF",
      "popover": "#121417",
      "popoverForeground": "#FFFFFF",
      "primary": "#3B82F6",
      "primaryForeground": "#FFFFFF",
      "secondary": "#121417",
      "secondaryForeground": "#FFFFFF",
      "muted": "#121417",
      "mutedForeground": "#B6BDC8",
      "accent": "#1D315A",
      "accentForeground": "#CFE0FF",
      "destructive": "#EF4444",
      "destructiveForeground": "#FFFFFF",
      "input": "#252932",
      "ring": "#60A5FA",
      "chart1": "#F59E0B",
      "chart2": "#3B82F6",
      "chart3": "#22C55E",
      "chart4": "#A855F7",
      "chart5": "#EF4444",
      "sidebar": "#0D0F12",
      "sidebarForeground": "#E8ECF2",
      "sidebarBorder": "#252932",
      "sidebarPrimary": "#3B82F6",
      "sidebarPrimaryForeground": "#FFFFFF",
      "sidebarAccent": "#121417",
      "sidebarAccentForeground": "#FFFFFF",
      "sidebarRing": "#60A5FA"
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
