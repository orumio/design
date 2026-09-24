# Changelog

A release that changes what renders is at least a minor version, and says here what changes and where.

## 1.0.5 — 2026-09-24

Nothing renders differently on HeroUI 3.2.4 – 3.2.5 / Pro beta.8 – beta.9.

- HeroUI 3.2.6 and HeroUI Pro 1.0.0-beta.10 are censused (`CENSUSED`, `peerDependencies`). Three rows
  are new and each follows an existing rule: the combo-box chevron's focus ring under 3.2.6's new
  selector (`xs`, as before), and Pro's `.holo-card__image` (`inherit`). The specimen passes 455 / 455
  rows in Chromium, WebKit and Firefox on trade-counter (found moving it to the latest dependencies).
- The census skips a custom property that ends in `-radius` but is no corner (`NOT_A_CORNER`): 3.2.6's
  `--avatar-group-cut-radius` is the radius of the mask that cuts an overlapped avatar, not a border
  radius.

## 1.0.4 — 2026-09-23

Nothing renders differently.

- `@orumio/design/check` exports the check as functions (`createContext`, `checkEntry`,
  `checkDeviations`, `runChecks`, `ownVersion`), so launch-kit's SHAPE row can hold a registered
  product to the profile import and the form of its deviations with the kit's own copy, statically.

## 1.0.3 — 2026-09-23

Nothing renders differently.

- `orumio-shape-check` skips a Next.js build directory named `.next-<purpose>` as it skips `.next`
  (found adopting it in product-video-engine, whose e2e build goes to `.next-e2e/`: 5,000 findings in
  compiled output).

## 1.0.2 — 2026-09-23

Nothing renders differently.

- `@orumio/design/tailwind-merge` ships its own types (`tailwind-merge.d.mts`), so a strict TypeScript
  product imports it without a declaration of its own (found adopting it in trade-counter).

## 1.0.1 — 2026-09-23

Nothing renders differently.

- `roles.css` names the field token alone (`var(--field-radius)`) instead of repeating HeroUI's dead
  fallback after it; `tokens.css` always defines the token.
- `app.css` records the Tailwind 4.3.3 measurement behind the `rounded-full` utility.

## 1.0.0 — 2026-09-23

First release.

- The ladder (4 / 6 / 8 / 10 / 13 / 17 / 22 / 30 px), five roles (inset · control · nested · card ·
  sheet) and the circle role, as tokens and Tailwind utilities (`rounded-control`, …).
- Every radius row of HeroUI 3.2.4 – 3.2.5 and HeroUI Pro 1.0.0-beta.8 – beta.9 classified and
  re-emitted by complete selector; circles declared as a role.
- Continuous curvature, and on engines without `corner-shape` the ladder scaled by K = 0.64 (the owner's
  yes of 2026-09-23, replacing the 2026-09-01 ruling that such engines keep the same radius).
- `orumio-shape-check`: the profile import, the form of deviations, no shape outside the package,
  censused HeroUI, classified Pro components.

What changes for a product adopting it, against HeroUI's defaults: buttons 24 → 13 px, cards 24 → 22,
inputs 12 → 13, chips 16 → 17, tabs and pagination 24 → 13, radios and switches become true circles;
in Chromium every rounded rectangle becomes a squircle.
