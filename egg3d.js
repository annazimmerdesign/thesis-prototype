// egg3d.js  (three.js)
// A small black egg, turning in space. Each tap adds hairline cracks and folds the crown of the shell back on a ragged
// hinge, so the shell opens like a flower and shows its inside (white, drawn with a black contour) on the outside.
// When it is open, a click takes hold of a word at the lip. Move the mouse and the words come out as one thread: a
// viscous, sticky chain dragged behind the cursor. When the last word is out, the thread lets go and the words slide into
// the passage. The link word is the way on, through the dot tunnel.

(() => {
'use strict';

// ---------- knobs ----------
const EGG_SIZE     = 0.16;            // egg height as a share of the window height (the 2D version used 0.105)
const EGG_Y        = 0.36;            // where the egg rests: its centre, as a share of the window height from the top
const CRACK_TAPS   = 6;               // taps it takes to open the shell
const TILT         = 0.6;             // radians the egg leans towards you, so you can see into it
const BLOOM_MAX    = Math.PI * 0.80;  // how far the crown folds back (pi = all the way down the outside); it may pass through the shell
const OPEN2_MAX    = Math.PI * 0.30;  // how far the second, lower tier of the shell opens
const STRETCH      = 0.5;             // how much the opened shell grows, as a share of its size
const LIP2_S       = 0.62;            // where the lower tier breaks
const LIP_S        = 0.30;            // where the shell breaks: 0 = the top of the egg, 1 = the bottom
const LIP_JAG      = 0.045;           // how ragged the break is

const HEAD_PULL    = 0.14;            // how tightly the first word follows the cursor (lower = stickier, lazier)
const NODE_FOLLOW  = 0.30;            // how tightly each word follows the thread's path (lower = more liquid)
const SPACING      = 1.0;             // word spacing along the thread (higher = looser)
const START_SCALE  = 0.22;            // size of a word at the lip, relative to its final size
const GROW_DIST    = 260;             // px from the lip over which a word grows to full size
const SETTLE_MS    = 2200;            // how long one word takes to sink into its place (ms)
const SETTLE_STAGGER = 32;            // ms between one word letting go and the next, so the string comes undone from the egg outward
const SETTLE_SAG   = 22;              // px a word droops below its path while it sinks (0 for none)

const DODGE_RADIUS = 80;              // px: settled words slide away from a moving cursor inside this distance
const DODGE_FORCE  = 1.4;
const FONT_MAX     = 32;              // px; the text shrinks to fit, down to FONT_MIN
const FONT_MIN     = 14;
const FONT_FAMILY  = "'DT', sans-serif";
// ----------------------------------

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const cv = document.getElementById('stage'), wordsEl = document.getElementById('words');
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const smooth = t => t * t * (3 - 2 * t);
const rnd = (lo, hi) => lo + Math.random() * (hi - lo);

// ---------- three ----------
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
renderer.setClearColor(0xffffff, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
const FOV_TAN = Math.tan(THREE.MathUtils.degToRad(15));
const group = new THREE.Group(); scene.add(group);

// the shell is a surface of revolution: s runs from the top of the egg (0) to the bottom (1), t is the angle round it
const PH = Array.from({ length: 5 }, () => rnd(0, 6.2832));
const jagJS = th => 0.45 * Math.sin(3 * th + PH[0]) + 0.30 * Math.sin(7 * th + PH[1]) + 0.20 * Math.sin(13 * th + PH[2])
                  + 0.12 * Math.sin(29 * th + PH[3]) + 0.07 * Math.sin(53 * th + PH[4]);
const jag2JS = th => 0.5 * Math.sin(4 * th + PH[2]) + 0.3 * Math.sin(9 * th + PH[3]) + 0.2 * Math.sin(19 * th + PH[0]);
const profJS = s => { const t = s * Math.PI, y = Math.cos(t); return [0.76 * Math.sin(t) * (1 - 0.14 * y), y]; };

function buildGeometry(NS, NT) {
  const pos = [], aS = [], aT = [], idx = [];
  for (let i = 0; i <= NS; i++) {
    const s = i / NS, [r, y] = profJS(s);
    for (let j = 0; j <= NT; j++) {
      const th = j / NT * Math.PI * 2;
      pos.push(r * Math.cos(th), y, r * Math.sin(th)); aS.push(s); aT.push(th);
    }
  }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NT; j++) {
    const a = i * (NT + 1) + j, b = a + 1, c = a + NT + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
  g.setIndex(idx);
  return g;
}

// cracks are drawn into a texture (u = round the egg, v = top to bottom) that the shell samples
const TW = 1536, TH = 1024;
const tcv = document.createElement('canvas'); tcv.width = TW; tcv.height = TH;
const tg = tcv.getContext('2d'); tg.fillStyle = '#000'; tg.fillRect(0, 0, TW, TH);
const crackTex = new THREE.CanvasTexture(tcv);
crackTex.wrapS = THREE.RepeatWrapping; crackTex.anisotropy = 4; crackTex.flipY = false;

const material = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: {
    uBloom: { value: 0 }, uOpen2: { value: 0 }, uStretch: { value: 0 }, uWob: { value: 0 }, uTime: { value: 0 },
    uLip: { value: LIP_S }, uLip2: { value: LIP2_S }, uJag: { value: LIP_JAG },
    uPh: { value: new THREE.Vector4(PH[0], PH[1], PH[2], PH[3]) }, uPh4: { value: PH[4] },
    uCrack: { value: crackTex }, uHue: { value: 0 }
  },
  vertexShader: `
    attribute float aS; attribute float aT;
    uniform float uBloom, uOpen2, uStretch, uWob, uTime, uLip, uLip2, uJag, uPh4; uniform vec4 uPh;
    varying vec3 vView; varying vec3 vN; varying vec2 vUv; varying float vAO; varying float vS;
    const float PI = 3.14159265;
    vec2 prof(float s) { float t = s * PI, y = cos(t); return vec2(0.76 * sin(t) * (1.0 - 0.14 * y), y); }
    vec2 rot(vec2 d, float a) { float c = cos(a), s = sin(a); return vec2(c * d.x + s * d.y, -s * d.x + c * d.y); }
    float jag(float th) {
      return 0.45 * sin(3.0 * th + uPh.x) + 0.30 * sin(7.0 * th + uPh.y) + 0.20 * sin(13.0 * th + uPh.z)
           + 0.12 * sin(29.0 * th + uPh.w) + 0.07 * sin(53.0 * th + uPh4);
    }
    float jag2(float th) { return 0.5 * sin(4.0 * th + uPh.z) + 0.3 * sin(9.0 * th + uPh.w) + 0.2 * sin(19.0 * th + uPh.x); }
    // the shell at (s, th). Two tiers, each hinged on its own ragged break and folded back and out: the crown first,
    // then everything above the second break. The opened shell grows, curls, and slowly writhes; it may pass through itself.
    vec3 surf(float s, float th) {
      float lip1 = uLip + uJag * jag(th), lip2 = uLip2 + uJag * 1.3 * jag2(th);
      vec2 p = prof(s), pl1 = prof(lip1), pl2 = prof(lip2);
      float wob = uWob * 0.12 * sin(uTime * 1.2 + th * 3.0 + s * 9.0);
      if (s < lip1) {
        float ph = uBloom * (0.75 + 0.5 * sin(5.0 * th + uPh.y)) * (1.0 + 0.6 * (lip1 - s) / lip1) + wob;
        p = pl1 + rot((p - pl1) * (1.0 + uStretch), ph);
      }
      if (s < lip2) {
        float ph2 = uOpen2 * (0.8 + 0.4 * sin(3.0 * th + uPh.x)) + wob * 0.6;
        p = pl2 + rot((p - pl2) * (1.0 + 0.4 * uStretch), ph2);
      }
      return vec3(p.x * cos(th), p.y, p.x * sin(th));
    }
    void main() {
      float lip2 = uLip2 + uJag * 1.3 * jag2(aT);
      vec2 pl2 = prof(lip2);
      vec3 w = surf(aS, aT);
      float e = 0.0015;
      vec3 ps = surf(aS + e, aT) - surf(aS - e, aT), pt = surf(aS, aT + e) - surf(aS, aT - e);
      vec3 n = cross(pt, ps); float L = length(n);
      n = L > 1e-7 ? n / L : vec3(0.0, aS < 0.5 ? 1.0 : -1.0, 0.0);
      vec4 mv = modelViewMatrix * vec4(w, 1.0);
      vView = mv.xyz; vN = normalMatrix * n; vUv = vec2(aT / (2.0 * PI), aS); vS = aS;
      vAO = aS < lip2 ? 0.0 : clamp((pl2.y - w.y) / 1.3, 0.0, 1.0);   // deeper inside the cup = darker
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform sampler2D uCrack; uniform float uHue, uTime;
    varying vec3 vView; varying vec3 vN; varying vec2 vUv; varying float vAO; varying float vS;
    void main() {
      float ndv = abs(dot(normalize(vN), normalize(-vView)));
      vec3 col;
      if (gl_FrontFacing) {                              // the outside: black, with white hairline cracks
        col = mix(vec3(0.0), vec3(1.0), texture2D(uCrack, vUv).r);
      } else {                                           // the inside, now facing out: white, drawn with a contour
        float rim = pow(1.0 - ndv, 2.6);
        col = mix(vec3(0.97), vec3(0.12), vAO * 0.8);
        // colour arrives with the unfolding: the hyperbolic, crocheted forms of the moodboard. Lavender, plum and
        // crimson-magenta, laid down in stitch rows, with a thin blue / orange sheen at the grazing edges.
        if (uHue > 0.0) {
          float u = vUv.x * 6.2832;
          float g = 0.5 + 0.28 * sin(u * 2.0 + vS * 5.0 + uTime * 0.3) + 0.22 * sin(u * 3.0 - vS * 8.0) + 0.45 * vAO;
          vec3 azure = vec3(0.227, 0.525, 1.0), violet = vec3(0.514, 0.220, 0.925), pink = vec3(1.0, 0.0, 0.431), orange = vec3(0.984, 0.337, 0.027), amber = vec3(1.0, 0.745, 0.043);
          float h = clamp(g, 0.0, 1.0) * 4.0;
          vec3 c = mix(azure, violet, smoothstep(0.0, 1.0, h));
          c = mix(c, pink, smoothstep(1.0, 2.0, h));
          c = mix(c, orange, smoothstep(2.0, 3.0, h));
          c = mix(c, amber, smoothstep(3.0, 4.0, h));
          c = mix(c, azure, 0.25 * pow(1.0 - ndv, 2.0));                    // azure pools toward the edges
          c *= 1.0 - 0.35 * vAO;
          col = mix(col, c, uHue);
          rim *= 1.0 - 0.35 * uHue;
        }
        col = mix(col, mix(vec3(0.0), vec3(0.12, 0.03, 0.10), uHue), clamp(rim * 1.3, 0.0, 1.0));
        col = mix(col, vec3(0.0), smoothstep(0.022, 0.008, vS));   // the torn edge of the folded crown
      }
      gl_FragColor = vec4(col, 1.0);
    }`
});
const mesh = new THREE.Mesh(buildGeometry(200, 256), material);
group.add(mesh);
const raycaster = new THREE.Raycaster();

// ---------- state ----------
const st = {
  phase: 'egg',                     // egg -> opening -> open -> settling -> done
  taps: 0, B: 0, Bv: 0, Bt: 0, wobX: 0, wobXv: 0, wobZ: 0, wobZv: 0, spin: 0.25, mx: 0.5,
  cracks: [], dirty: false, lw: 8,
  W: 0, H: 0, eggPx: 0, S: { x: 0, y: 0 },
  tokens: [], slots: [], fs: FONT_MAX, nodes: [], k: 0, relAt: 0,
  attached: false, trail: [], head: null, px: -999, py: -999, pvx: 0, pvy: 0, leaving: false
};

// ---------- sizing ----------
function build() {
  const W = innerWidth, H = innerHeight;
  st.W = W; st.H = H; st.eggPx = H * EGG_SIZE;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(W, H, false);
  camera.aspect = W / H;
  const d = 1 / (EGG_SIZE * FOV_TAN), visH = 2 * d * FOV_TAN;       // the egg is 2 units tall
  st.camD = d; camera.position.set(0, 0, d); camera.near = d * 0.2; camera.far = d * 3; camera.updateProjectionMatrix();
  group.position.y = (0.5 - EGG_Y) * visH;
  st.lw = clamp(0.95 * TH / st.eggPx, 2.5, 30);
  st.dirty = true;
  layoutText();
}

// ---------- cracks ----------
function crackFrom(u, v, steps) {
  let x = u * TW, y = v * TH, ang = rnd(0, 6.283); const pts = [[x, y]];
  for (let i = 0; i < steps; i++) {
    ang += rnd(-0.6, 0.6); x += Math.cos(ang) * 29; y += Math.sin(ang) * 29;
    if (y < TH * 0.04 || y > TH * 0.96) break; pts.push([x, y]);
  }
  return { pts, t0: performance.now(), dur: 320 };
}
function addCracks(u, v, tapNo) {
  const n = tapNo === 1 ? 3 : 5;
  for (let i = 0; i < n; i++) {
    if (i === 0 || !st.cracks.length) st.cracks.push(crackFrom(u + rnd(-0.02, 0.02), clamp(v + rnd(-0.03, 0.03), 0.06, 0.94), Math.floor(rnd(5, 9))));
    else {
      const src = st.cracks[Math.floor(Math.random() * st.cracks.length)], q = src.pts[Math.floor(Math.random() * src.pts.length)];
      st.cracks.push(crackFrom(q[0] / TW, q[1] / TH, Math.floor(rnd(4, 8))));
    }
  }
  st.dirty = true;
}
function addLipCrack(u, second) {               // a break line, running both ways round the egg from the tap
  for (const dir of [1, -1]) {
    const pts = [];
    for (let a = 0; a <= Math.PI + 0.001; a += 0.02) {
      const th = u * 6.2832 + dir * a;
      pts.push([th / 6.2832 * TW, second ? (LIP2_S + LIP_JAG * 1.3 * jag2JS(th)) * TH : (LIP_S + LIP_JAG * jagJS(th)) * TH]);
    }
    st.cracks.push({ pts, t0: performance.now(), dur: 900 });
  }
  st.dirty = true;
}
function paintCracks(now) {
  tg.fillStyle = '#000'; tg.fillRect(0, 0, TW, TH);
  tg.strokeStyle = '#fff'; tg.lineWidth = st.lw; tg.lineJoin = 'round'; tg.lineCap = 'round';
  let growing = false;
  for (const c of st.cracks) {
    const p = clamp((now - c.t0) / c.dur, 0, 1); if (p < 1) growing = true;
    const up = p * (c.pts.length - 1), n = Math.floor(up);
    for (const off of [-TW, 0, TW]) {
      tg.beginPath(); tg.moveTo(c.pts[0][0] + off, c.pts[0][1]);
      for (let i = 1; i <= n; i++) tg.lineTo(c.pts[i][0] + off, c.pts[i][1]);
      if (n < c.pts.length - 1) { const a = c.pts[n], b = c.pts[n + 1], f = up - n; tg.lineTo(a[0] + (b[0] - a[0]) * f + off, a[1] + (b[1] - a[1]) * f); }
      tg.stroke();
    }
  }
  crackTex.needsUpdate = true; st.dirty = growing;
}

// ---------- tapping the egg ----------
function pick(x, y) {                           // where on the shell (u round, v down) a screen point lands
  group.updateMatrixWorld(true);
  raycaster.setFromCamera({ x: x / st.W * 2 - 1, y: -(y / st.H) * 2 + 1 }, camera);
  const hit = raycaster.intersectObject(mesh)[0]; if (!hit) return null;
  const p = mesh.worldToLocal(hit.point.clone());
  let th = Math.atan2(p.z, p.x); if (th < 0) th += 6.2832;
  return { u: th / 6.2832, v: Math.acos(clamp(p.y, -1, 1)) / Math.PI };
}
function tap(x, y) {
  if (st.phase !== 'egg') return;
  const h = pick(x, y); if (!h) return;
  st.taps++;
  st.wobXv += rnd(-1, 1) * (0.03 + 0.012 * st.taps); st.wobZv += rnd(-1, 1) * (0.03 + 0.012 * st.taps);
  addCracks(h.u, clamp(h.v, 0.08, 0.92), st.taps);
  if (st.taps === 2) addLipCrack(h.u);
  if (st.taps === 4) addLipCrack(h.u + 0.5, true);
  st.Bt = st.taps / CRACK_TAPS;
  if (st.taps >= CRACK_TAPS) st.phase = 'opening';
}

// ---------- text layout ----------
const mg = document.createElement('canvas').getContext('2d');
function parseTokens() {
  const sec = ESSAY.sections.intro;
  return sec.text.trim().split(/\s+/).map(tok => {
    const m = tok.match(/^\[\[(.+?)(?:\|(.+?))?\]\](.*)$/);
    return m ? { text: m[1] + m[3], link: true, href: ESSAY.pageOf(m[2] || sec.next) } : { text: tok, link: false };
  });
}
function layoutText() {
  if (!st.tokens.length) st.tokens = parseTokens();
  const W = st.W, H = st.H, maxW = Math.min(W * 0.92, 920), left = (W - maxW) / 2;
  const top = H * EGG_Y + st.eggPx * 0.5 + 0.06 * H, avail = H * 0.95 - top;
  let fs = FONT_MAX, slots, lineH;
  for (; fs >= FONT_MIN; fs -= 1) {
    mg.font = fs + 'px ' + FONT_FAMILY; lineH = fs * 1.45;
    const sp = mg.measureText(' ').width; slots = []; let x = 0, line = 0;
    for (const t of st.tokens) {
      const w = mg.measureText(t.text).width;
      if (x > 0 && x + w > maxW) { x = 0; line++; }
      slots.push({ x: left + x, y: top + line * lineH, w, h: lineH }); x += w + sp;
    }
    if ((line + 1) * lineH <= avail) break;
  }
  st.fs = Math.max(fs, FONT_MIN); st.slots = slots;
  st.nodes.forEach(n => { const s = slots[n.i]; n.w = s.w; n.h = s.h; n.el.style.fontSize = st.fs + 'px'; n.el.style.lineHeight = s.h + 'px'; });
}

// ---------- the thread ----------
// The first word is held by the cursor and trails it with a lag. The path it travels is the thread: every other word sits
// a fixed distance back along that path, and a word leaves the egg when the path has grown long enough to reach it.
const gap = () => st.fs * 0.5;
const scaleAt = d => START_SCALE + (1 - START_SCALE) * smooth(clamp(d / GROW_DIST, 0, 1));
function spawn(now) {
  const i = st.k, t = st.tokens[i], s = st.slots[i];
  const el = document.createElement(t.link ? 'a' : 'span');
  el.className = t.link ? 'w link' : 'w';
  if (t.link) { el.href = t.href; el.style.pointerEvents = 'none'; }
  el.textContent = t.text; el.style.fontSize = st.fs + 'px'; el.style.lineHeight = s.h + 'px';
  wordsEl.appendChild(el);
  st.nodes.push({ i, el, link: t.link, w: s.w, h: s.h, x: st.S.x, y: st.S.y, sc: START_SCALE, ang: 0, o: 0, born: now,
                  mode: 'rope', delay: 0, ox: 0, oy: 0, ovx: 0, ovy: 0, live: false });
  st.k++;
}
function pointAt(a) {                            // the point a px along the thread's path from the lip
  const T = st.trail; if (a <= 0 || T.length < 2) return T[0];
  let lo = 0, hi = T.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m].len < a) lo = m; else hi = m; }
  const p = T[lo], q = T[hi], f = (a - p.len) / ((q.len - p.len) || 1);
  return { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f };
}

