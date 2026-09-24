// src/roles.mjs — the ONE hand-written source of @orumio/design. Everything in shape/ that carries a
// GENERATED header is computed from this file and src/census.generated.json by scripts/gen.mjs.
// SHAPE.md explains every decision below in prose; this file is the decision.

/** The ladder. Design values, before --shape-scale. A product may move a step only by declaring a
 *  deviation (`--shape-step-<name>` in its shape.deviations.css). */
export const STEPS = {
  xs: "0.25rem", // 4
  sm: "0.375rem", // 6
  md: "0.5rem", // 8
  lg: "0.625rem", // 10
  xl: "0.8125rem", // 13
  "2xl": "1.0625rem", // 17
  "3xl": "1.375rem", // 22
  "4xl": "1.875rem", // 30
};

/** Roles → the step each one sits on by default. A role, not a step, is what a product names in code
 *  (`rounded-control`), so re-assigning a role moves every element that plays it. */
export const ROLES = {
  inset: "lg", // dense list rows, small inner elements
  control: "xl", // buttons, icon buttons, inputs, segments, nav, tabs, pagination
  nested: "2xl", // surfaces inside a card, bubbles, chips, drawers
  card: "3xl", // cards, modals, popovers
  sheet: "4xl", // the largest surfaces, mobile bottom sheets
};
/** circle is a role too, but not a step: 9999px and `corner-shape: round`. */
export const CIRCLE = "circle";

/** HeroUI's own base (`--radius`), which Pro multiplies. Only rows this package has not seen read it
 *  (every censused row is re-emitted), so it is HeroUI's default: an unseen row renders as HeroUI drew it. */
export const BASE = "0.5rem";

/** The corner treatment, and the circular-arc radius factor that reproduces its silhouette on an
 *  engine that cannot draw it (XOR-minimal arc for superellipse(1.8) is 0.634r — SHAPE.md §Fallback). */
export const CURVATURE = "superellipse(1.8)";
export const K = 0.64;

/** Components whose rendered HEIGHT is fixed and smaller than twice their radius: the radius clamps to
 *  h/2, so K cannot shrink it. On a non-supporting engine they get 0.64 × h/2 explicitly. Heights are
 *  HeroUI's own (OSS, public). */
export const HEIGHT_CAPPED = [
  { selector: ".chip", height: "1.5rem", role: "nested" }, // leading-5 + py-0.5
  { selector: ".chip--sm", height: "1.25rem", role: "nested" }, // py-0
  { selector: ".chip--lg", height: "1.75rem", role: "nested" }, // py-1
];

/** HeroUI's own ladder, inverted: Pro writes `calc(var(--radius) * N)` with the multipliers HeroUI's
 *  theme defines for its steps (@heroui/styles themes/shared/theme.css, MIT). A Pro row in a component
 *  no product imports is put on the step HeroUI itself would call it. 2.5 has no step of its own in
 *  HeroUI and is used for popover / table surfaces, so it is the card step. */
export const HEROUI_N_TO_STEP = {
  0.25: "xs",
  0.5: "sm",
  0.75: "md",
  1: "lg",
  1.5: "xl",
  2: "2xl",
  2.5: "3xl",
  3: "3xl",
  4: "4xl",
};

/** The HeroUI versions whose every radius row is in src/census.generated.json. A product outside this
 *  set fails orumio-shape-check (#5) until the census has been run against it. */
export const CENSUSED = {
  "@heroui/styles": ["3.2.4", "3.2.5", "3.2.6"],
  "@heroui-pro/react": ["1.0.0-beta.8", "1.0.0-beta.9", "1.0.0-beta.10"],
};

/** Pro components classified row by row below. Any other Pro component falls back to
 *  HEROUI_N_TO_STEP, and a product that IMPORTS one fails orumio-shape-check (#6) until it is added
 *  here. Every OSS component is classified (all of @heroui/styles is below). */
export const PRO_CLASSIFIED = [
  "app-layout",
  "chart-tooltip",
  "command",
  "context-menu",
  "drop-zone",
  "empty-state",
  "hover-card",
  "inline-select",
  "item-card",
  "item-card-group",
  "line-chart",
  "native-select",
  "navbar",
  "prompt-input",
  "segment",
  "sheet",
  "sidebar",
  "stepper",
  "timeline",
  "widget",
];

