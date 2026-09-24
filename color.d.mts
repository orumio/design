export type PaletteId = "orumio-navy" | "warm-neutral";
export type Palette = {
  brand: Record<"navy" | "surface" | "surfaceRaised" | "line" | "ink" | "inkMuted" | "inkFaint", string>;
  accents: Record<"blue" | "violet" | "warm", string>;
  app: Record<
    "background" | "foreground" | "surface" | "surfaceSecondary" | "surfaceTertiary" |
    "overlay" | "muted" | "fieldPlaceholder" | "separator" | "border" | "default" |
    "scrollbar" | "fieldBackground" | "accent" | "accentForeground" | "focus" |
    "success" | "successForeground" | "warning" | "warningForeground" |
    "danger" | "dangerForeground" | "sidebar" | "active" | "activeForeground" |
    "attention" | "surfaceShadow" | "overlayShadow" | "fieldShadow" | "backdrop" | "snow", string>;
  site: Record<"mutedStrong" | "activeStrong" | "attentionStrong", string>;
  kit: Record<
    "canvas" | "surface" | "surfaceRaised" | "line" | "ink" | "inkMuted" |
    "inkFaint" | "link" | "focus" | "accentBlue" | "accentViolet" |
    "accentWarm" | "shadowCard" | "shadowFrame", string>;
  colorScheme: "dark" | "light";
};
export declare const PALETTE_IDS: readonly PaletteId[];
export declare const PRINT_SURFACE: Readonly<Record<
  "canvas" | "surface" | "line" | "ink" | "inkMuted" |
  "blueStrong" | "violetStrong" | "warmStrong", string>>;
export declare function getPalette(id?: string): Palette;
export declare function paletteIdFromConfig(config: unknown): PaletteId;
export declare function mixOklab(a: string, b: string, percent: number): string;
export declare function mediaColors(id: PaletteId): Record<
  "background" | "foreground" | "muted" | "mutedStrong" | "surface" |
  "surfaceSecondary" | "border" | "accent" | "accentForeground" |
  "active" | "activeStrong" | "activeSoft" | "attention" |
  "attentionStrong" | "attentionSoft" | "link" | "focus", string>;
