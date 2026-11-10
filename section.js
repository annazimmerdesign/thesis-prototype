// One engine for every section after the egg. The html page sets SECTION_ID; the content is in essay.js.
(() => {
  // the section is named in the url (?s=a) when several sections share a page, else by the page itself
  const ID = new URLSearchParams(location.search).get('s') || SECTION_ID;
  const sec = ESSAY.sections[ID];
  if (!sec) { console.error('essay.js has no section called "' + ID + '"'); return; }
  const FG = sec.dark ? '#fff' : '#000';
  document.body.classList.toggle('dark', !!sec.dark);

  // the previous page passes the click position in the URL hash as #x,y
  const m = location.hash.match(/#(\d+),(\d+)(?:,([0-9a-fA-F]{3,8}))?/);
  const ox = m ? +m[1] : innerWidth / 2, oy = m ? +m[2] : innerHeight / 2;

  const root = document.getElementById('page');
  let leaving = false;

  function leave(x, y, ref, color) {
    if (leaving) return; leaving = true;
    const col = color || sec.tunnel || TUNNEL_COLOR;     // a choice's colour, else the section's, else the default
    Tunnel.out(x, y, col, () => { location.href = ESSAY.pageOf(ref) + '#' + Math.round(x) + ',' + Math.round(y) + ',' + col.replace('#', ''); });
  }
  const centre = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  // ---- a passage: words arrive one at a time; an optional link word waits for a click ----
  function passage() {
    const p = document.createElement('p'); root.appendChild(p);
    const toks = sec.text.trim().split(/\s+/), pat = /^\[\[(.+?)(?:\|(.+?))?\]\](.*)$/;
    // no marked link word: the last word becomes the way on, to `next`
    if (!toks.some(t => pat.test(t)) && sec.next) toks[toks.length - 1] = '[[' + toks[toks.length - 1] + ']]';
    const spans = toks.map(tok => {
      const mm = tok.match(pat);
      const s = document.createElement(mm ? 'a' : 'span');
      if (mm) {
        s.className = 'link'; s.href = ESSAY.pageOf(mm[2] || sec.next); s.textContent = mm[1] + mm[3];
        s.addEventListener('click', e => { e.preventDefault(); leave(...centre(s), mm[2] || sec.next); });
      } else s.textContent = tok;
      s.classList.add('tok'); p.appendChild(s); p.appendChild(document.createTextNode(' '));
      return s;
    });
    return () => spans.forEach((s, i) => setTimeout(() => s.classList.add('on'), 700 + i * 90));
  }

  // ---- statements: all four are in view, the reader clicks the one they align with ----
  function statements() {
    const list = document.createElement('div'); list.className = 'choices'; root.appendChild(list);
    const btns = sec.choices.map((c, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = c.text;
      b.addEventListener('click', () => {
        if (leaving) return;
        try {   // kept for this visit, so later sections can read it back
          const path = JSON.parse(sessionStorage.getItem('essay.path') || '[]');
          path.push({ section: ID, choice: i, text: c.text });
          sessionStorage.setItem('essay.path', JSON.stringify(path));
        } catch (_) {}
        btns.forEach(o => o.classList.toggle('chosen', o === b));
        list.classList.add('decided');
        const [x, y] = centre(b);
        setTimeout(() => leave(x, y, c.to, c.tunnel), 650);
      });
      list.appendChild(b); return b;
    });
    return () => btns.forEach((b, i) => setTimeout(() => b.classList.add('on'), 700 + i * 380));
  }


  // a section type of its own lives in its own file, loaded before this one, which registers itself:
  //   SECTION_TYPES.myType = ctx => { ...build the page...; return () => { ...reveal it... }; };
  // ctx hands over what a type needs from this engine: { ID, sec, root, passage, leave, leaving }
  const ctx = { ID, sec, root, passage, leave, leaving: () => leaving };
  const custom = (window.SECTION_TYPES || {})[sec.type];
  if (sec.type !== 'statements' && sec.type !== 'passage' && !custom) { console.error('no section type "' + sec.type + '": load its script before section.js'); return; }
  const reveal = custom ? custom(ctx) : sec.type === 'statements' ? statements() : passage();
  const ready = (document.fonts && document.fonts.load) ? document.fonts.load('32px DT').catch(() => {}) : Promise.resolve();
  // a page reached through the tunnel opens as solid tunnel colour and the dots shrink away from the click
  Tunnel.arrive(ox, oy, FG, null, m ? (m[3] ? '#' + m[3] : TUNNEL_COLOR) : null, ready);
  ready.then(() => { reveal(); });
})();