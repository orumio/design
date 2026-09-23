// specimen/ksheet — the pages behind the K decision: the per-engine sheet (shipped vs K forced off), the
// outline-only source the overlay is cut from, and the page that composites the overlay.

/** Re-declare the token chain on a wrapper with --shape-scale: 1. The chain is computed on :root, so
 *  setting the scale alone on a descendant would not reach the already-computed --radius-* values. */
function noKCss(R) {
  const steps = Object.keys(R.STEPS)
    .map((s) => `--radius-${s}: calc(var(--shape-step-${s}) * var(--shape-scale));`)
    .join(" ");
  const roles = Object.entries(R.ROLES)
    .map(([r, s]) => `--shape-role-${r}: var(--radius-${s}); --radius-${r}: var(--shape-role-${r});`)
    .join(" ");
  return `.sx-noK { --shape-scale: 1; ${steps} ${roles} }`;
}

const BOXES = (R) => [
  { role: "control", w: 160, h: 44, px: parseFloat(R.STEPS[R.ROLES.control]) * 16 },
  { role: "nested", w: 240, h: 120, px: parseFloat(R.STEPS[R.ROLES.nested]) * 16 },
  { role: "card", w: 360, h: 220, px: parseFloat(R.STEPS[R.ROLES.card]) * 16 },
];

export function kSheetHtml({ roles: R, engine, browserVersion }) {
  const boxes = BOXES(R);
  const row = (b) => `
    <div class="sx-label"><b>${b.role}</b><br>${b.px}px · ${b.w}×${b.h}</div>
    <div class="sx-cell"><div class="sx-box rounded-${b.role}" data-k="A" data-role="${b.role}" style="width:${b.w}px;height:${b.h}px"></div><div class="sx-read" data-for="A-${b.role}"></div></div>
    <div class="sx-cell sx-noK"><div class="sx-box rounded-${b.role}" data-k="B" data-role="${b.role}" style="width:${b.w}px;height:${b.h}px"></div><div class="sx-read" data-for="B-${b.role}"></div></div>`;
  return `<!doctype html>
<html lang="en" dir="ltr"><head><meta charset="utf-8"><title>K sheet — ${engine}</title>
<link rel="stylesheet" href="app.css">
<style>
  ${noKCss(R)}
  body { margin: 0; padding: 28px; background: #fff; color: #111827; font: 13px/1.4 -apple-system, system-ui, sans-serif; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sx-sub { color: #4b5563; margin: 0 0 20px; }
  .sx-grid { display: grid; grid-template-columns: 150px 400px 400px; gap: 22px 28px; align-items: start; }
  .sx-head { font-weight: 600; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; }
  .sx-box { border: 1px solid #1f2937; background: #dbe5f6; box-sizing: border-box; }
  .sx-chip { box-shadow: inset 0 0 0 1px #1f2937; background: #dbe5f6; color: #111827; }
  .sx-read { color: #374151; font: 11px ui-monospace, Menlo, monospace; margin-top: 6px; }
</style></head>
<body>
<h1>K specimen — ${engine} ${browserVersion}</h1>
<p class="sx-sub" id="sx-sub"></p>
<div class="sx-grid">
  <div class="sx-head">role</div><div class="sx-head">A — as shipped</div><div class="sx-head">B — --shape-scale: 1 forced (no K)</div>
  ${boxes.map(row).join("")}
  <div class="sx-label"><b>chip</b><br>nested · real .chip height</div>
  <div class="sx-cell"><div class="chip sx-chip" data-k="A" data-role="chip"><span class="chip__label">Chip label</span></div><div class="sx-read" data-for="A-chip"></div></div>
  <div class="sx-cell sx-noK"><div class="chip sx-chip" data-k="B" data-role="chip"><span class="chip__label">Chip label</span></div><div class="sx-read" data-for="B-chip"></div></div>
</div>
<script>
  const supports = CSS.supports("corner-shape", "superellipse(1.8)");
  const scale = getComputedStyle(document.documentElement).getPropertyValue("--shape-scale").trim();
  document.getElementById("sx-sub").textContent =
    'CSS.supports("corner-shape", "superellipse(1.8)") = ' + supports + " · :root --shape-scale = " + scale +
    (supports ? " · A and B are identical by construction (the squircle is drawn)" : " · A applies K = ${R.K}; B is the circular arc at the design radius");
  const out = [];
  for (const el of document.querySelectorAll("[data-k]")) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const shape = cs.getPropertyValue("corner-top-left-shape") || "(no corner-shape)";
    const rec = { column: el.dataset.k, role: el.dataset.role, radius: cs.borderTopLeftRadius, shape, width: r.width, height: r.height };
    out.push(rec);
    document.querySelector('[data-for="' + el.dataset.k + "-" + el.dataset.role + '"]').textContent =
      "radius " + rec.radius + " · " + shape + " · " + rec.width.toFixed(1) + "×" + rec.height.toFixed(1);
  }
  window.KSHEET = { supports, scale, boxes: out };
  window.KSHEET_READY = true;
</script>
</body></html>
`;
}

/** Outline-only boxes at fixed positions. ?v=shipped = as shipped; ?v=noK = --shape-scale: 1 forced;
 *  ?v=arcK / ?v=arc1 = corner-shape: round at r × K / r (Chromium drawing a circular arc on purpose). */