function updateThread(dt, now) {
  const N = st.nodes, S = st.S, n = st.tokens.length;
  if (st.phase === 'open') {
    if (st.k === 0) { spawn(now); st.trail = [{ x: S.x, y: S.y, len: 0 }]; st.head = { x: S.x, y: S.y }; }
    st.trail[0].x = S.x; st.trail[0].y = S.y;
    if (st.attached) {                                           // the head trails the cursor; where it goes is the thread
      const f = Math.min(1, HEAD_PULL * dt), h = st.head;
      h.x += (st.px - h.x) * f; h.y += (st.py - h.y) * f;
      const l = st.trail[st.trail.length - 1], d = Math.hypot(h.x - l.x, h.y - l.y);
      if (d >= 2) st.trail.push({ x: h.x, y: h.y, len: l.len + d });
    }
    const T = st.trail[st.trail.length - 1].len;

    // how far back along the thread each word sits (closer to the lip the words are small, so they sit closer)
    let o = 0;
    for (let i = 0; i < N.length; i++) {
      const q = N[i]; q.o = o; q.sc = scaleAt(T - o);
      const nw = st.slots[i + 1] ? st.slots[i + 1].w : q.w;
      o += (0.5 * (q.w + nw) + gap()) * q.sc * SPACING;
    }
    while (st.k < n && o < T) {                                   // the thread has grown to reach the next word: it leaves the egg
      spawn(now); const q = N[N.length - 1]; q.o = o; q.sc = scaleAt(T - o);
      const nw = st.slots[q.i + 1] ? st.slots[q.i + 1].w : q.w; o += (0.5 * (q.w + nw) + gap()) * q.sc * SPACING;
    }
    for (const q of N) {                                          // words follow the path, a little behind it
      const tgt = pointAt(T - q.o), f = Math.min(1, NODE_FOLLOW * dt);
      q.x += (tgt.x - q.x) * f; q.y += (tgt.y - q.y) * f;
    }
    if (st.k === n && T - N[N.length - 1].o > 6) {               // the last word is out: let go and settle into the passage
      st.phase = 'settling'; st.relAt = now; st.attached = false; document.body.style.cursor = '';
      N.forEach(q => { q.delay = q.i * SETTLE_STAGGER; });
    }
  }

  // angles, settling, and the settled passage
  const sp = Math.hypot(st.pvx, st.pvy), pvn = clamp(sp / 14, 0, 1);
  for (let idx = 0; idx < N.length; idx++) {
    const q = N[idx], slot = st.slots[q.i], tx = slot.x + slot.w / 2, ty = slot.y + slot.h / 2;
    let x = q.x, y = q.y;
    if (q.mode === 'rope') {
      const pr = N[idx - 1], nx = N[idx + 1];
      let ax, ay;
      if (pr && nx) { ax = pr.x - nx.x; ay = pr.y - nx.y; } else if (pr) { ax = pr.x - q.x; ay = pr.y - q.y; } else if (nx) { ax = q.x - nx.x; ay = q.y - nx.y; } else { ax = 1; ay = 0; }
      let ang = Math.atan2(ay, ax); if (ang > Math.PI / 2) ang -= Math.PI; else if (ang < -Math.PI / 2) ang += Math.PI;   // always reads left to right
      q.ang += (clamp(ang, -1.25, 1.25) - q.ang) * Math.min(1, 0.2 * dt);
      if (st.phase === 'settling' && now - st.relAt >= q.delay) {
        q.mode = 'glide'; q.g = { t0: now, dur: SETTLE_MS * (0.85 + 0.3 * Math.random()), x: q.x, y: q.y, sc: q.sc, ang: q.ang,
                                  sag: SETTLE_SAG * (0.5 + Math.random()), ph: Math.random() * 6.28 };
      }
    }
    if (q.mode === 'glide') {
      // heavy and slow: x leads, y follows a little behind (the words sink), and each word droops and sways on the way
      const G = q.g, p = clamp((now - G.t0) / G.dur, 0, 1), ex = smooth(Math.pow(p, 0.85)), ey = smooth(Math.pow(p, 1.35)), e = smooth(p);
      const calm = 1 - p;
      q.x = G.x + (tx - G.x) * ex + Math.sin(p * 6.28 + G.ph) * 6 * calm * Math.sin(p * 3.14);
      q.y = G.y + (ty - G.y) * ey + G.sag * Math.sin(p * 3.14) * calm;
      q.sc = G.sc + (1 - G.sc) * e; q.ang = G.ang * (1 - e);
      x = q.x; y = q.y;
      if (p >= 1) { q.mode = 'set'; q.sc = 1; q.ang = 0; }
    }
    if (q.mode === 'set') {
      if (!q.link && pvn > 0) {                                  // slippery: a moving cursor makes a settled word slide off
        const dx = tx + q.ox - st.px, dy = ty + q.oy - st.py, d = Math.hypot(dx, dy);
        if (d < DODGE_RADIUS && d > 0.1) { const f = (1 - d / DODGE_RADIUS) * DODGE_FORCE * pvn; q.ovx += dx / d * f; q.ovy += dy / d * f; }
      }
      q.ovx = (q.ovx - q.ox * 0.03 * dt) * Math.pow(0.92, dt); q.ovy = (q.ovy - q.oy * 0.03 * dt) * Math.pow(0.92, dt);
      q.ox += q.ovx * dt; q.oy += q.ovy * dt;
      x = tx + q.ox; y = ty + q.oy;
      if (q.link && !q.live) { q.live = true; q.el.style.pointerEvents = 'auto'; }
    }
    let jx = 0, jy = 0;
    if (q.live && !REDUCED && !st.leaving) { jx = (Math.random() - 0.5) * 1.4; jy = (Math.random() - 0.5) * 1.1; }
    q.el.style.transform = `translate(${(x - q.w / 2 + jx).toFixed(2)}px,${(y - q.h / 2 + jy).toFixed(2)}px) rotate(${q.ang.toFixed(3)}rad) scale(${q.sc.toFixed(3)})`;
    q.el.style.opacity = clamp((now - q.born) / 250, 0, 1);
  }
  if (st.phase === 'settling' && N.length === n && N.every(q => q.mode === 'set')) st.phase = 'done';
}

