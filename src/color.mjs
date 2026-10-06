/**
 * Colour values for sites, HeroUI applications and rendered media. COLOR.md is
 * the usage contract; generated CSS is an output of this module, never an input.
 */
export const PALETTE_IDS = Object.freeze(["orumio-navy", "warm-neutral", "cool-neutral"]);

/** Review/print surface, independent of the selected product palette. */
export const PRINT_SURFACE = Object.freeze({
  canvas: "#F5F5F2", surface: "#FFFFFF", line: "#E4E4E0",
  ink: "#0B1020", inkMuted: "#5B606B", blueStrong: "#0E6E8C",
  violetStrong: "#5A4BD1", warmStrong: "#A8561B",
});

const NAVY = {
  brand: {
    navy: "#0B1020", surface: "#151A2B", surfaceRaised: "#1B2135", line: "#262C40",
    ink: "#F5F5F2", inkMuted: "#9CA3AF", inkFaint: "#8A91A3",
  },
  accents: { blue: "#5BC7E8", violet: "#8B7CF6", warm: "#F4A261" },
  app: {
    background: "#0B1020", foreground: "#F5F5F2", surface: "#151A2B",
    surfaceSecondary: "#1B2135", surfaceTertiary: "#262C40", overlay: "#1B2135",
    muted: "#9CA3AF", fieldPlaceholder: "#8A91A3", separator: "#262C40",
    border: "#384158", default: "#1B2135", scrollbar: "#384158",
    fieldBackground: "#1B2135", accent: "#5BC7E8", accentForeground: "#0B1020",
    focus: "#5BC7E8", success: "#30D158", successForeground: "#0B1020",
    warning: "#FF9F0A", warningForeground: "#0B1020", danger: "#FF453A",
    dangerForeground: "#0B1020", sidebar: "#0B1020", active: "#2DD4BF",
    activeForeground: "#06302B", attention: "#B4A8FF",
    surfaceShadow: "0 0 0 1px rgb(255 255 255 / 0.06), 0 8px 20px -6px rgb(0 0 0 / 0.4)",
    overlayShadow: "0 0 0 1px rgb(255 255 255 / 0.08), 0 12px 32px -8px rgb(0 0 0 / 0.6)",
    fieldShadow: "none", backdrop: "rgb(0 0 0 / 0.5)", snow: "#FFFFFF",
  },
  site: { mutedStrong: "#D0D5E0", activeStrong: "#87E9DC", attentionStrong: "#CEC7FF" },
  kit: {
    canvas: "#0B1020", surface: "#151A2B", surfaceRaised: "#1B2135", line: "#262C40",
    ink: "#F5F5F2", inkMuted: "#9CA3AF", inkFaint: "#8A91A3",
    link: "#5BC7E8", focus: "#5BC7E8", accentBlue: "#5BC7E8",
    accentViolet: "#8B7CF6", accentWarm: "#F4A261",
    shadowCard: "0 1.5rem 3rem rgb(0 0 0 / 0.45)",
    shadowFrame: "0 2rem 4rem rgb(0 0 0 / 0.5)",
  },
  tint: { ground: "background", surface: 10, soft: 15, softHover: 22 },
  selected: { color: "foreground", percent: 10 },
  colorScheme: "dark",
};

