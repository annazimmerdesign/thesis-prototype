// The nexus section type: her text beside a living network, the mechanisms at its hubs.
// Loaded by nexus.html before section.js, which hands over its pieces through `ctx`.
window.SECTION_TYPES = window.SECTION_TYPES || {};

SECTION_TYPES.nexus = function (ctx) {
  const { ID, sec, root, leave } = ctx;
  document.body.classList.add('nexus');
  const reveal = ctx.passage();
  const cv = document.createElement('canvas'); cv.id = 'mass'; document.body.insertBefore(cv, root);
  const g = cv.getContext('2d');
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PAL = ['#3A86FF', '#8338EC', '#FF006E', '#FB5607', '#FFBE0B'].map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
  const mix = f => { f = ((f % 1) + 1) % 1 * PAL.length; const a = PAL[Math.floor(f) % PAL.length], b = PAL[(Math.floor(f) + 1) % PAL.length], t = f % 1;
    return a.map((v, i) => Math.round(v + (b[i] - v) * t)); };
  const NB = 40, COL = Array.from({ length: NB }, (_, k) => { const c = mix(k / NB); return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; });

  let seed = +new URLSearchParams(location.search).get('seed') || 11;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  let W, H, DPR, cx, cy, R, net = null;
  const size = () => { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR;
    cx = W * (W < 900 ? 0.5 : 0.66); cy = H * 0.52; R = Math.min(W * (W < 900 ? 0.44 : 0.235), H * 0.40); net = null; };
  size(); addEventListener('resize', size);

  function grow() {
    const P = [], ph = rnd() * 6.28;
    const inside = (x, y) => { const an = Math.atan2(y, x), lim = 1 + 0.26 * Math.sin(an * 2 + ph) + 0.18 * Math.sin(an * 5 + ph * 2) + 0.1 * Math.sin(an * 3 - ph);
      return Math.hypot(x / 0.88, y / 0.92) < lim; };
    for (let k = 0; k < 600 && P.length < 26; k++) {
      const x = (rnd() * 2 - 1) * 0.88 * R, y = (rnd() * 2 - 1) * 0.92 * R;
      if (!inside(x / R, y / R) || P.some(q => Math.hypot(q.x - x, q.y - y) < 0.24 * R)) continue;
      P.push({ x, y, ph: rnd() * 6.28, r: 0.025 + 0.02 * rnd(), hub: false });
    }

    const nH = sec.nodes.length, hubs = [P[Math.floor(rnd() * P.length)]]; hubs[0].hub = true;
    while (hubs.length < nH) { let best = null, bd = -1; for (const q of P) { if (q.hub) continue; const d = Math.min(...hubs.map(h => Math.hypot(h.x - q.x, h.y - q.y))); if (d > bd) { bd = d; best = q; } } best.hub = true; hubs.push(best); }
    hubs.forEach(h => { h.r = 0.07 + 0.02 * rnd(); });

    const E = [], key = new Set(), uf = P.map((_, i) => i), find = i => uf[i] === i ? i : (uf[i] = find(uf[i]));
    const link = (i, j, w) => { const k = Math.min(i, j) + '-' + Math.max(i, j); if (i === j || key.has(k)) return; key.add(k); uf[find(i)] = find(j);
      const a = P[i], b = P[j], len = Math.hypot(b.x - a.x, b.y - a.y);
      E.push({ a: i, b: j, w, len, bend: (rnd() - 0.5) * 0.55 * len, tendril: false }); };
    P.forEach((p, i) => { const order = P.map((q, j) => [Math.hypot(q.x - p.x, q.y - p.y), j]).sort((u, v) => u[0] - v[0]).slice(1);
      link(i, order[0][1], 1.1 + rnd() * 0.5); link(i, order[1][1], 0.9 + rnd() * 0.5); if (rnd() < 0.4 && order[2][0] < 0.6 * R) link(i, order[2][1], 0.7); });
    for (let guard = 0; guard < 40; guard++) {
      let best = null; for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) if (find(i) !== find(j)) { const d = Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y); if (!best || d < best[0]) best = [d, i, j]; }
      if (!best) break; link(best[1], best[2], 0.9);
    }
    E.forEach(e => { if (P[e.a].hub || P[e.b].hub) e.w *= 1.6; });

    const edgeNodes = P.slice().sort((u, v) => Math.hypot(v.x, v.y) - Math.hypot(u.x, u.y)).slice(0, 12);
    for (const n0 of edgeNodes) for (let t = 0; t < 1 + (rnd() < 0.5); t++) {
      let x = n0.x, y = n0.y, an = Math.atan2(y, x) + (rnd() - 0.5) * 1.2, prev = P.indexOf(n0);
      const segs = 5 + Math.floor(rnd() * 6);
      for (let k = 0; k < segs; k++) {
        const step = (0.05 + 0.045 * rnd()) * R; an += (rnd() - 0.5) * 1.0; x += Math.cos(an) * step; y += Math.sin(an) * step;
        P.push({ x, y, ph: rnd() * 6.28, r: 0, hub: false, tip: true }); const j = P.length - 1;
        E.push({ a: prev, b: j, w: Math.max(0.18, 0.9 * (1 - k / segs)), len: step, bend: (rnd() - 0.5) * 0.5 * step, tendril: true }); prev = j;
      }
    }

    const D = [];
    for (const e of E) {
      const n = Math.round(e.len * (0.28 + 0.55 * e.w)), an = Math.atan2(P[e.a].y + P[e.b].y, P[e.a].x + P[e.b].x);
      for (let i = 0; i < n; i++) D.push({ e, s: rnd(), off: (rnd() * 2 - 1) * (rnd() < 0.5 ? 1 : rnd()), v: (0.03 + rnd() * 0.07) * (rnd() < 0.5 ? -1 : 1) * 150 / Math.max(60, e.len),
        r: 0.6 + rnd() * 1.2, c: Math.floor((((an / 6.28 + 0.5) * 1.3 + e.w * 0.1 + rnd() * 0.08) % 1 + 1) % 1 * NB), n: -1 });
    }
    P.forEach((q, i) => { if (q.tip) return; const n = Math.round(q.hub ? 380 : 110 * (q.r / 0.03));
      for (let k = 0; k < n; k++) { const an = rnd() * 6.28, rr = Math.sqrt(-2 * Math.log(1 - rnd() * 0.97)) * q.r * R * 0.45;
        D.push({ n: i, ox: Math.cos(an) * rr, oy: Math.sin(an) * rr, r: 0.5 + rnd() * 1.3, c: Math.floor(((Math.atan2(q.y, q.x) / 6.28 + 0.5) * 1.3 + rnd() * 0.1) % 1 * NB) }); } });
    return { P, E, D, hubs };
  }

  const hubNodes = sec.nodes.map((n, i) => {
    const el = document.createElement('a'); el.className = 'node'; el.href = ESSAY.pageOf(n.to); el.textContent = n.text; root.parentNode.appendChild(el);
    const o = { n, el, x: cx, y: cy, col: mix(i / sec.nodes.length) };
    el.addEventListener('pointerenter', () => { o.hover = true; });
    el.addEventListener('pointerleave', () => { o.hover = false; });
    el.addEventListener('click', ev => {
      ev.preventDefault(); if (ctx.leaving()) return;
      try { const path = JSON.parse(sessionStorage.getItem('essay.path') || '[]'); path.push({ section: ID, choice: i, text: n.text }); sessionStorage.setItem('essay.path', JSON.stringify(path));
        const vis = JSON.parse(sessionStorage.getItem('essay.visited') || '[]'); if (!vis.includes(i)) vis.push(i); sessionStorage.setItem('essay.visited', JSON.stringify(vis)); } catch (_) {}
      el.classList.add('chosen'); leave(o.x, o.y, n.to, n.tunnel);
    });
    return o;
  });

  let visited = []; try { visited = JSON.parse(sessionStorage.getItem('essay.visited') || '[]'); } catch (_) {}
  hubNodes.forEach((o, i) => { if (visited.includes(i)) o.el.classList.add('seen'); });
  const unlocked = !!sec.exit && (visited.length >= sec.nodes.length || /[?&]unlock/.test(location.search));
  let exitEl = null, exitA = 0, exitHover = false;
  if (sec.exit) {
    exitEl = document.createElement('a'); exitEl.className = 'node exit'; exitEl.href = ESSAY.pageOf(sec.exit.to); exitEl.textContent = sec.exit.text; root.parentNode.appendChild(exitEl);
    exitEl.addEventListener('pointerenter', () => { exitHover = true; }); exitEl.addEventListener('pointerleave', () => { exitHover = false; });
    exitEl.addEventListener('click', ev => {
      ev.preventDefault(); if (!unlocked || ctx.leaving()) return;
      try { sessionStorage.setItem('essay.loop', String((+sessionStorage.getItem('essay.loop') || 0) + 1)); sessionStorage.removeItem('essay.visited'); } catch (_) {}
      exitEl.classList.add('chosen'); leave(exitX, exitY, sec.exit.to, sec.exit.tunnel);
    });
  }
  let exitX = cx, exitY = cy;
  const EGG = Array.from({ length: 150 }, (_, k) => { const t = k / 150 * 6.2832; return { t, ph: Math.random() * 6.28 }; });
  const px = { x: -999, y: -999 };
  addEventListener('pointermove', e => { px.x = e.clientX; px.y = e.clientY; if (!fig.on) { fig.x = px.x; fig.y = px.y; fig.on = true; } });

  const FIG_S = 0.1;
  const HOLE = 46;
  const fig = { x: -999, y: -999, vx: 0, vy: 0, a: 0, on: false, pts: [] };

  function makeStage(u) {
    const c = document.createElement('canvas'); c.width = c.height = 200; const k = c.getContext('2d');
    k.fillStyle = k.strokeStyle = '#fff'; k.lineCap = k.lineJoin = 'round';
    const L = (a, b) => a + (b - a) * u;
    const bez = (t, a, b, cc, d) => { const w = 1 - t; return w * w * w * a + 3 * w * w * t * b + 3 * w * t * t * cc + t * t * t * d; };
    const limb = (w, ...pts) => { k.lineWidth = w; k.beginPath(); k.moveTo(...pts[0]); pts.slice(1).forEach(q => k.lineTo(...q)); k.stroke(); };
    const cut = fn => { k.globalCompositeOperation = 'destination-out'; fn(); k.globalCompositeOperation = 'source-over'; };
    const dot = (x, y, r) => { k.beginPath(); k.arc(x, y, r, 0, 6.2832); k.fill(); };
    const A = L(0.3, 1), B = L(0.3, 1);
    const sx = 82, sy = 94, hx = 90, hy = 156;
    const arm = (w, ox, oy) => [[sx + ox, sy + oy], [sx + ox - 14 * A, sy + oy + 28 * A], [sx + ox - 24 * A, sy + oy + 4 * A]];
    const leg = (w, ox, oy) => [[hx + ox, hy + oy], [hx + ox - 32 * B, hy + oy - 26 * B], [hx + ox - 16 * B, hy + oy + 12 * B]];
    k.globalAlpha = 0.5; limb(9, ...arm(9, -2, 2)); limb(13, ...leg(13, 8, 4)); k.globalAlpha = 1;
    const p0 = [L(76, 74), L(72, 76)], p1 = [L(140, 134), L(70, 90)], p2 = [L(140, 132), L(150, 150)], p3 = [L(92, 88), L(150, 164)];
    for (let t = 0; t <= 1.001; t += 0.02) {
      dot(bez(t, p0[0], p1[0], p2[0], p3[0]), bez(t, p0[1], p1[1], p2[1], p3[1]), L(15, 17) + 5 * Math.sin(Math.PI * t) - 2 * t);
    }
    if (u < 0.92) for (let t = 0; t <= 1.001; t += 0.05) {
      dot(p3[0] - 28 * t * (1 - u), p3[1] + 12 * t - 20 * t * t * (1 - u), (8 * (1 - t) + 2) * (1 - u * 0.9));
    }
    dot(L(74, 74), 72, 11);
    if (u < 0.75) cut(() => dot(60, 102, 14 * (1 - u / 0.75))), dot(60, 102, 11 * (1 - u / 0.75));
    const hrx = L(31, 25), hry = L(33, 28), hrot = L(0.9, 0.6), hcx = L(60, 62), hcy = L(52, 56);
    cut(() => { k.beginPath(); k.ellipse(hcx, hcy, hrx + 3, hry + 3, hrot, 0, 6.2832); k.fill(); });
    k.beginPath(); k.ellipse(hcx, hcy, hrx, hry, hrot, 0, 6.2832); k.fill();
    if (u > 0.45) { const f = (u - 0.45) / 0.55; k.beginPath(); k.ellipse(44, 72, 5 * f, 4 * f, 0.6, 0, 6.2832); k.fill(); k.beginPath(); k.ellipse(80, 58, 4 * f, 7 * f, 0.6, 0, 6.2832); k.fill(); }
    const ar = arm(10, 0, 0), lg = leg(15, 0, 0);
    cut(() => { limb(15 * (0.6 + 0.4 * u), ...ar); });
    limb(L(9, 10), ...ar); if (u > 0.45) dot(ar[2][0] - 2, ar[2][1] - 2, 6 * (u - 0.45) / 0.55);
    cut(() => { limb(21 * (0.6 + 0.4 * u), ...lg); });
    limb(L(11, 15), ...lg); if (u > 0.45) { k.beginPath(); k.ellipse(lg[2][0] + 14, lg[2][1] + 8, 11 * (u - 0.45) / 0.55, 5 * (u - 0.45) / 0.55, -0.2, 0, 6.2832); k.fill(); }
    cut(() => dot(L(46, 50), L(60, 62), L(6, 3)));
    const im = k.getImageData(0, 0, 200, 200).data, step = Math.max(2, Math.round(0.58 / FIG_S)), pts = [];
    for (let y = 0; y < 200; y += step) for (let x = 0; x < 200; x += step) {
      if (im[(y * 200 + x) * 4 + 3] < 255 * (0.35 + 0.65 * Math.random())) continue;
      const t = Math.round(Math.min(1, Math.max(0, (y - 20) / 165)) * 6) / 6, a = [255, 228, 218], b = [255, 184, 160];
      pts.push({ x: x - 100 + (Math.random() - 0.5) * step * 0.6, y: y - 100 + (Math.random() - 0.5) * step * 0.6, r: 0.45 + Math.random() * 0.35, ph: Math.random() * 6.28,
                 col: 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')' });
    }
    return pts;
  }
  fig.pts = makeStage(1);

  let last = performance.now(), T = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!REDUCED) T += dt;
    if (!net) { net = grow(); }
    const { P, E, D, hubs } = net, A = 0.03 * R;
      if (fig.on) {
        const f = Math.min(1, 5 * dt); fig.vx += ((px.x - fig.x) * f - fig.vx) * 0.5; fig.vy += ((px.y - fig.y) * f - fig.vy) * 0.5;
        fig.x += (px.x - fig.x) * f; fig.y += (px.y - fig.y) * f;
        const here = Math.abs(px.x - cx) < 1.25 * R && Math.abs(px.y - cy) < 1.1 * R && !ctx.leaving();
        fig.a += ((here ? 1 : 0) - fig.a) * Math.min(1, 2.5 * dt);
      }
    const pos = P.map(q => [cx + q.x + A * Math.sin(T * 0.31 + q.ph), cy + q.y + A * Math.cos(T * 0.27 + q.ph * 1.3)]);
    g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
    const paths = COL.map(() => new Path2D());
    for (const d of D) {
      let x, y;
      if (d.n >= 0) { x = pos[d.n][0] + d.ox; y = pos[d.n][1] + d.oy; }
      else {
        const e = d.e, a = pos[e.a], b = pos[e.b]; d.s += d.v * dt * (REDUCED ? 0 : 1); if (d.s > 1) d.s -= 1; else if (d.s < 0) d.s += 1;
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, s = d.s;
        const qx = (1 - s) * (1 - s) * a[0] + 2 * s * (1 - s) * ((a[0] + b[0]) / 2 + nx * e.bend) + s * s * b[0];
        const qy = (1 - s) * (1 - s) * a[1] + 2 * s * (1 - s) * ((a[1] + b[1]) / 2 + ny * e.bend) + s * s * b[1];
        const wpx = e.w * 5.2 * (e.tendril ? 1 : 1 + 0.9 * (1 - Math.sin(Math.PI * s)));
        x = qx + nx * d.off * wpx; y = qy + ny * d.off * wpx;
      }
      const ddx = x - fig.x, ddy = y - fig.y, dd = Math.hypot(ddx, ddy);
      if (dd < HOLE && dd > 0.1) { const f = Math.pow(1 - dd / HOLE, 2) * 24; x += ddx / dd * f; y += ddy / dd * f; }
      paths[d.c].moveTo(x + d.r, y); paths[d.c].arc(x, y, d.r, 0, 6.2832);
    }
    paths.forEach((pa, k) => { g.fillStyle = COL[k]; g.fill(pa); });
    if (fig.on && fig.a > 0.01) {
      const beat = REDUCED ? 0 : Math.pow(Math.max(0, Math.sin(T * 10.6)), 8), sc = FIG_S * (1 + 0.05 * beat) * (1 + 0.015 * Math.sin(T * 1.3));
      const tilt = Math.max(-0.5, Math.min(0.5, fig.vx * 0.03)) + 0.14 * Math.sin(T * 0.7), cs = Math.cos(tilt), sn = Math.sin(tilt);
      const bx = fig.x, by = fig.y + 1.5 * Math.sin(T * 1.1);

      const buckets = {};
      g.globalAlpha = fig.a * (0.9 + 0.1 * Math.sin(T * 6));
      for (const d of fig.pts) {
        const jx = REDUCED ? 0 : Math.sin(T * 2.1 + d.ph) * 0.3, jy = REDUCED ? 0 : Math.cos(T * 1.7 + d.ph) * 0.3;
        const lx = (d.x + jx) * sc, ly = (d.y + jy) * sc, x = bx + lx * cs - ly * sn, y = by + lx * sn + ly * cs;
        const bp = buckets[d.col] || (buckets[d.col] = new Path2D()); bp.moveTo(x + d.r, y); bp.arc(x, y, d.r, 0, 6.2832);
      }
      for (const col in buckets) { g.fillStyle = col; g.fill(buckets[col]); }
      g.globalAlpha = 1;
    }
    if (exitEl) {
      if (net.exitIdx === undefined) { let b = -1, bd = 1e9; P.forEach((q, i) => { if (q.hub) return; const d = Math.hypot(q.x, q.y); if (d < bd) { bd = d; b = i; } }); net.exitIdx = b; }
      const p = pos[net.exitIdx]; exitX = p[0]; exitY = p[1];
      exitA += ((unlocked ? 1 : 0) - exitA) * Math.min(1, 1.6 * dt);
      if (exitA > 0.01) {
        const w = 0.085 * R * (1 + 0.04 * Math.sin(T * 1.4)), h = w * 1.3, ep = new Path2D();
        for (const d of EGG) { const x = p[0] + w * Math.sin(d.t) * (1 - 0.18 * Math.cos(d.t)) + Math.sin(T * 1.3 + d.ph) * 0.7, y = p[1] - h * Math.cos(d.t) + Math.cos(T * 1.1 + d.ph) * 0.7;
          ep.moveTo(x + 1.4, y); ep.arc(x, y, 1.4, 0, 6.2832); }
        g.globalAlpha = exitA * (exitHover ? 1 : 0.8); g.fillStyle = '#fff'; g.fill(ep); g.globalAlpha = 1;
      }
      exitEl.classList.toggle('on', unlocked && exitA > 0.5);
      exitEl.style.transform = 'translate(' + p[0].toFixed(1) + 'px,' + p[1].toFixed(1) + 'px) translate(-50%,-50%) scale(' + (exitHover ? 1.2 : 1) + ')';
    }
    hubNodes.forEach((o, i) => {
      const h = hubs[i], p = pos[P.indexOf(h)]; o.x = p[0]; o.y = p[1];
      o.el.style.transform = 'translate(' + p[0].toFixed(1) + 'px,' + p[1].toFixed(1) + 'px) translate(-50%,-50%) scale(' + (o.hover ? 1.25 : 1) + ')';
      o.el.style.color = o.hover ? 'rgb(' + o.col.join(',') + ')' : '#fff';
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return () => { reveal(); setTimeout(() => hubNodes.forEach((o, i) => setTimeout(() => o.el.classList.add('on'), i * 260)), 1800); };
};