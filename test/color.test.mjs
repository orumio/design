import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { getPalette, mediaColors, mixOklab, paletteIdFromConfig, PALETTE_IDS } from "../src/color.mjs";

test("palette selection is explicit and invalid IDs fail", () => {
  assert.deepEqual(PALETTE_IDS, ["orumio-navy", "warm-neutral"]);
  assert.equal(getPalette().colorScheme, "dark");
  assert.equal(getPalette("warm-neutral").colorScheme, "light");
  assert.equal(paletteIdFromConfig({ palette: "warm-neutral" }), "warm-neutral");
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
    assert.equal(media.activeSoft, mixOklab(palette.app.active, palette.app.background, 15));
    assert.equal(media.attentionSoft, mixOklab(palette.app.attention, palette.app.background, 15));
  }
  assert.throws(() => mixOklab("not-a-hex", "#ffffff", 15));
  assert.throws(() => mixOklab("#000000", "#ffffff", -1));
});
