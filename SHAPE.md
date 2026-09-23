# SHAPE — Orumio's corner radius and corner shape

This is the canonical principle for the shape of every Orumio surface. Products depend on
`@orumio/design` by version and never copy it. `src/roles.mjs` is the decision in code; this file is
the decision in words. When they disagree, fix whichever is wrong in the same commit.

Shape carries meaning (`gates/ux.md` rule 3): a user should be able to tell a control from a surface,
a surface from the surface it sits on, and a person from a thing, before reading a word.

## 1. The principle

1. **One ladder, Apple-proportional.** Small controls are held, large surfaces are generous.
2. **Roles, not numbers.** Code names what an element *is* (`rounded-control`, `rounded-card`), and
   the role decides the step. Re-assigning a role moves every element that plays it.
3. **Nesting steps down.** An element inside another is at least one step smaller than its
   container. Never equal, never larger.
4. **Rectangles curve; circles stay circles.** Every rounded rectangle has continuous curvature
   (`corner-shape: superellipse(1.8)`). A circle is a role of its own: 9999px and `corner-shape: round`.
5. **Designed on every engine.** Where the curvature cannot be drawn, the radius is corrected so the
   silhouette stays where the design put it (§6).

## 2. The ladder and the roles

| Step | xs | sm | md | lg | xl | 2xl | 3xl | 4xl |
|---|---|---|---|---|---|---|---|---|
| px | 4 | 6 | 8 | 10 | 13 | 17 | 22 | 30 |

| Role | Step | What plays it | Utility |
|---|---|---|---|
| inset | lg (10) | dense list rows, a clear button inside a field, an icon tile in a card, an inline select, a token in a prompt | `rounded-inset` |
| control | xl (13) | buttons and icon buttons, inputs and selects (through `--field-radius`), segment items, nav and menu items, tabs, pagination links, tooltips | `rounded-control` |
| nested | 2xl (17) | a surface inside a card: an alert, a table body, a drop area, a chip, a tag, a drawer, a segment's track, a tab list | `rounded-nested` |
| card | 3xl (22) | cards, modals, popovers, menus' panels, toasts, a floating nav or sidebar | `rounded-card` |
| sheet | 4xl (30) | the largest surfaces: sheets (bottom sheets on a phone) | `rounded-sheet` |
| circle | — | people (avatars), state dots, switches, radios, count badges, step numbers, timeline markers, handle bars, slider thumbs and tracks, progress and meter bars, calendar day cells | `rounded-circle` (in the app profile `rounded-full` means the same) |

**Choosing a role.** Ask what the element does, not what size it happens to be.

- It is pressed or typed into → **control**. An icon button is a rounded square, never a circle. A
  segmented control is a row of rounded squares in a track, never a capsule.
- It sits inside a control or packs dense rows → **inset**.
- It is a surface that sits inside a card or a page section → **nested**.
- It is a surface that stands on the page or floats over it → **card**. The biggest one on a phone
  → **sheet**.
- It is a person, a state, or a thumb that slides → **circle**. A face in a squircle reads as an app
  icon; a face in a circle reads as a person.
- Then check nesting: its container must be at least one step larger. If it is not, the container
  is wrong or the element is one step too big.

The steps below lg (xs, sm, md) have no role. They are what HeroUI itself uses for hairlines,
separators, skeleton lines, checkboxes and focus rings, and a product has no reason to name them.
A checkbox is a small rounded square (md) on purpose: it is not a radio.

## 3. How it is built

```
--shape-step-xl: .8125rem                                        design value (a deviation may move it)
--radius-xl: calc(var(--shape-step-xl) * var(--shape-scale))     Tailwind's rounded-xl and HeroUI OSS read this
--shape-role-control: var(--radius-xl)                           the role's step (a deviation may re-assign it)
--radius-control: var(--shape-role-control)                      rounded-control
.button { border-radius: var(--shape-part-button, var(--radius-control)) }   one part (a deviation may set it)
--radius: calc(var(--shape-base) * var(--shape-scale))           HeroUI's base, for rows the census has not seen
--field-radius: var(--shape-part-field, var(--radius-control))   every HeroUI field
```

| Module | Content | Layer |
|---|---|---|
| `tokens.css` (generated) | the ladder, the roles, `--shape-scale: 1`, `--radius`, `--field-radius` | `@theme static`, `theme`, `base` |
| `roles.css` (generated) | every HeroUI radius row the census found, re-emitted with the same selector, each with the same corners' shape (`corner-start-start-shape` …) so whatever wins a corner's radius wins its shape | `components` |
| `circles.css` (generated) | circle rows: 9999px + `corner-shape: round`; inheriting rows inherit the shape too | `components` |
| `curvature.css` | the curvature on every element, and the fallback scale | `base`, `theme` |

