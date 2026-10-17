// Responsive horizontal gutter for primary content bodies (settings right side,
// skills, artifacts, command center / sessions). Ratio-based so it scales with
// the window, but clamped so it never collapses on narrow widths or runs away
// on ultrawide displays. Headers/tabs intentionally keep their own tighter
// padding.
//
// NOTE: these must stay literal strings — Tailwind's scanner only picks up
// complete class names, so do not build them via template interpolation.
export const PAGE_INSET_X = 'px-[clamp(1.25rem,4vw,4rem)]'

// Matching negative inline-margin to bleed an element (e.g. a sticky header bar)
// out to the gutter edges before re-applying PAGE_INSET_X.
export const PAGE_INSET_NEG_X = '-mx-[clamp(1.25rem,4vw,4rem)]'

// Readable cap for overlay "inner page" bodies (settings, command center). Wide
// enough to breathe, tight enough that content doesn't sprawl on ultrawide
// displays. Pair with `mx-auto w-full` to center within the pane. Literal string
// for Tailwind's scanner (see PAGE_INSET_X note).
export const PAGE_MAX_W = 'max-w-[75rem]'

// Narrowest window that still docks a rail in the grid; under it both rails
// leave the grid and become the hover-reveal overlay. Single source of truth for
// the responsive collapse point.
//
// A rail costs 237px (SIDEBAR_DEFAULT_WIDTH) and the chat beside it wants roughly
// what a popped-out session window enforces on itself (420px), so docking stops
// paying for itself around here — while still leaving an overlay band down to the
// window's own 400px minimum. Expressed as a dock floor rather than a collapse
// ceiling so half-screen splits stay docked on common laptop widths (1280 → 640).
export const SIDEBAR_DOCK_MIN_WIDTH_PX = 640
// `max-width` is inclusive: shave a hair so an exactly-640px window docks.
export const SIDEBAR_COLLAPSE_MEDIA_QUERY = `(max-width: ${SIDEBAR_DOCK_MIN_WIDTH_PX - 0.02}px)`

// Max width tokens for form and chat reading lines per LAYOUT-UX.md §4
export const FORM_MAX_W = 'max-w-[40rem]' // 640px
export const CHAT_MAX_W = 'max-w-[72ch]'
export const OVERLAY_NAV_W = 'w-[15rem]' // 240px

// Fixed element heights per LAYOUT-UX.md & titlebar/statusbar specs
export const HEADER_HEIGHT_PX = 40
export const CONTROL_HEIGHT_PX = 32
export const STATUSBAR_HEIGHT_PX = 20
export const LIST_ROW_MIN_HEIGHT_PX = 36

// Container query width thresholds for responsive templates
export const CONTAINER_BREAKPOINTS = {
  xs: 480, // ultra-narrow: collapse secondary controls, single column
  sm: 640, // narrow: collapse sidebar to rail/overlay, stacked forms
  md: 768, // standard: master/detail split, dual-pane
  lg: 1024, // wide: multi-pane expanded, secondary tool tabs open
  xl: 1280 // full desktop: all panes docked, maximum breathing room
} as const

