// Types for tailwind-merge.mjs, so a strict TypeScript product can import it without a declaration of
// its own. Structural on purpose: this package does not depend on tailwind-merge.
export declare const SHAPE_RADII: readonly ["inset", "control", "nested", "card", "sheet", "circle"];
export declare const shapeMerge: {
  extend: { theme: { radius: string[] } };
};
