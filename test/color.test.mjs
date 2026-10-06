import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { getPalette, mediaColors, mixOklab, paletteIdFromConfig, PALETTE_IDS } from "../src/color.mjs";

test("palette selection is explicit and invalid IDs fail", () => {
  assert.deepEqual(PALETTE_IDS, ["orumio-navy", "warm-neutral", "cool-neutral"]);
  assert.equal(getPalette().colorScheme, "dark");
  assert.equal(getPalette("warm-neutral").colorScheme, "light");
  assert.equal(getPalette("cool-neutral").colorScheme, "light");
  assert.equal(paletteIdFromConfig({ palette: "warm-neutral" }), "warm-neutral");
  assert.equal(paletteIdFromConfig({ palette: "cool-neutral" }), "cool-neutral");
  assert.throws(() => paletteIdFromConfig({}), /"orumio-navy" \| "warm-neutral" \| "cool-neutral"/);
  for (const value of [null, {}, { palette: "other" }, { palette: "warm-neutral", source: "product" }]) {
    assert.throws(() => paletteIdFromConfig(value));
  }
  assert.throws(() => getPalette("other"));
});

test("both CSS profiles are committed outputs of the colour source", () => {
  const result = spawnSync(process.execPath, ["scripts/gen-color.mjs", "--check"], {
    cwd: new URL("..", import.meta.url), encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  for (const name of ["app", "site"]) {
    const css = readFileSync(new URL(`../color/${name}.css`, import.meta.url), "utf8");
    for (const id of PALETTE_IDS) {
      const palette = getPalette(id);
      assert.match(css, new RegExp(`data-orumio-palette="${id}"`));
      assert.ok(css.includes(`--background: ${palette.app.background};`));
      assert.ok(css.includes(`--foreground: ${palette.app.foreground};`));
    }
  }
});

test("media colours resolve the same OKLab soft grounds as CSS", () => {
  assert.equal(mixOklab("#ffffff", "#000000", 100), "#ffffff");
  assert.equal(mixOklab("#ffffff", "#000000", 0), "#000000");
  for (const id of PALETTE_IDS) {
    const palette = getPalette(id);
    const media = mediaColors(id);
    const ground = palette.app[palette.tint.ground];
    assert.equal(media.activeSoft, mixOklab(palette.app.active, ground, palette.tint.soft));
    assert.equal(media.attentionSoft, mixOklab(palette.app.attention, ground, palette.tint.soft));
  }
  // The two palettes that predate `tint` keep the grounds they shipped with.
  for (const id of ["orumio-navy", "warm-neutral"]) {
    const { app } = getPalette(id);
    assert.equal(mediaColors(id).activeSoft, mixOklab(app.active, app.background, 15));
  }
  assert.throws(() => mixOklab("not-a-hex", "#ffffff", 15));
  assert.throws(() => mixOklab("#000000", "#ffffff", -1));
});

test("each palette's soft grounds and selected wash come from its own tint and ground", () => {
  const css = readFileSync(new URL("../color/app.css", import.meta.url), "utf8");
  const blocks = Object.fromEntries(css.split(/\n(?=:root\[data-orumio-palette=)/).slice(1).map((block) =>
    [block.match(/data-orumio-palette="([^"]+)"/)[1], block]));
  assert.deepEqual(Object.keys(blocks), [...PALETTE_IDS]);
  for (const id of PALETTE_IDS) {
    const { tint, selected } = getPalette(id), block = blocks[id];
    assert.ok(block.includes(`--tint-surface: ${tint.surface}%;`));
    assert.ok(block.includes(`--tint-soft: ${tint.soft}%;`));
    assert.ok(block.includes(`--tint-soft-hover: ${tint.softHover}%;`));
    assert.ok(block.includes(`--accent-soft: color-mix(in oklab, var(--accent) var(--tint-soft), var(--${tint.ground}));`));
    assert.ok(block.includes(`--surface-selected: color-mix(in oklab, var(--${selected.color}) ${selected.percent}%, transparent);`));
  }
  assert.ok(blocks["orumio-navy"].includes("--surface-selected: color-mix(in oklab, var(--foreground) 10%, transparent);"));
  assert.ok(blocks["warm-neutral"].includes("--surface-selected: color-mix(in oklab, var(--foreground) 5%, transparent);"));
});

test("cool-neutral keeps the frames' colours and reads on every ground HeroUI puts text on", () => {
  const { app, site, tint } = getPalette("cool-neutral");
  // The frames' own values (shared-inventory DIST-UX-a): canvas, card, primary action, status hues.
  assert.deepEqual([app.background, app.surface, app.accent, app.success, app.warning, app.danger],
    ["#F5F5F6", "#FFFFFF", "#0B6BD6", "#15803D", "#A3560A", "#B42318"]);
  // Outside the box: HeroUI's radio paints its disc over an inset line, and an unselected radio vanishes.
  assert.equal(app.fieldShadow, "0 0 0 1px #D4D4D8");
  // The frames' soft blue ground is the accent at this tint on the card.
  assert.equal(mixOklab(app.accent, app[tint.ground], tint.soft), "#e8f1fc");
  const channel = (hex, i) => { const c = parseInt(hex.slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = (hex) => 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const softFg = (hue) => mixOklab(hue, app.foreground, 100 * 80 / 110); // CSS normalises 80% + 30%
  const pairs = [
    ...[app.background, app.surface, app.surfaceSecondary, app.surfaceTertiary, app.default].flatMap((ground) =>
      [[app.foreground, ground], [app.muted, ground], [site.mutedStrong, ground]]),
    [app.fieldPlaceholder, app.fieldBackground],
    [app.accentForeground, app.accent], [app.successForeground, app.success],
    [app.warningForeground, app.warning], [app.dangerForeground, app.danger],
    [app.activeForeground, app.active],
    ...[app.accent, app.success, app.warning, app.danger, app.active, app.attention].flatMap((hue) =>
      [[hue, app.background], [hue, app.surface], [softFg(hue), mixOklab(hue, app[tint.ground], tint.soft)]]),
  ];
  for (const [fg, bg] of pairs) assert.ok(ratio(fg, bg) >= 4.5, `${fg} on ${bg} is ${ratio(fg, bg).toFixed(2)}:1`);
});
