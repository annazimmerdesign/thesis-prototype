const SECTION_TEXT = `Placeholder for the second section. The page opens in the dots of the first one, and the words arrive one at a time, white on black. Later sections can ask the reader to choose between statements or to pick a feeling, and not all of the text needs to be visible at once.`;

(() => {
  const m = location.hash.match(/#(\d+),(\d+)/);
  const ox = m ? +m[1] : innerWidth / 2, oy = m ? +m[2] : innerHeight / 2;

  const box = document.getElementById('text');
  const spans = SECTION_TEXT.trim().split(/\s+/).map(w => {
    const s = document.createElement('span'); s.textContent = w + ' '; box.appendChild(s); return s;
  });

  const reveal = () => spans.forEach((s, i) => setTimeout(() => s.classList.add('on'), 700 + i * 90));
  const ready = (document.fonts && document.fonts.load) ? document.fonts.load('32px DT').catch(() => {}) : Promise.resolve();
  ready.then(() => { Tunnel.arrive(ox, oy, '#fff'); reveal(); });
})();