const WARM = {
  brand: {
    navy: "#1C1C1C", surface: "#FFFFFF", surfaceRaised: "#F5F5F2", line: "#E9E8E4",
    ink: "#1C1C1C", inkMuted: "#6E6D6A", inkFaint: "#605F5C",
  },
  accents: { blue: "#0A6D63", violet: "#3F3EA3", warm: "#B45309" },
  app: {
    background: "#FFFFFF", foreground: "#1C1C1C", surface: "#FFFFFF",
    surfaceSecondary: "#F5F5F2", surfaceTertiary: "#EEEEEA", overlay: "#FFFFFF",
    muted: "#6E6D6A", fieldPlaceholder: "#6E6D6A", separator: "#F4F4F4",
    border: "#E9E8E4", default: "#F2F1ED", scrollbar: "#D8D7D2",
    fieldBackground: "#F2F1ED", accent: "#262626", accentForeground: "#FFFFFF",
    focus: "#262626", success: "#15803D", successForeground: "#FFFFFF",
    warning: "#B45309", warningForeground: "#FFFFFF", danger: "#DC2626",
    dangerForeground: "#FFFFFF", sidebar: "#FAFAF8", active: "#0C8377",
    activeForeground: "#FFFFFF", attention: "#5856D6",
    surfaceShadow: "0 0 0 1px rgba(0, 0, 0, 0.04), 0 2px 4px -1px rgba(0, 0, 0, 0.04), 0 8px 20px -6px rgba(0, 0, 0, 0.05)",
    overlayShadow: "0 0 0 0.5px rgba(0, 0, 0, 0.05), 0 8px 24px -6px rgba(0, 0, 0, 0.12), 0 24px 48px -16px rgba(0, 0, 0, 0.1)",
    fieldShadow: "none", backdrop: "rgba(0, 0, 0, 0.4)", snow: "#FFFFFF",
  },
  site: { mutedStrong: "#605F5C", activeStrong: "#0A6D63", attentionStrong: "#3F3EA3" },
  kit: {
    canvas: "#FFFFFF", surface: "#FFFFFF", surfaceRaised: "#F5F5F2", line: "#E9E8E4",
    ink: "#1C1C1C", inkMuted: "#6E6D6A", inkFaint: "#605F5C",
    link: "#0A6D63", focus: "#262626", accentBlue: "#0A6D63",
    accentViolet: "#3F3EA3", accentWarm: "#B45309",
    shadowCard: "0 1.5rem 3rem rgb(0 0 0 / 0.08)",
    shadowFrame: "0 2rem 4rem rgb(0 0 0 / 0.12)",
  },
  tint: { ground: "background", surface: 10, soft: 15, softHover: 22 },
  selected: { color: "foreground", percent: 5 },
  colorScheme: "light",
};

// The screen frames the founder fixed for shared-inventory (DIST-UX-a, 2026-10-06): a blue primary
// action on white cards over a cool grey canvas. Its chips and banners sit on those cards, so the
// soft grounds are composited onto the surface, not the canvas, and at the frames' lighter tints.
// Muted text is two steps darker than the frames' #6B6B73, which measured 4.44:1 on the default fill.
const COOL = {
  brand: {
    navy: "#18181B", surface: "#FFFFFF", surfaceRaised: "#F5F5F6", line: "#E4E4E7",
    ink: "#18181B", inkMuted: "#696971", inkFaint: "#52525B",
  },
  accents: { blue: "#0A56AD", violet: "#4338CA", warm: "#A3560A" },
  app: {
    background: "#F5F5F6", foreground: "#18181B", surface: "#FFFFFF",
    surfaceSecondary: "#F5F5F6", surfaceTertiary: "#F1F1F3", overlay: "#FFFFFF",
    muted: "#696971", fieldPlaceholder: "#696971", separator: "#ECECEF",
    border: "#E4E4E7", default: "#EBEBEE", scrollbar: "#D4D4D8",
    fieldBackground: "#FFFFFF", accent: "#0B6BD6", accentForeground: "#FFFFFF",
    focus: "#0B6BD6", success: "#15803D", successForeground: "#FFFFFF",
    warning: "#A3560A", warningForeground: "#FFFFFF", danger: "#B42318",
    dangerForeground: "#FFFFFF", sidebar: "#FFFFFF", active: "#0F766E",
    activeForeground: "#FFFFFF", attention: "#4F46E5",
    surfaceShadow: "0 1px 2px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.045)",
    overlayShadow: "0 12px 32px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.06)",
    fieldShadow: "inset 0 0 0 1px #D4D4D8", backdrop: "rgba(24, 24, 27, 0.38)", snow: "#FFFFFF",
  },
  site: { mutedStrong: "#52525B", activeStrong: "#115E59", attentionStrong: "#4338CA" },
  kit: {
    canvas: "#F5F5F6", surface: "#FFFFFF", surfaceRaised: "#F5F5F6", line: "#E4E4E7",
    ink: "#18181B", inkMuted: "#696971", inkFaint: "#52525B",
    link: "#0A56AD", focus: "#0B6BD6", accentBlue: "#0A56AD",
    accentViolet: "#4338CA", accentWarm: "#A3560A",
    shadowCard: "0 1.5rem 3rem rgb(0 0 0 / 0.08)",
    shadowFrame: "0 2rem 4rem rgb(0 0 0 / 0.12)",
  },
  tint: { ground: "surface", surface: 5, soft: 10, softHover: 15 },
  selected: { color: "accent", percent: 7 },
  colorScheme: "light",
};

