# COLOR — Orumio's selectable colour palettes

`src/color.mjs` owns every colour value. The two committed CSS profiles are generated from it with
`npm run color:gen`; `npm run color:check` fails on drift. Do not transcribe values into product docs.

## Choosing a palette

- `orumio-navy` is the established dark Orumio public surface. Existing hub products use it by
  default. It is fully specified for an app as well as a site.
- `warm-neutral` is Trade Counter's white-dominant, warm-neutral light surface. New independently
  served landing pages use it as the initial candidate, paired with their app.
- An independently served product records its choice once in its root `design.json`. The app, its
  landing page and its own media camera read that file. A hub-owned product records its choice in
  its launch-kit manifest. A listing-stage manifest points to the product file instead of copying
  the choice. No customer-facing toggle or operating-system-driven switching is implied.

## Roles

The palette controls the canvas, surface ladder, text, separators, controls, focus, status colours,
soft colour grounds and shadows. A colour has a role before it has a hue. Neutral fills describe
structure; meaning hues describe states. A product maps meaning to its own domain vocabulary:
Trade Counter maps teal to in-motion and indigo to needs-you; a different product may not.

A coloured chip has an opaque soft ground and a distinct readable foreground. The soft ground is
composited at authoring time from the palette's colour and canvas, not painted as translucent colour
over whichever surface happens to sit behind it. Material shadows and backdrops may be translucent.
Plain media renderers call `mediaColors(id)` for resolved sRGB values; CSS uses the same source and
OKLab mix. Evaluate contrast on the *composited* background at the element's actual text size.

The warm-neutral field placeholder uses the existing muted foreground, rather than the former
lighter field hint: the old hint measured only 2.23:1 on the field fill, while the muted foreground
measures 4.58:1. This is the one intentional app colour adjustment during extraction.

Import `@orumio/design/color/app.css` after `shape/app.css` for a HeroUI product, or
`@orumio/design/color/site.css` after `shape/site.css` for a plain site. Put
`data-orumio-palette="..."` on the document root before first paint. A HeroUI app also sets
`data-theme` to the palette's `colorScheme` on that root, so dark component variants match the
selected colours. The default combinations are navy/dark and warm-neutral/light. Trade Counter's dormant dark block remains its own compatibility
surface; it is not a third shared palette.

The launch kit's print and listing-review light surface is independent of palette selection. A
product's App Store artwork may be owned by its product and have a different ground from its house
family tile; ownership and intended placement decide which generator is allowed to write it.

## Relationship to shape

`SHAPE.md` continues to govern corners and curvature without a colour dependency. Products may
adopt a colour release without adopting unrelated shape changes. Verification and compatibility
requirements are evaluated separately for the two subsystems.