// ---------- input ----------
addEventListener('pointerdown', e => {
  if (e.target.closest && e.target.closest('a.link')) return;
  st.px = e.clientX; st.py = e.clientY;
  if (st.phase === 'egg') tap(e.clientX, e.clientY);
  else if (st.phase === 'open') { st.attached = true; document.body.style.cursor = 'grabbing'; }
});
addEventListener('pointermove', e => {
  st.pvx = e.clientX - st.px; st.pvy = e.clientY - st.py; st.px = e.clientX; st.py = e.clientY; st.mx = e.clientX / st.W;
});
const letGo = e => { if (st.attached && st.phase === 'open' && e.pointerType !== 'mouse') st.attached = false; };   // a mouse stays stuck; a finger lets go
addEventListener('pointerup', letGo); addEventListener('pointercancel', letGo);
addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  if (document.activeElement && document.activeElement.classList.contains('link')) return;
  e.preventDefault();
  if (st.phase === 'egg') tap(st.W / 2 + rnd(-0.2, 0.2) * st.eggPx, st.H * EGG_Y + rnd(-0.2, 0.2) * st.eggPx);
  else if (st.phase === 'open') st.attached = !st.attached;
});
// ---------- the door ----------
// The link word is drawn again in 3D: a corridor of copies of itself, each one folded back on itself, twisting and
// rushing past the viewer while the rest of the page falls away. The blue floods in at the end and the next page opens in it.
const DOOR_MS = 2800, DOOR_N = 26, DOOR_DZ = 1.1;
const doorVS = `
  uniform float uFold, uTime, uIdx, uHW; varying vec2 vUv;
  mat2 r(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
  void main() {
    vUv = uv; vec3 q = position / uHW;
    for (int k = 0; k < 4; k++) {                  // space folded over itself, again and again
      float fk = float(k);
      vec3 c = vec3(0.30 + 0.10 * fk, 0.18, 0.45) * (1.0 + 0.4 * sin(uTime * 1.7 + fk * 2.0 + uIdx * 0.6));
      q = mix(q, abs(q) - c, uFold);
      q.xy = r(0.35 * uFold * (fk + 1.0) + 0.2 * sin(uTime + uIdx)) * q.xy;
      q.yz = r(0.50 * uFold * (fk * 0.7 + 0.4)) * q.yz;
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(q * uHW, 1.0);
  }`;