// ── Row rules ─────────────────────────────────────────────────────────────────────────────────────
// [component, selector, role]  — first match wins, per row.
//   selector: a string (the complete flattened selector, exactly), a RegExp (tested on it), or null
//   (every remaining row of the component).
//   role: inset | control | nested | card | sheet | circle | xs…4xl (a fixed step, no role) | keep
//   keep: emit HeroUI's own value unchanged — allowed only where that value is a ladder variable, 0,
//   inherit or the field token (gen refuses a keep on anything else).
// Rows whose value is 0, inherit or the field token are keep, and a HeroUI circle is circle, without
// a rule. Every other row of a classified component must match a rule, or gen fails.
// Rule of nesting: an element inside another steps down at least one step from its container.
export const RULES = [
  // ── OSS: controls ──
  ["button", null, "control"],
  ["button-group", /^\.button-group__separator$/, "keep"],
  ["button-group", null, "control"],
  ["toggle-button", null, "control"],
  ["toggle-button-group", /^\.toggle-button-group__separator$/, "keep"],
  ["toggle-button-group", null, "control"],
  ["toolbar", null, "nested"], // an attached bar that holds controls
  ["close-button", null, "control"],
  ["link", null, "keep"], // the focus outline around inline text
  ["pagination", null, "control"],
  ["tabs", /^\.tabs__list-container$/, "nested"], // the track holds the tabs: one step above them
  ["tabs", /^\.tabs__(tab|indicator)$/, "control"],
  ["tabs", /^\.tabs__separator$/, "keep"],
  ["list-box-item", null, "control"],
  ["menu-item", null, "control"],
  ["kbd", null, "inset"],
  ["tag", null, "nested"],
  ["tooltip", null, "control"],

  // ── OSS: fields (the field token is keep by kind; the rest are their inner parts) ──
  ["autocomplete", /__popover$/, "card"],
  ["autocomplete", /__clear-button$/, "inset"], // inside a control: one step down
  ["select", /__popover$/, "card"],
  ["select", /__clear-button$/, "inset"],
  ["combo-box", /__popover$/, "card"],
  ["combo-box", /^\.combo-box__trigger:focus-visible/, "xs"], // the chevron's own focus ring
  ["checkbox", null, "keep"], // a checkbox is a small rounded SQUARE; it stays on its step
  ["radio", null, "circle"],
  ["switch", null, "circle"],
  ["slider", null, "circle"],
  ["input-otp", null, "keep"],
  ["date-input-group", null, "keep"],
  ["date-picker", /__popover$/, "card"],
  ["date-range-picker", /__popover$/, "card"],
  ["color-picker", /__popover$/, "card"],
  ["color-picker", /__trigger$/, "keep"],
  ["color-area", /__thumb$/, "circle"],
  ["color-area", null, "nested"],
  ["color-slider", null, "circle"],
  ["color-swatch", /--square/, "keep"],
  ["color-swatch", null, "circle"],
  ["color-swatch-picker", /--square/, "keep"],
  ["color-swatch-picker", null, "circle"],

  // ── OSS: surfaces ──
  ["card", null, "card"],
  ["popover", null, "card"],
  ["dropdown", null, "card"],
  ["toast", null, "card"],
  ["modal", /__icon$/, "circle"],
  ["modal", null, "card"],
  ["alert-dialog", /__icon$/, "circle"],
  ["alert-dialog", null, "card"],
  ["alert", null, "nested"], // a callout sits inside a page's cards, not beside them
  ["accordion", /__item::after$/, "keep"], // the divider line
  ["accordion", null, "card"], // --surface and its first / last trigger follow the surface
  ["drawer", /drawer-handle-bar/, "circle"],
  ["drawer", null, "nested"],
  ["table", /^\.table-root--primary$/, "card"],
  ["table", /^\.table__column::after$|^\.table__column-resizer$/, "keep"],
  ["table", /focus-visible/, "inset"], // the focus ring of a cell or row inside the body
  ["table", null, "nested"], // the body and the secondary header inside the card
  ["chip", null, "nested"],
  ["badge", null, "circle"], // a count badge
  ["avatar", null, "circle"],
  ["separator", null, "keep"],
  ["skeleton", null, "keep"],
  ["meter", null, "circle"],
  ["progress-bar", null, "circle"],
  ["typography", null, "keep"],
  ["calendar", /__nav-button$/, "control"],
  ["calendar", null, "circle"], // day cells and the today dot
  ["range-calendar", /__nav-button$/, "control"],
  ["range-calendar", null, "circle"], // day cells and the selection band's caps
  ["calendar-year-picker", /__trigger$/, "control"],
  ["calendar-year-picker", null, "circle"],

  // ── Pro (classified; the components products import, plus the ones they render through) ──
  ["chart-tooltip", null, "control"],
  ["command", /__dialog$/, "card"],
  ["command", null, "control"],
  ["context-menu", null, "card"],
  ["drop-zone", /__area$/, "nested"],
  ["drop-zone", /__trigger$|__file-item$/, "control"],
  ["drop-zone", /__file-remove-trigger$/, "inset"], // inside a file row
  ["drop-zone", /__file-format-icon-badge$/, "xs"],
  ["hover-card", null, "card"],
  ["inline-select", null, "inset"], // a trigger that sits inline in a sentence
  ["item-card", /__icon$/, "inset"],
  ["item-card", null, "card"],
  ["item-card-group", null, "card"], // the group, and grid items that stand as cards
  ["navbar", /^\.navbar--floating$/, "card"],
  ["navbar", null, "control"],
  ["prompt-input", /__token$/, "inset"],
  ["prompt-input", /__token-suggestions$/, "card"],
  ["prompt-input", /:not\(\[data-expanded\]\)/, "control"], // the one-line shell is an input
  ["prompt-input", null, "nested"], // the shells and the queue
  ["segment", /^\.segment$/, "nested"], // the track: concentric with its items
  ["segment", /__separator$/, "xs"],
  ["segment", null, "control"],
  ["sheet", /^\[data-sheet-handle\]$/, "circle"],
  ["sheet", null, "sheet"],
  ["sidebar", /^\.sidebar--floating$|__main$/, "card"],
  ["sidebar", /__menu-item-content$/, "control"],
  ["sidebar", /__menu-action$/, "inset"], // the action at the end of a menu row
  ["stepper", null, "control"],
  ["widget", /__content$/, "nested"],
  ["widget", null, "card"],
];

/** React exports that do not name their CSS component by their own name. */
export const PRO_EXPORT_COMPONENT = {
  useSidebar: "sidebar",
  ChartTooltip: "chart-tooltip",
};