**Why every row is re-emitted.** HeroUI OSS follows the ladder but puts components on the wrong
step for this system (a button on the card step, a radio on a 10px step that happens to look round
at 16px). HeroUI Pro does not follow the ladder at all: it multiplies `--radius`. Pinning a few
selectors (what trade-counter did until 2026-09) leaves the rest on HeroUI's numbers, and pins with a
different selector lose to HeroUI's state and compound rules. So the census lists every radius
declaration with its complete selector, `roles.mjs` gives each one a role, and `roles.css` writes the
same selector again, later, in the same layer and in HeroUI's own order: the same specificity, the
same cascade, a different value. A row whose value is 0, `inherit` or the field token is emitted as it
is, so it keeps winning where HeroUI meant it to.

**Profiles.**

- `app.css` — a HeroUI product: all four modules, plus `rounded-circle` and `rounded-full` as true
  circles (HeroUI builds avatars, switch thumbs and radio faces out of `rounded-full`).
- `site.css` — a site without HeroUI (a landing page, the hub): tokens and curvature, plus
  `rounded-circle`. `rounded-full` is **not** a circle here: on a site it is a pill, and a pill takes
  the curvature like every other rectangle (the owner's ruling of 2026-09-01). A photograph of a
  person is `rounded-circle`.

## 4. Deviations — the only way a product differs

A product may differ from the principle on purpose. It says so in one place, and nowhere else.

- **Values:** `shape.deviations.css` next to the entry stylesheet, imported after the profile.
  It contains only `:root { … }` with `--shape-step-*`, `--shape-role-*`, `--shape-part-*`,
  `--shape-base` or `--shape-curvature`, each declaration preceded by
  `/* deviation: <reason> — <who>/<YYYY-MM-DD> */`. No selectors: an unlayered selector would beat
  every HeroUI state and compound rule, which is the defect this package exists to remove.
  `--shape-scale` is never a deviation; only the fallback sets it.
- **Modules:** an entry may import modules instead of the profile, and names each one it leaves out
  in the entry: `/* deviation: omit roles — <reason> */`.
- **Parts:** `--shape-part-<part>` moves one kind of element. The part names are the ones
  `roles.css` uses (`button`, `tabs-tab`, `chip`, `sheet-content`, …).

`orumio-shape-check` (a product's `test` script runs it) holds a product to this:

| # | Check |
|---|---|
| 1 | The entry imports the profile once, directly after HeroUI; an omitted module is named with a reason |
| 2 | `shape.deviations.css` is `:root` `--shape-*` declarations only, each with its reason, who and date |
| 3 | No other product CSS (CSS Modules included) sets `corner-shape` (except `round`), defines `--radius*` / `--shape-*` / `--field-radius`, or sets a radius other than `var(--radius-*)`, `0` or `inherit` |
| 4 | No `rounded-[…]` or inline `borderRadius` in TSX/JSX, except a line marked `// shape-exempt: <reason>` (an error page with no stylesheet, an OG image rendered by Satori, a test cursor) |
| 5 | The installed HeroUI versions are censused (§7) |
| 6 | Every HeroUI Pro component the product imports is classified row by row |
| 7 | `--outdated` (network): WARN if a newer v1 tag exists |

What a machine cannot check is whether the role is right — whether this panel is nested or a card.
That is §2's question, asked in review.

## 5. `gates/site.md` #21 — "Chromium-only decoration as a brand element"

The brand element is **the ladder and the roles**: which step an element sits on, and whether it is
a circle or a rounded rectangle. Those are drawn identically by every engine. Continuous curvature is
a progressive enhancement on top of them, and where it cannot be drawn the radius is corrected (§6),
so the non-Chromium rendering is designed rather than accidental. That is what #21 asks for, and it is
how this package satisfies it.

## 6. The fallback, and its limits

`corner-shape` is drawn by Chromium 139+ only (2026-09). WebKit — every browser on iOS — and Firefox
draw a circular arc of the same radius, which reads rounder than the squircle.

- **K.** The circular arc whose outline is closest to a superellipse(1.8) corner of radius r (the
  one minimising the area between the two outlines) has radius 0.634 r. On an engine without the
  curvature, `curvature.css` sets `--shape-scale: 0.64`, which scales every step and HeroUI's base at
  once. Circles are 9999px and are not scaled. When an engine gains `corner-shape`, the `@supports`
  condition stops matching and the scale returns to 1 by itself.
- **Height-capped parts.** A radius larger than half the element's height is clamped to it, so the
  scale cannot shrink it (a chip is 24px high: its 17px radius is drawn at 12, and 0.64 × 17 = 10.9
  would still be clamped). Where HeroUI fixes the height, `roles.css` sets the fallback explicitly to
  0.64 × h/2 (`HEIGHT_CAPPED` in `roles.mjs`).
- **The limit.** A pill whose height is not known — a site's `rounded-full` pill — stays a
  stadium (semicircular ends) on WebKit and Firefox. No correction reaches it without knowing its
  height.
- **What is not used, and why.** `clip-path`, masks and JavaScript polyfills can draw a squircle on
  any engine, but they cut borders, shadows and focus rings, and this interface is built from 1px
  borders and soft shadows.
- A product that omits `curvature.css` gets no scale: its design is straight, and shrinking it would
  change it. `roles.css` carries the curvature on HeroUI's rows through `--shape-curvature`, so a
  product that wants round arcs everywhere declares `--shape-curvature: round` as a deviation.

## 7. HeroUI updates

The census is what makes a HeroUI version safe. Before a product moves to a HeroUI version outside
`CENSUSED` in `roles.mjs`:

1. Install it in one product (on a branch) and run, here:
   `node scripts/census.mjs --from <that app> --from <an app on the current version>`.
   It compiles OSS with the product's own Tailwind, reads Pro's compiled CSS, and rewrites
   `src/census.generated.json`. Pro's values are never written to a tracked file (HeroUI Pro licence
   §3); only selectors, the kind of each value and variable names are.
2. `node scripts/gen.mjs`. It fails on any row of a classified component that no rule in `roles.mjs`
   reaches: classify it (§2), then run it again.
3. Add the version to `CENSUSED` and to `peerDependencies`, run `node --test` and the specimen
   (`node scripts/specimen.mjs --from <app> --engine all`), and release a new version (§8).

A Pro component no product imports is not classified row by row: `calc(var(--radius) * N)` is put on
the step HeroUI's own theme gives N (`HEROUI_N_TO_STEP`), and a literal value in it is left alone.
A product that starts importing it fails check #6 until its rows are classified here.

## 8. Distribution, updates, rollback

- Products depend on `"@orumio/design": "github:orumio/design#semver:^1.0.0"`. product-video-engine
  vendors a tarball instead (its own supply-chain rule, C8-2).
- The package has no lifecycle scripts and no workspaces: installed from git, npm would run a
  `prepare` with devDependencies and pnpm refuses one (`GIT_DEP_PREPARE_NOT_ALLOWED`). Everything a
  product reads is committed, generated files included.
- A version that changes what renders is at least a minor release, and `CHANGELOG.md` says what
  changes and where.
- Propagating a release to every product: `scripts/propagate.md`. Rolling back: move the product's
  dependency back to the previous tag, or revert the commit that adopted it.

## 8a. Verification

- **Here:** `node --test` on Node 22 and 24 (gen has no drift; the census file carries no Pro value;
  the checker's fixtures), and the specimen: `node scripts/specimen.mjs --from <app> --engine all`
  builds an element for every census row, confirms the element really matches the row's selector,
  and compares the computed radius and corner shape with the role, in Chromium, WebKit and Firefox.
  Each lane first asks the engine whether it supports `corner-shape`; a WebKit or Firefox lane that
  answers yes is a failed lane (Playwright's WebKit carries the feature behind a flag), because it
  would test the wrong branch. Once per release, look at a page in the system Safari by hand.
- **In a product:** the check passes; the product's own lint, typecheck, test and build pass; and a
  before / after table of computed radii on the screens it can reach locally, in Chromium and WebKit,
  where every change is one this file or the changelog explains. A change nobody can explain is a
  defect.

## 9. What the legacy convention said, and what holds now

`trade-counter/legacy/app/.claude/conventions/radius-shape-system.md` (2026-07-04) was the first
written form of this system. Where it and the code that followed disagreed, this is the ruling:

| # | Legacy convention | Code at the time | Now |
|---|---|---|---|
| 1 | Chips on lg (10) | HeroUI chips on 2xl, the app's comment says 17 | **nested (17)**: a chip is a surface on a card |
| 2 | Small tiles on md (8) | the ItemCard icon tile pinned at 10 | **inset (10)** |
| 3 | Base `--radius` 12px | 12px, read directly by Pro | **HeroUI's 8px**: every censused row is re-emitted, so the base only reaches rows not yet censused, which then render as HeroUI drew them |
| 4 | "No per-component radius tokens" | none | **`--shape-part-*`** for every classified part, so a deviation never needs a selector |
| 5 | Pin only the Pro components the app renders | pins by hand, some missing | **every row, generated** from the census |
| 6 | All controls on 13, "segmented controls are rounded squares" | the segment's track pinned at 13, the same as its items | **track nested (17), items control (13)**: nesting steps down |
| 7 | Tabs and pagination are controls | `.tabs__tab`, `.pagination__link` left on HeroUI's 22 | **control (13)** |
| 8 | Circles by `[class*="rounded-full"]` and a hand list | the list missed the radio's face, the stepper indicator, the empty-state icon | **circle is a role**: the census finds every HeroUI circle, and `rounded-full` is a true circle through the utility itself (variants included) |
| 9 | `rounded-full` is a circle or a pill | the landing page rules pills are squircles | **two profiles**: app — circle; site — pill with curvature |
| 10 | Other engines "fall back to a plain arc — consistent either way" | nothing | **K = 0.64** and explicit fallbacks for height-capped parts (§6) |
| 11 | `4xl` for bottom sheets | no sheet used it; Pro sheets at 24 | **sheet (30)** for every Pro sheet surface |

## 10. Not in this package

Colour, spacing, type and elevation are not here. This package is shape only.
