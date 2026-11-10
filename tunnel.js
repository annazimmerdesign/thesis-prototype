// Dot tunnel between pages: a 45-degree halftone lattice whose dots swell from a point until the
// screen is solid (out), or ripple away from a point on arrival (arrive).
const Tunnel = (() => {
  const PITCH = 14;                          // dot spacing in px
  const DUR_OUT = 1500, DUR_IN = 1700;       // ms
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function overlay() {
    const c = document.createElement('canvas');
    c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:50;pointer-events:none';
    document.body.appendChild(c);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = Math.round(innerWidth * dpr); c.height = Math.round(innerHeight * dpr);
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    return { c, g };
  }

  // dots on a 45-degree lattice centred on the origin, out to the farthest corner. It is a disc, not the page
  // rectangle, so the warp never exposes a straight edge.
  function lattice(w, h, ox, oy) {
    const pts = [], s = PITCH / Math.SQRT2;
    const R = Math.max(Math.hypot(ox, oy), Math.hypot(w - ox, oy), Math.hypot(ox, h - oy), Math.hypot(w - ox, h - oy));
    const n = Math.ceil(R / s) + 1;
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      if ((i + j) & 1) continue;
      const dx = i * s, dy = j * s, d = Math.hypot(dx, dy);
      if (d > R + PITCH) continue;
      pts.push([ox + dx, oy + dy, d, Math.atan2(dy, dx)]);
    }
    return { pts, reach: R };
  }

  // Moving through: the lattice is carried around the origin by a swirl that is strongest near the centre, pushed
  // outward past the viewer (zoom), and rippled in rings, so the dots read as the wall of a tunnel rushing by.
  // `T` is progress, `a` how far the warp is open (1 = full, 0 = the flat lattice).
  function warp(ox, oy, d, ang, T, a) {
    const zoom = 2.4 * a * a, swirl = 3.2 * a / (1 + d / 240);
    const ring = Math.sin(d * 0.032 - T * 16);
    const r = d * (1 + zoom) + 12 * a * ring + 30 * a * Math.sin(ang * 3 + T * 5 + d * 0.01);   // uneven on purpose
    const an = ang + swirl;
    return [ox + r * Math.cos(an), oy + r * Math.sin(an), 1 + zoom * 0.9, 0.78 + 0.22 * ring];
  }

  function run(dur, frame, done) {
    const t0 = performance.now();
    (function tick(now) {
      const t = Math.min(1, (now - t0) / dur);
      frame(t);
      if (t < 1) requestAnimationFrame(tick); else if (done) done();
    })(t0);
  }

  // grow black (or `color`) dots from (x, y) until the screen is covered, then call done
  function out(x, y, color, done) {
    if (REDUCED) { done && done(); return; }
    const { c, g } = overlay(), { pts, reach } = lattice(innerWidth, innerHeight, x, y);
    const ramp = 260, rMax = PITCH * 0.78, W = innerWidth, H = innerHeight;
    run(DUR_OUT, t => {
      const front = t * (reach + ramp), a = Math.min(1, 0.35 + t);
      g.clearRect(0, 0, W, H);
      g.fillStyle = color; g.beginPath();
      for (const [px, py, d, ang] of pts) {
        const k = Math.min(1, Math.max(0, (front - d) / ramp));
        if (k <= 0) continue;
        const [wx, wy, sc, mod] = warp(x, y, d, ang, t, a);
        if (wx < -60 || wy < -60 || wx > W + 60 || wy > H + 60) continue;
        const r = rMax * k * sc * mod * 1.15; g.moveTo(wx + r, wy); g.arc(wx, wy, r, 0, 6.2832);
      }
      g.fill();
      if (t > 0.82) { g.globalAlpha = Math.min(1, (t - 0.82) / 0.18); g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    }, done);
  }

  // on the next page. With `cover` (a colour) the page opens as a solid screen of that colour, which the
  // dots shrink away from, starting at (x, y); `ready` (a promise) holds the opening until the page is ready.
  // Without `cover`, a ring of dots in `color` ripples outward from (x, y) and is gone.
  function arrive(x, y, color, done, cover, ready) {
    if (REDUCED) { done && done(); return; }
    const { c, g } = overlay(), { pts, reach } = lattice(innerWidth, innerHeight, x, y);
    const ramp = cover ? 260 : 420, rMax = PITCH * 0.78;
    const W = innerWidth, H = innerHeight;
    const paint = front => {
      const T = Math.min(1, front / (reach + ramp)), open = cover ? Math.pow(1 - T, 1.4) : 0.5 * Math.sin(Math.PI * T);
      g.clearRect(0, 0, W, H);
      g.fillStyle = cover || color;
      if (cover && T < 0.45) { g.globalAlpha = 1 - T / 0.45; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
      g.beginPath();
      for (const [px, py, d, ang] of pts) {
        const k = (front - d) / ramp;
        let r;
        if (cover) { if (k >= 1) continue; r = k <= 0 ? rMax : rMax * (1 - k); }
        else { if (k <= 0 || k >= 1) continue; r = PITCH * 0.42 * Math.sin(Math.PI * k); }
        const [wx, wy, sc, mod] = warp(x, y, d, ang, T, open);
        if (wx < -60 || wy < -60 || wx > W + 60 || wy > H + 60) continue;
        r *= sc * mod * 1.15; g.moveTo(wx + r, wy); g.arc(wx, wy, r, 0, 6.2832);
      }
      g.fill();
    };
    if (cover) { g.fillStyle = cover; g.fillRect(0, 0, W, H); }
    Promise.resolve(ready).then(() => run(DUR_IN, t => paint(t * (reach + ramp)), () => { c.remove(); done && done(); }));
  }

  return { out, arrive };
})();