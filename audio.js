
(function () {
  const TRACK = 'audio/eggin3d.mp3';
  const VOLUME = 0.5;        // 0 to 1
  const FADE_IN = 2200;      // ms, when the sound starts or resumes
  const KEY = 'essay.bgm', MUTE_KEY = 'essay.muted';

  const safe = { get(s, k) { try { return s.getItem(k); } catch (_) { return null; } }, set(s, k, v) { try { s.setItem(k, v); } catch (_) {} } };
  const saved = (() => { try { return JSON.parse(safe.get(sessionStorage, KEY)); } catch (_) { return null; } })();
  let muted = safe.get(localStorage, MUTE_KEY) === '1';

  const a = new Audio(); a.loop = true; a.preload = 'auto'; a.volume = 0; a.src = TRACK;
  let usable = false, playing = false, ducked = 1, ramp = 0;

  // volume ramps, so nothing starts or stops abruptly
  function fadeTo(v, ms) {
    cancelAnimationFrame(ramp);
    const from = a.volume, t0 = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - t0) / ms); a.volume = from + (v - from) * k * k * (3 - 2 * k);
      if (k < 1) ramp = requestAnimationFrame(step);
    })(t0);
  }
  const level = () => (muted ? 0 : VOLUME * ducked);

  function begin() {
    if (!usable || playing) return;
    if (saved && isFinite(a.duration) && a.duration > 0) {            // carry on from where the last page left off
      a.currentTime = ((saved.t + (Date.now() - saved.ts) / 1000) % a.duration + a.duration) % a.duration;
    }
    a.play().then(() => { playing = true; fadeTo(level(), FADE_IN); paint(); }).catch(() => waitForGesture());
  }
  function waitForGesture() {
    const go = () => { ['pointerdown', 'keydown', 'click', 'touchstart'].forEach(e => removeEventListener(e, go, true)); begin(); };
    ['pointerdown', 'keydown', 'click', 'touchstart'].forEach(e => addEventListener(e, go, true));
  }

  a.addEventListener('error', () => { console.warn('audio.js: could not load ' + TRACK + ' (put the track there, or change TRACK)'); });
  a.addEventListener('loadedmetadata', () => {
    usable = true; paint();
    if (saved && saved.on) begin(); else waitForGesture();          
  });

  // the toggle
  const btn = document.createElement('button');
  btn.id = 'bgm'; btn.type = 'button'; btn.setAttribute('aria-label', 'Toggle background sound');
  btn.style.cssText = 'position:fixed;left:18px;bottom:14px;z-index:60;background:none;border:0;padding:6px 4px;font:inherit;font-size:12px;letter-spacing:.06em;' +
    'color:#000;mix-blend-mode:difference;opacity:.6;cursor:pointer;display:none;';
  const paint = () => { btn.style.display = usable ? 'block' : 'none'; btn.textContent = muted ? 'sound off' : 'sound on'; };
  btn.addEventListener('mouseenter', () => { btn.style.opacity = 1; });
  btn.addEventListener('mouseleave', () => { btn.style.opacity = .6; });
  btn.addEventListener('click', e => {
    e.stopPropagation(); muted = !muted; safe.set(localStorage, MUTE_KEY, muted ? '1' : '0'); paint();
    if (!playing) begin(); 
  });
  addEventListener('DOMContentLoaded', () => document.body.appendChild(btn));
  if (document.body) document.body.appendChild(btn);

  // remember where we are for the next page
  const save = () => { if (usable) safe.set(sessionStorage, KEY, JSON.stringify({ t: a.currentTime, ts: Date.now(), on: playing })); };
  setInterval(save, 500); addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (!playing) return; if (document.hidden) a.pause(); else a.play().catch(() => {}); });

  // other scripts can dip the track, e.g. under the tunnel:  BGM.duck(0.3, 800) ... BGM.duck(1, 800)
  window.BGM = { el: a, duck(v, ms) { ducked = v; if (playing) fadeTo(level(), ms || 600); } };
})();