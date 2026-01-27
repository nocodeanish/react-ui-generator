/**
 * Design Tokens for consistent UI styling
 *
 * These tokens centralize commonly-used values for
 * icons, animations, spacing, and other UI elements.
 */

// Icon size classes - use consistently across the app
export const ICON_SIZES = {
  xs: "h-3 w-3", // 12px - inline text, badges
  sm: "h-4 w-4", // 16px - default for buttons, inputs
  md: "h-5 w-5", // 20px - prominent icons
  lg: "h-6 w-6", // 24px - headers, empty states
  xl: "h-8 w-8", // 32px - large empty states, hero
} as const;

// Animation duration classes
export const ANIMATION_DURATIONS = {
  fast: 100, // ms - instant feedback
  normal: 150, // ms - micro-interactions
  medium: 300, // ms - page transitions
  slow: 500, // ms - complex animations
} as const;

// Border radius tokens (matches Tailwind)
export const BORDER_RADIUS = {
  sm: "rounded-md", // 6px - buttons, inputs
  md: "rounded-lg", // 8px - cards, panels
  lg: "rounded-xl", // 12px - dialogs, large containers
  full: "rounded-full", // pills, avatars
} as const;

// Spacing tokens for consistent gaps/padding
export const SPACING = {
  xs: "gap-1", // 4px
  sm: "gap-2", // 8px
  md: "gap-3", // 12px
  lg: "gap-4", // 16px
  xl: "gap-6", // 24px
} as const;

// Touch target minimum sizes (accessibility)
export const TOUCH_TARGETS = {
  minimum: "min-h-[44px] min-w-[44px]", // Apple HIG minimum
  comfortable: "min-h-[48px] min-w-[48px]", // Material Design
} as const;

// Z-index scale for layering
export const Z_INDEX = {
  dropdown: 10,
  sticky: 20,
  modal: 40,
  popover: 50,
  toast: 60,
  tooltip: 70,
} as const;

// Playful loading messages for AI generation
export const LOADING_MESSAGES = [
  "Generating...",
  "Crafting your component...",
  "Adding some magic...",
  "Almost ready...",
  "Putting on the finishing touches...",
] as const;

// Preview loading messages
export const PREVIEW_LOADING_MESSAGES = [
  "Compiling your component...",
  "Preparing the preview...",
  "Almost there...",
] as const;

// Provider color accents for visual identification
export const PROVIDER_COLORS = {
  anthropic: "#D97706", // amber
  openai: "#10A37F", // green
  google: "#4285F4", // blue
  openrouter: "#7C3AED", // purple
  xai: "#1DA1F2", // twitter blue
  mock: "#6B7280", // gray
} as const;

// Breakpoints for responsive design
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;