const doorFS = `
  uniform sampler2D uMap; uniform vec3 uCol; uniform float uFog, uSwell; varying vec2 vUv;
  void main() {
    // the letters swell: a blurred copy of the glyphs is cut at a falling threshold, so the strokes bloom into one another
    float a = texture2D(uMap, vUv, 4.5 * smoothstep(0.3, 1.0, uSwell)).a;
    if (a < 0.35 * pow(1.0 - uSwell, 2.5) + 0.02) discard;
    gl_FragColor = vec4(mix(uCol, vec3(1.0), uFog), 1.0);
  }`;
function doorStart(el, x, y, fixedT) {
  const col = ESSAY.sections.intro.tunnel || TUNNEL_COLOR;
  const r = el.getBoundingClientRect(), css = getComputedStyle(el).color;
  const SC = 4, pad = 8, cw = Math.ceil(r.width * SC) + pad * 2, ch = Math.ceil(r.height * SC) + pad * 2;
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const g2 = c.getContext('2d'); g2.font = (st.fs * SC) + 'px ' + FONT_FAMILY; g2.fillStyle = css;
  g2.textBaseline = 'middle'; g2.fillText(el.textContent, pad, ch / 2 + st.fs * SC * 0.04);
  const tex = new THREE.CanvasTexture(c);
  const upp = (2 * st.camD * FOV_TAN) / st.H, ww = cw / SC * upp, hh = ch / SC * upp;
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const wx = (cx - st.W / 2) * upp, wy = (st.H / 2 - cy) * upp;
  const geo = new THREE.PlaneGeometry(ww, hh, 56, 18), meshes = [];
  const rgb = new THREE.Color(css);
  for (let j = 0; j < DOOR_N; j++) {
    const m = new THREE.ShaderMaterial({ side: THREE.DoubleSide, vertexShader: doorVS, fragmentShader: doorFS,
      uniforms: { uMap: { value: tex }, uCol: { value: new THREE.Vector3(rgb.r, rgb.g, rgb.b) }, uFog: { value: 0 },
                  uFold: { value: 0 }, uSwell: { value: 0 }, uTime: { value: 0 }, uIdx: { value: j }, uHW: { value: ww / 2 } } });
    const mm = new THREE.Mesh(geo, m); mm.position.set(wx, wy, 0); mm.visible = j === 0; scene.add(mm); meshes.push(mm);
  }
  el.style.opacity = 0;
  const veil = document.createElement('div');
  veil.style.cssText = 'position:fixed;inset:0;z-index:60;pointer-events:none;opacity:0;background:' + col;
  document.body.appendChild(veil);
  st.door = { rgb, colRGB: new THREE.Color(col), t0: performance.now(), meshes, wx, wy, veil, x, y, col, fixedT, el, done: false };
}
function doorUpdate(now) {
  const D = st.door; if (!D || D.done) return;
  const t = D.fixedT != null ? D.fixedT : clamp((now - D.t0) / DOOR_MS, 0, 1);
  const swell = smooth(clamp((t - 0.3) / 0.6, 0, 1)), fold = (0.28 + 0.55 * swell) * smooth(clamp(t / 0.6, 0, 1)), tt = smooth(t), ctr = smooth(clamp(t / 0.6, 0, 1));
  const K = 3.0, travel = st.camD * 1.5 * (Math.exp(K * t) - 1) / (Math.exp(K) - 1);
  D.meshes.forEach((m, j) => {
    const z = -j * DOOR_DZ * (0.4 + 0.6 * tt) + travel;           // the corridor opens out as it rushes at you
    const sw = tt * (0.25 + 0.05 * j), a = j * 0.55 + t * 3.0;
    m.position.set(D.wx * (1 - ctr) + Math.cos(a) * sw, D.wy * (1 - ctr) + Math.sin(a) * sw, z);
    m.scale.setScalar(1 + 5 * tt + 16 * swell * swell);
    m.rotation.z = j * 0.18 * tt + t * 0.8;
    m.visible = (j === 0 || t > 0.04) && z < st.camD - 0.4;
    const u = m.material.uniforms; u.uFold.value = fold; u.uSwell.value = swell; u.uTime.value = now / 1000;
    u.uCol.value.set(D.rgb.r + (D.colRGB.r - D.rgb.r) * swell, D.rgb.g + (D.colRGB.g - D.rgb.g) * swell, D.rgb.b + (D.colRGB.b - D.rgb.b) * swell);
    u.uFog.value = clamp(-z / 30, 0, 0.8) * (1 - swell);
  });
  camera.rotation.z = t * t * 0.5;
  wordsEl.style.opacity = String(1 - clamp(t / 0.25, 0, 1));
  D.veil.style.opacity = String(smooth(clamp((t - 0.93) / 0.07, 0, 1)));   // only a safety net: the swollen shards should already fill the screen
  if (t >= 1 && D.fixedT == null) {
    D.done = true;
    location.href = D.el.getAttribute('href') + '#' + Math.round(D.x) + ',' + Math.round(D.y) + ',' + D.col.replace('#', '');
  }
}
wordsEl.addEventListener('click', e => {
  const el = e.target.closest && e.target.closest('a.link'); if (!el || st.leaving) return;
  e.preventDefault(); st.leaving = true;
  const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  if (REDUCED) { const col = ESSAY.sections.intro.tunnel || TUNNEL_COLOR; Tunnel.out(x, y, col, () => { location.href = el.getAttribute('href') + '#' + Math.round(x) + ',' + Math.round(y) + ',' + col.replace('#', ''); }); return; }
  doorStart(el, x, y);
});

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  const dt = clamp((now - last) / 16.667, 0.2, 2.5); last = now;
  st.pvx *= Math.pow(0.8, dt); st.pvy *= Math.pow(0.8, dt);

  // the shell opens as you tap: a spring, so each tap overshoots a little
  st.Bv += (st.Bt - st.B) * 0.04 * dt; st.Bv *= Math.pow(0.84, dt); st.B += st.Bv * dt;
  const B = Math.max(0, st.B);
  const U = material.uniforms;
  U.uBloom.value = BLOOM_MAX * B * B;
  U.uOpen2.value = OPEN2_MAX * smooth(clamp((B - 0.45) / 0.55, 0, 1));
  U.uStretch.value = STRETCH * smooth(clamp(B, 0, 1));
  U.uWob.value = clamp(B, 0, 1); U.uTime.value = now / 1000;
  U.uHue.value = smooth(clamp((B - 0.4) / 0.6, 0, 1));
  if (st.phase === 'opening' && Math.abs(st.B - 1) < 0.015 && Math.abs(st.Bv) < 0.003) st.phase = 'open';

  // wobble, a slow turn, and a little lean towards the cursor
  st.wobXv += (-0.12 * st.wobX - 0.06 * st.wobXv) * dt; st.wobX += st.wobXv * dt;
  st.wobZv += (-0.12 * st.wobZ - 0.06 * st.wobZv) * dt; st.wobZ += st.wobZv * dt;
  if (!REDUCED) mesh.rotation.y += st.spin * dt / 60;
  if (st.taps > 0) st.spin *= Math.pow(0.97, dt);
  group.rotation.x = TILT + st.wobX; group.rotation.z = st.wobZ;
  group.rotation.y += ((st.mx - 0.5) * 0.35 - group.rotation.y) * 0.05 * dt;

  if (st.dirty) paintCracks(now);
  group.updateMatrixWorld(true);
  const v = new THREE.Vector3(0, 0.5, 0); mesh.localToWorld(v); v.project(camera);   // the opening, in screen px
  st.S.x = (v.x + 1) / 2 * st.W; st.S.y = (1 - v.y) / 2 * st.H;
  doorUpdate(now);
  renderer.render(scene, camera);

  if (st.phase === 'open' || st.phase === 'settling' || st.phase === 'done') updateThread(dt, now);
  requestAnimationFrame(frame);
}

addEventListener('resize', build);
let started = false;
const start = () => { if (started) return; started = true; build(); requestAnimationFrame(frame); };
if (document.fonts && document.fonts.load) {
  document.fonts.load('32px DT').catch(() => {}).then(() => { start(); document.fonts.ready.then(() => layoutText()); });
  setTimeout(start, 1500);
} else start();

window.__egg3d = { st, tap, material, doorStart, doorUpdate };            // for testing
})();