const PALETTES = Object.freeze({ "orumio-navy": NAVY, "warm-neutral": WARM, "cool-neutral": COOL });

/** Invalid explicit choices fail; omission is only allowed at the API boundary. */
export function getPalette(id = "orumio-navy") {
  if (!Object.hasOwn(PALETTES, id)) throw new Error(`unknown Orumio palette: ${String(id)}`);
  return PALETTES[id];
}

export function paletteIdFromConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config) ||
      Object.keys(config).length !== 1 || !Object.hasOwn(config, "palette")) {
    throw new Error(`design.json must contain only { "palette": ${PALETTE_IDS.map((id) => `"${id}"`).join(" | ")} }`);
  }
  getPalette(config.palette);
  return config.palette;
}

/** CSS color-mix(in oklab, a pct%, b); media renderers need a resolved sRGB value. */
export function mixOklab(a, b, percent) {
  const parse = (hex) => {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`expected six-digit colour: ${hex}`);
    return [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
  };
  const lab = (hex) => {
    const [r, g, b] = parse(hex);
    const l = Math.cbrt(0.4122214708*r + 0.5363325363*g + 0.0514459929*b);
    const m = Math.cbrt(0.2119034982*r + 0.6806995451*g + 0.1073969566*b);
    const s = Math.cbrt(0.0883024619*r + 0.2817188376*g + 0.6299787005*b);
    return [0.2104542553*l + 0.793617785*m - 0.0040720468*s,
      1.9779984951*l - 2.428592205*m + 0.4505937099*s,
      0.0259040371*l + 0.7827717662*m - 0.808675766*s];
  };
  if (percent < 0 || percent > 100) throw new Error("mix percent must be 0..100");
  const aa = lab(a), bb = lab(b), p = percent/100;
  const [L, A, B] = aa.map((c, i) => c*p + bb[i]*(1-p));
  const l = (L + 0.3963377774*A + 0.2158037573*B) ** 3;
  const m = (L - 0.1055613458*A - 0.0638541728*B) ** 3;
  const s = (L - 0.0894841775*A - 1.2914855480*B) ** 3;
  const lin = [4.0767416621*l - 3.3077115913*m + 0.2309699292*s,
    -1.2684380046*l + 2.6097574011*m - 0.3413193965*s,
    -0.0041960863*l - 0.7034186147*m + 1.707614701*s];
  return `#${lin.map((c) => {
    const clipped = Math.max(0, Math.min(1, c));
    const v = clipped <= 0.0031308 ? 12.92*clipped : 1.055*clipped**(1/2.4)-0.055;
    return Math.round(v*255).toString(16).padStart(2, "0");
  }).join("")}`;
}

export function mediaColors(id) {
  const p = getPalette(id), a = p.app, ground = a[p.tint.ground];
  return {
    background: a.background, foreground: a.foreground, muted: a.muted,
    mutedStrong: p.site.mutedStrong, surface: a.surface,
    surfaceSecondary: a.surfaceSecondary, border: a.border,
    accent: a.accent, accentForeground: a.accentForeground,
    active: a.active, activeStrong: p.site.activeStrong,
    activeSoft: mixOklab(a.active, ground, p.tint.soft),
    attention: a.attention, attentionStrong: p.site.attentionStrong,
    attentionSoft: mixOklab(a.attention, ground, p.tint.soft),
    link: p.kit.link, focus: p.kit.focus,
  };
}
