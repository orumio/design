// @orumio/design — teach tailwind-merge the role utilities, so `cn("rounded-xl", "rounded-card")` keeps
// only the last one instead of both (tailwind-merge only knows the radius scale it was told about).
//
//   import { extendTailwindMerge } from "tailwind-merge";
//   import { shapeMerge } from "@orumio/design/tailwind-merge";
//   export const twMerge = extendTailwindMerge(shapeMerge);
//
// No dependency on tailwind-merge here: this is the configuration object its v3 API takes.
export const SHAPE_RADII = ["inset", "control", "nested", "card", "sheet", "circle"];

export const shapeMerge = {
  extend: {
    theme: { radius: SHAPE_RADII },
  },
};
