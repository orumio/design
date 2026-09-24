# @orumio/design

Orumio's shared shape and colour: one corner-radius ladder and two selectable semantic palettes for
HeroUI products and plain sites. Spacing and type remain product-owned.

**Read [`SHAPE.md`](SHAPE.md) first.** It is the principle; `src/roles.mjs` is the same decision in code.
For colour, read [`COLOR.md`](COLOR.md); `src/color.mjs` is its one source of values.

```sh
pnpm add "@orumio/design@github:orumio/design#semver:^1.0.0"
```

```css
/* a HeroUI product */
@import "@heroui/styles/css";
@import "@heroui-pro/react/css";
@import "@orumio/design/shape/app.css";
@import "./shape.deviations.css"; /* only if the product deviates (SHAPE.md §4) */

/* a site without HeroUI */
@import "tailwindcss";
@import "@orumio/design/shape/site.css";
```

```json
"test": "orumio-shape-check --profile app && vitest run"
```

| Path | What |
|---|---|
| `SHAPE.md` | the principle, the roles, deviations, the fallback, HeroUI updates |
| `src/roles.mjs` | the one hand-written source |
| `src/census.generated.json` | every HeroUI radius row, by complete selector (keys and kinds only) |
| `shape/*.css` | `tokens` · `roles` · `circles` (generated), `curvature` · `app` · `site` |
| `tailwind-merge.mjs` | the role utilities for `extendTailwindMerge` |
| `bin/check.mjs` | `orumio-shape-check`, run by each product |
| `scripts/` | `census`, `gen`, `specimen`, `propagate.md` |

HeroUI Pro is a licensed product; this repository contains its public class names and none of its
source or values.
