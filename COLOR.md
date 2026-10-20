# COLOR — Orumio's selectable colour palettes

`src/color.mjs` owns every colour value. The two committed CSS profiles (app and site) are generated from it with
`npm run color:gen`; `npm run color:check` fails on drift. Do not transcribe values into product docs.

## Choosing a palette

- `orumio-navy` is the established dark Orumio public surface. Existing hub products use it by
  default. It is fully specified for an app as well as a site.
- `warm-neutral` is Trade Counter's white-dominant, warm-neutral light surface. New independently
  served landing pages use it as the initial candidate, paired with their app.
- `cool-neutral` is the light surface of shared-inventory's screen frames (DIST-UX-a, fixed by the
  founder on 2026-10-06): a blue primary action, white cards and a cool grey canvas. It is an app
  palette. The launch kit's hub generates tokens for `orumio-navy` and `warm-neutral` only, so a
  product is not served from the hub in `cool-neutral` until the kit generates that block too.
- `deep-green` is MarginTrace's surface (chosen by the founder on 2026-10-20): a calm forest primary
  action, sienna for a fall and moss for a rise, on HeroUI's light neutrals and a warm near-white
  canvas. It is an app palette; like `cool-neutral`, the hub does not generate it yet.
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
composited at authoring time from the palette's colour and the ground the palette names (`tint`),
not painted as translucent colour over whichever surface happens to sit behind it. `orumio-navy` and
`warm-neutral` composite onto the canvas at 10 / 15 / 22 % (surface / soft / soft hover);
`cool-neutral` composites onto the card surface at 5 / 10 / 15 %, because its canvas is grey and its
chips and banners sit on white cards. The wash of a selected row (`selected`) is the foreground in
the first two and the accent in `cool-neutral`. Material shadows and backdrops may be translucent.
Plain media renderers call `mediaColors(id)` for resolved sRGB values; CSS uses the same source and
OKLab mix. Evaluate contrast on the *composited* background at the element's actual text size.

The warm-neutral field placeholder uses the existing muted foreground, rather than the former
lighter field hint: the old hint measured only 2.23:1 on the field fill, while the muted foreground
measures 4.58:1. This is the one intentional app colour adjustment during extraction.

## cool-neutral and the frames

The values are the frames' own (`shared-inventory/apps/web/design-dist-ux-a/kit.py`), assigned to
roles. Measured on HeroUI's real components in Chromium and WebKit at 1440 and 390 px, every text
run a component draws meets 4.5:1. What differs from the frames, and what the frames do not decide:

- **Muted text is two steps darker than the frames'.** The frames' muted grey measured 4.44:1 on
  the default fill, where HeroUI puts an unselected tab and a key cap; the palette's measures 4.57:1.
  This is the one intentional adjustment.
- **Soft grounds follow the formula.** Blue, green and red land within three steps (of 255) of the
  frames' chips. The frames' amber ground is yellower than the formula's, which keeps the hue of its own text.
- **A field is white with a one-pixel line**, the frames' input line, drawn by the field shadow
  outside the box. HeroUI's radio covers an inset line with its own white disc, which left an
  unselected radio invisible on a card. HeroUI draws inputs, radios and checkboxes with the same
  variable, so the frames' darker radio outline cannot be had separately.
- **One overlay shadow.** HeroUI draws a tooltip, a menu and a dialog with the same variable; the
  palette uses the frames' menu shadow for all three, not the deeper one the frames give a dialog.
- **`active` and `attention` are not in the frames.** shared-inventory has no in-motion or needs-you
  state. The teal and indigo are chosen to sit with the frames' hues at the same contrast, so the
  vocabulary is complete; a product that adopts them should look at them first.
- **The frames' dark toast is not a palette role.** No palette here has an inverse surface.
- **Status and accent hues are text colours on the canvas, a card and an inset.** On the default
  fill blue and green fall to 4.3:1 and 4.2:1, green on the tertiary fill to 4.45:1, and green on
  its own soft ground to 4.39:1 (the frames' own chip pair): on a fill use the foreground, on a soft
  ground the soft foreground.

## deep-green and MarginTrace

The values are what MarginTrace rendered when the founder chose it (its `globals.css` brand over
HeroUI 3.2.4's light defaults, resolved to sRGB), assigned to roles. What differs from that, and why:

- **Muted text is #696971, not HeroUI's #71717A.** HeroUI's grey measured 4.06:1 on the default fill
  (an unselected tab, a key cap) and 4.02:1 on the tertiary surface; #696971 is the value
  `cool-neutral` arrived at for the same reason and measures 4.53:1 or better on every neutral here.
- **Text on solid success and warning is white.** MarginTrace overrode the hues but not their
  foregrounds, so a solid green or gold control drew HeroUI's near-black on them (under 3:1).
- **Soft grounds are HeroUI's own:** the hue at 15 % on the white card (`tint.ground: "surface"`),
  which is what `color-mix(... 15%, transparent)` showed on MarginTrace's cards.
- **`active` and `attention` are not MarginTrace's.** It has no in-motion or needs-you state; the
  teal and indigo complete the vocabulary at the same contrast as `cool-neutral`'s.
- **A grey chip sits on the tertiary surface (#EAEAEB)**, as in every palette here, a step darker
  than HeroUI's #F5F5F5. Rendered side by side with what MarginTrace drew, this and the muted text
  are the only differences a reader would see.
- **The scrollbar thumb is a light grey.** HeroUI's default thumb is the foreground; the palette
  uses the same quiet grey as `cool-neutral`.

Every pair the palette is meant to draw — foreground, muted and strong muted text on each neutral,
the placeholder on a field, white on every solid hue, every hue on the canvas and a card, and each
soft foreground on its soft ground — measures 4.5:1 or better (`test/color.test.mjs`).

Import `@orumio/design/color/app.css` after `shape/app.css` for a HeroUI product, or
`@orumio/design/color/site.css` after `shape/site.css` for a plain site. Put
`data-orumio-palette="..."` on the document root before first paint. A HeroUI app also sets
`data-theme` to the palette's `colorScheme` on that root, so dark component variants match the
selected colours. The default combinations are navy/dark, warm-neutral/light, cool-neutral/light and deep-green/light.
Trade Counter's dormant dark block remains its own compatibility surface; it is not a shared palette.

The launch kit's print and listing-review light surface is independent of palette selection. A
product's App Store artwork may be owned by its product and have a different ground from its house
family tile; ownership and intended placement decide which generator is allowed to write it.

## Relationship to shape

`SHAPE.md` continues to govern corners and curvature without a colour dependency. Products may
adopt a colour release without adopting unrelated shape changes. Verification and compatibility
requirements are evaluated separately for the two subsystems.
