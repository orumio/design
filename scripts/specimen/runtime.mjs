// specimen/runtime — the code that runs INSIDE the specimen page (serialised with toString()). It
// builds every row's candidate DOM, keeps the first candidate the row's selector really matches, and
// measures computed radii and corner shapes. It must stay self-contained: no imports, no closures.

export function runtime() {
  const SPEC = window.SPEC;
  const CORNER = {
    tl: ["border-top-left-radius", "corner-top-left-shape"],
    tr: ["border-top-right-radius", "corner-top-right-shape"],
    br: ["border-bottom-right-radius", "corner-bottom-right-shape"],
    bl: ["border-bottom-left-radius", "corner-bottom-left-shape"],
  };
  const TOL = 0.05;
  const probe = document.getElementById("sx-probe");

  function mk(p, parent) {
    const el = document.createElement(p.tag);
    for (const c of p.cls) el.classList.add(c);
    for (const [k, v] of Object.entries(p.attrs)) el.setAttribute(k, v);
    if (p.target) el.setAttribute("data-sx-target", "");
    if (p.filler) el.setAttribute("data-sx-filler", "");
    parent.appendChild(el);
    for (const ch of p.children) mk(ch, el);
    return el;
  }

  const env = {
    supports: CSS.supports("corner-shape", "superellipse(1.8)"),
    supportsCondition: CSS.supports("(corner-shape: superellipse(1.8))"),
    rootScale: getComputedStyle(document.documentElement).getPropertyValue("--shape-scale").trim(),
    userAgent: navigator.userAgent,
  };
  env.scale = env.supports ? 1 : SPEC.K;

  const rowsEl = document.getElementById("sx-rows");
  const built = []; // i → { container, target, cand, hostSel }

  function buildAll() {
    const out = [];
    for (const row of SPEC.rows) {
      const box = document.createElement("section");
      box.className = "sx-row";
      box.setAttribute("data-sx-row", String(row.i));
      box.style.borderRadius = "7px";
      rowsEl.appendChild(box);
      let chosen = -1;
      const tried = [];
      for (let k = 0; k < row.candidates.length; k++) {
        const cand = row.candidates[k];
        box.replaceChildren();
        for (const p of cand.plan) mk(p, box);
        const t = box.querySelector("[data-sx-target]");
        let ok = false;
        try {
          ok = !!t && t.matches(cand.relaxed);
        } catch (e) {
          tried.push(`candidate ${k}: ${e.message}`);
          continue;
        }
        if (ok) {
          chosen = k;
          break;
        }
        tried.push(`candidate ${k} (${cand.alt}) built but does not match`);
      }
      if (chosen < 0) {
        box.replaceChildren();
        out.push({ i: row.i, built: false, reason: row.errors.concat(tried).join(" | ") || "no candidate" });
        continue;
      }
      const cand = row.candidates[chosen];
      const t = box.querySelector("[data-sx-target]");
      const [w, h] = row.size;
      t.style.setProperty("width", `${w}px`, "important");
      t.style.setProperty("height", `${h}px`, "important");
      t.style.setProperty("box-sizing", "border-box", "important");
      const focusNode = box.querySelector("[data-sx-focus]");
      if (focusNode) {
        focusNode.setAttribute("tabindex", "0");
        focusNode.style.setProperty("visibility", "visible", "important");
        if (getComputedStyle(focusNode).display === "none" || getComputedStyle(focusNode).display === "contents")
          focusNode.style.setProperty("display", "block", "important");
      }
      built[row.i] = { box, target: t, cand };
      out.push({ i: row.i, built: true, candidate: chosen, alt: cand.alt, state: cand.state });
    }
    return { env, rows: out };
  }

  function px(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : NaN;
  }
  function resolveLength(raw) {
    if (!raw) return NaN;
    probe.style.borderTopLeftRadius = "";
    probe.style.borderTopLeftRadius = raw;
    if (!probe.style.borderTopLeftRadius) return NaN;
    return px(getComputedStyle(probe).borderTopLeftRadius);
  }
  function readCorner(el, pe, corner) {
    const cs = getComputedStyle(el, pe ? `::${pe}` : null);
    if (corner.startsWith("--")) return { raw: cs.getPropertyValue(corner).trim(), px: resolveLength(cs.getPropertyValue(corner).trim()) };
    return { raw: cs.getPropertyValue(CORNER[corner][0]), px: px(cs.getPropertyValue(CORNER[corner][0])) };
  }
  function readShape(el, pe, corner) {
    if (corner.startsWith("--")) return null;
    const cs = getComputedStyle(el, pe ? `::${pe}` : null);
    return (cs.getPropertyValue(CORNER[corner][1]) || cs.getPropertyValue("corner-shape") || "").replace(/\s+/g, "");
  }
  function cmp(a, b) {
    return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  }

  /** The census row that wins each corner of this element (same pseudo-element), by specificity then
   *  census order — which is the order roles.css re-emits them in. */
  function winners(el, pe, corners) {
    const best = {};
    const pool = env.supports ? SPEC.rows : SPEC.rows.concat(SPEC.cappedRules);
    for (const r of pool) {
      let spec = null;
      for (const a of r.alts) {
        if ((a.pe || null) !== (pe || null)) continue;
        let m = false;
        try {
          m = el.matches(a.host);
        } catch {}
        if (m && (!spec || cmp(a.spec, spec) > 0)) spec = a.spec;
      }
      if (!spec) continue;
      for (const c of r.corners) {
        if (!corners.includes(c)) continue;
        const cur = best[c];
        if (!cur || cmp(spec, cur.spec) > 0 || (cmp(spec, cur.spec) === 0 && r.i > cur.i)) best[c] = { i: r.i, spec };
      }
    }
    return best;
  }

  function expected(r, el, pe, corner) {
    const e = r.expect;
    if (e.kind === "unknown") return { value: null, why: e.why };
    if (e.kind === "capped") return { value: e.px };
    if (e.kind === "inherit") {
      const parent = pe ? el : el.parentElement;
      return { value: readCorner(parent, null, corner).px, inherit: true, parentShape: readShape(parent, null, corner) };
    }
    let v = e.px;
    if (!e.circle && v !== 0) v = v * env.scale;
    if (e.cap != null) v = Math.min(e.cap, v);
    return { value: v, circle: !!e.circle };
  }

  function measure(i) {
    const row = SPEC.rows.find((r) => r.i === i);
    const b = built[i];
    const el = b.target;
    const pe = b.cand.pe;
    let matches = false;
    let matchErr = null;
    try {
      matches = el.matches(b.cand.host);
    } catch (e) {
      matchErr = e.message;
    }
    const win = winners(el, pe, row.corners);
    const corners = [];
    for (const c of row.corners) {
      const w = win[c];
      const wr = w ? SPEC.rows.concat(SPEC.cappedRules).find((r) => r.i === w.i) : row;
      const exp = expected(wr, el, pe, c);
      const act = readCorner(el, pe, c);
      const shape = readShape(el, pe, c);
      let expShape = null;
      if (env.supports && !c.startsWith("--")) {
        if (exp.inherit) expShape = exp.parentShape;
        else expShape = (wr.shapeDecision ?? wr.decision) === "circle" ? "round" : "superellipse(1.8)";
        // A corner with no radius has no shape to draw: its corner-shape is not asserted.
        if (exp.value === 0 && act.px === 0) expShape = null;
      }
      const valueOk = exp.value === null || (Number.isFinite(act.px) && Math.abs(act.px - exp.value) <= TOL);
      const shapeOk = expShape === null || shape === expShape;
      corners.push({
        corner: c,
        winner: w ? w.i : null,
        shadowedBy: w && w.i !== i ? w.i : null,
        expected: exp.value,
        expectedNote: exp.why ?? null,
        actual: act.px,
        actualRaw: act.raw,
        shape,
        expShape,
        ok: valueOk && shapeOk,
        valueOk,
        shapeOk,
      });
    }
    // A row that only defines a custom property must not change the shape of the element it sits on:
    // that element keeps the curvature unless one of its own radius rows makes it a circle.
    if (env.supports && row.corners.every((c) => c.startsWith("--"))) {
      const w = winners(el, pe, ["tl"]).tl;
      const wr = w ? SPEC.rows.find((r) => r.i === w.i) : null;
      const expShape = wr && (wr.shapeDecision ?? wr.decision) === "circle" ? "round" : "superellipse(1.8)";
      const shape = readShape(el, pe, "tl");
      corners.push({ corner: "own-shape", winner: w ? w.i : null, shadowedBy: null, expected: null, actual: null, actualRaw: "", shape, expShape, ok: shape === expShape, valueOk: true, shapeOk: shape === expShape });
    }
    const rect = el.getBoundingClientRect();
    return { i, matches, matchErr, corners, rect: [rect.width, rect.height], active: document.activeElement === b.box.querySelector("[data-sx-focus]") };
  }

  // ── Diagnostics: every CSS rule that sets a radius / corner shape and matches the element ──
  function splitList(s) {
    const out = [];
    let d = 0;
    let cur = "";
    for (const ch of s) {
      if (ch === "(" || ch === "[") d++;
      else if (ch === ")" || ch === "]") d--;
      if (ch === "," && d === 0) {
        out.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function resolveNested(sel, parent) {
    if (!parent) return sel;
    return splitList(sel)
      .map((s) => (s.includes("&") ? s.replaceAll("&", `:is(${parent})`) : `:is(${parent}) ${s}`))
      .join(", ");
  }
  function* walk(rules, parent, ctx) {
    for (const r of rules) {
      if (r.selectorText !== undefined) {
        const full = resolveNested(r.selectorText, parent);
        yield { full, style: r.style, ctx };
        if (r.cssRules) yield* walk(r.cssRules, full, ctx);
      } else if (r.constructor.name === "CSSNestedDeclarations") {
        yield { full: parent, style: r.style, ctx };
      } else if (r.constructor.name === "CSSSupportsRule") {
        if (CSS.supports(r.conditionText)) yield* walk(r.cssRules, parent, `${ctx} @supports ${r.conditionText}`);
      } else if (r.constructor.name === "CSSMediaRule") {
        if (matchMedia(r.conditionText || r.media.mediaText).matches) yield* walk(r.cssRules, parent, `${ctx} @media`);
      } else if (r.constructor.name === "CSSLayerBlockRule") {
        yield* walk(r.cssRules, parent, `${ctx} @layer ${r.name}`);
      } else if (r.cssRules) yield* walk(r.cssRules, parent, ctx);
    }
  }
  function diagnose(i) {
    const b = built[i];
    if (!b) return [];
    const el = b.target;
    const pe = b.cand.pe;
    const out = [];
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const { full, style, ctx } of walk(rules, null, "")) {
        if (!style || !full) continue;
        const decls = [];
        const seen = new Set();
        for (const sh of ["border-radius", "corner-shape"]) {
          const v = style.getPropertyValue(sh);
          if (v) {
            decls.push(`${sh}: ${v}${style.getPropertyPriority(sh) ? " !important" : ""}`);
            seen.add(sh);
          }
        }
        for (let k = 0; k < style.length; k++) {
          const p = style[k];
          const v = style.getPropertyValue(p);
          if (!v || !/radius|corner/.test(p)) continue;
          if (seen.has("border-radius") && /^border-.*-radius$/.test(p)) continue;
          if (seen.has("corner-shape") && /^corner-.*-shape$/.test(p)) continue;
          decls.push(`${p}: ${v}${style.getPropertyPriority(p) ? " !important" : ""}`);
        }
        if (!decls.length) continue;
        for (const alt of splitList(full)) {
          const m = alt.match(/::?(before|after)\s*$/);
          const altPe = m ? m[1] : null;
          if ((altPe || null) !== (pe || null)) continue;
          const host = m ? alt.slice(0, m.index) || "*" : alt;
          let ok = false;
          try {
            ok = el.matches(host);
          } catch {}
          if (ok) {
            out.push({ selector: alt, ctx: ctx.trim(), decls });
            break;
          }
        }
      }
    }
    return out;
  }

  function capped() {
    const out = [];
    for (const c of SPEC.capped) {
      const el = document.createElement("div");
      for (const k of c.classes) el.classList.add(k);
      const label = document.createElement("span");
      label.className = "chip__label";
      label.textContent = "Chip";
      el.appendChild(label);
      const holder = document.createElement("section");
      holder.className = "sx-row";
      holder.appendChild(el);
      document.getElementById("sx-capped").appendChild(holder);
      const cs = getComputedStyle(el);
      const h = el.getBoundingClientRect().height;
      const radius = px(cs.borderTopLeftRadius);
      const expected = env.supports ? c.rolePx : Math.min(c.rolePx * SPEC.K, (SPEC.K * c.heightPx) / 2);
      out.push({
        selector: c.selector,
        role: c.role,
        declaredHeight: c.heightPx,
        measuredHeight: h,
        radius,
        expected,
        shape: (cs.getPropertyValue("corner-top-left-shape") || "").replace(/\s+/g, ""),
        ok: Math.abs(radius - expected) <= TOL,
        heightOk: Math.abs(h - c.heightPx) <= 0.5,
      });
    }
    return out;
  }

  window.SX = { buildAll, measure, diagnose, capped, env };
}