export function overlaySourceHtml({ roles: R }) {
  const boxes = BOXES(R);
  let y = 30;
  const placed = boxes.map((b) => {
    const p = { ...b, x: 30, y };
    y += b.h + 36;
    return p;
  });
  return `<!doctype html>
<html lang="en" dir="ltr"><head><meta charset="utf-8"><title>overlay source</title>
<link rel="stylesheet" href="app.css">
<style>
  ${noKCss(R)}
  html, body { margin: 0; background: #fff; }
  .sx-o { position: absolute; border: 1px solid #000; background: #fff; box-sizing: border-box; }
</style></head>
<body>
<div id="sx-wrap">
${placed.map((b) => `<div class="sx-o rounded-${b.role}" data-role="${b.role}" data-px="${b.px}" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px"></div>`).join("\n")}
</div>
<script>
  const v = new URLSearchParams(location.search).get("v") || "shipped";
  if (v === "noK") document.getElementById("sx-wrap").className = "sx-noK";
  if (v === "arcK" || v === "arc1")
    for (const el of document.querySelectorAll(".sx-o")) {
      el.style.setProperty("corner-shape", "round", "important");
      el.style.setProperty("border-radius", (+el.dataset.px * (v === "arcK" ? ${R.K} : 1)) + "px", "important");
    }
  window.OVERLAY_BOXES = ${JSON.stringify(placed)};
  window.OVERLAY_READY = true;
</script>
</body></html>
`;
}

export function overlayCompositeHtml({ layers, method, roles: R }) {
  const boxes = BOXES(R);
  let y = 30;
  const placed = boxes.map((b) => {
    const p = { ...b, x: 30, y };
    y += b.h + 36;
    return p;
  });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>K overlay</title>
<style>
  body { margin: 0; padding: 24px; background: #fff; color: #111827; font: 13px/1.45 -apple-system, system-ui, sans-serif; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .legend span { display: inline-block; width: 22px; height: 3px; vertical-align: middle; margin: 0 6px 0 14px; }
  .row { display: flex; gap: 28px; align-items: flex-start; margin-top: 16px; }
  figure { margin: 0; }
  figcaption { font: 11px ui-monospace, Menlo, monospace; color: #374151; margin-top: 4px; }
  canvas { border: 1px solid #e5e7eb; }
  .zooms { display: grid; grid-template-columns: repeat(3, auto); gap: 18px; }
</style></head>
<body>
<h1>K overlay — squircle vs K-arc vs unscaled arc</h1>
<div class="legend"><span style="background:#dc2626"></span>Chromium, as shipped (superellipse(1.8))<span style="background:#2563eb"></span>arc with K = ${R.K}<span style="background:#9ca3af"></span>arc at the design radius (no K)</div>
<div style="color:#4b5563;margin-top:4px">method: ${method.replace(/</g, "&lt;")}</div>
<div class="row">
  <figure><canvas id="full"></canvas><figcaption>full boxes (1:1)</figcaption></figure>
  <div class="zooms" id="zooms"></div>
</div>
<script>
  const DPR = 2;
  const layers = ${JSON.stringify(layers)};
  const placed = ${JSON.stringify(placed)};
  const colors = { grey: [156, 163, 175], blue: [37, 99, 235], red: [220, 38, 38] };
  const load = (b64) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.src = "data:image/png;base64," + b64; });
  (async () => {
    const imgs = {};
    for (const k of ["grey", "blue", "red"]) imgs[k] = await load(layers[k]);
    const W = imgs.red.naturalWidth, H = imgs.red.naturalHeight;
    const full = document.getElementById("full");
    full.width = W; full.height = H; full.style.width = W / DPR + "px"; full.style.height = H / DPR + "px";
    const ctx = full.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    const tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H;
    const t = tmp.getContext("2d", { willReadFrequently: true });
    for (const k of ["grey", "blue", "red"]) {
      t.clearRect(0, 0, W, H); t.drawImage(imgs[k], 0, 0);
      const d = t.getImageData(0, 0, W, H);
      const [r, g, b] = colors[k];
      for (let p = 0; p < d.data.length; p += 4) {
        const dark = 255 - Math.min(d.data[p], d.data[p + 1], d.data[p + 2]);
        d.data[p] = r; d.data[p + 1] = g; d.data[p + 2] = b; d.data[p + 3] = dark * (k === "red" ? 0.7 : 1);
      }
      t.putImageData(d, 0, 0);
      ctx.drawImage(tmp, 0, 0);
    }
    const zooms = document.getElementById("zooms");
    const Z = 6, S = 40;
    for (const b of placed) {
      const fig = document.createElement("figure");
      const c = document.createElement("canvas");
      c.width = S * DPR * Z / 2; c.height = S * DPR * Z / 2;
      c.style.width = c.width + "px"; c.style.height = c.height + "px";
      const z = c.getContext("2d"); z.imageSmoothingEnabled = false;
      z.drawImage(full, (b.x - 4) * DPR, (b.y - 4) * DPR, S * DPR, S * DPR, 0, 0, c.width, c.height);
      const cap = document.createElement("figcaption");
      cap.textContent = b.role + " top-left corner ×" + (Z) + " · r = " + b.px + "px, K-arc " + (b.px * ${R.K}).toFixed(2) + "px";
      fig.append(c, cap); zooms.append(fig);
    }
    window.COMPOSITE_READY = true;
  })();
</script>
</body></html>
`;
}
