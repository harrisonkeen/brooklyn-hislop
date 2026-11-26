/* Brooklyn Hislop: behaviour shared by p1–p3 (packages round 2, 2026-11-25).
   Laurels, the reel player + scene picking, the lightbox, count-ups, in-view flags, overscroll colour. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  root.classList.toggle('rm', reduce);
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  /* Laurels: two mirrored branches of leaves along an arc; leaves are numbered (--i) so CSS can grow them base → tip.
     Position lives on a wrapper <g>: a CSS transform on the leaf itself would wipe its transform attribute. */
  const NS = 'http://www.w3.org/2000/svg';
  const place = (node, x, y, deg) => { const w = document.createElementNS(NS, 'g'); w.setAttribute('transform', `translate(${x} ${y}) rotate(${deg})`); w.append(node); return w; };
  /* SHAPE: outline points of the left branch (viewBox units), so the fit below knows where leaves are at any height. */
  const SHAPE = [];
  function branch() {
    const g = document.createElementNS(NS, 'g'), keep = !SHAPE.length;
    const cx = 140, cy = 92, R = 76, a0 = 104, a1 = 226, n = 8;
    const rad = d => d * Math.PI / 180;
    const pt = (a, r) => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))];
    const outline = (x, y, deg, L, W) => { const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
      [[0, 0], [L, 0], [L * .5, W], [L * .5, -W], [L * .8, W * .7], [L * .8, -W * .7]].forEach(([u, v]) => SHAPE.push([x + u * c - v * s, y + u * s + v * c])); };
    const [sx, sy] = pt(a0, R), [ex, ey] = pt(a1, R);
    if (keep) for (let a = a0; a <= a1; a += 4) SHAPE.push(pt(a, R));
    const stem = document.createElementNS(NS, 'path');
    stem.setAttribute('class', 'stem'); stem.setAttribute('pathLength', '1');
    stem.setAttribute('d', `M${sx} ${sy} A ${R} ${R} 0 0 1 ${ex} ${ey}`);
    g.append(stem);
    for (let k = 0; k < n; k++) {
      const a = a0 + (a1 - a0) * (k + 0.5) / n, tangent = a + 90, size = 1 - k / n * 0.38;
      [[R + 1, -34], [R - 1, 34]].forEach(([r, tilt], side) => {
        const [x, y] = pt(a, r), L = 17 * size, W = 5.4 * size;
        const leaf = document.createElementNS(NS, 'path');
        leaf.setAttribute('class', 'leaf');
        leaf.setAttribute('d', `M0 0 C ${L * .3} ${-W}, ${L * .75} ${-W}, ${L} 0 C ${L * .75} ${W}, ${L * .3} ${W}, 0 0 Z`);
        leaf.style.setProperty('--i', k * 2 + side);
        g.append(place(leaf, x, y, tangent + tilt));
        if (keep) outline(x, y, tangent + tilt, L, W * .75);
      });
    }
    const [tx, ty] = pt(a1, R);
    const tip = document.createElementNS(NS, 'path');
    tip.setAttribute('class', 'leaf');
    tip.setAttribute('d', 'M0 0 C 4 -3.6, 9 -3.6, 12 0 C 9 3.6, 4 3.6, 0 0 Z');
    tip.style.setProperty('--i', n * 2);
    g.append(place(tip, tx, ty, a1 + 90));
    if (keep) outline(tx, ty, a1 + 90, 12, 2.7);
    return g;
  }
  $$('.laurel svg').forEach(svg => {
    const right = branch();
    right.setAttribute('transform', 'translate(280 0) scale(-1 1)');
    svg.append(branch(), right);
  });

  /* Fit: the wreath opens wide enough that no leaf ever touches the words. Each text line is checked against the leaves at
     its own height; a long title widens its wreath, and if a row of laurels would then overflow, the longest title wraps
     onto two balanced lines (then, as a last resort, steps down in size). Height never changes, so nothing below moves. */
  const PAD = 9, MIN_W = 262;
  /* EDGE: empty viewBox units outside each branch's outermost leaf. A row that's short of room (phones) pulls its laurels
     together by these margins, so a wreath can open for a one-line title instead of the title wrapping. */
  const EDGE = SHAPE.length ? Math.max(0, Math.min(...SHAPE.map(p => p[0])) - 3) : 0;
  const halfGap = (top, bot) => { let m = -Infinity; for (const [x, y] of SHAPE) if (y >= top && y <= bot && x > m) m = x; return m === -Infinity ? 140 : 140 - m; };
  function need(laurel) {
    const text = $('.laurel-text', laurel), s = laurel.offsetHeight / 180, tr = text.getBoundingClientRect();
    let extra = -Infinity, by = null;
    [...text.children].forEach(el => {
      const r = document.createRange(); r.selectNodeContents(el);
      [...r.getClientRects()].forEach(b => {
        if (!b.width) return;
        const top = (text.offsetTop + b.top - tr.top) / s - 2, bot = top + b.height / s + 4;
        const e = b.width / s / 2 + PAD - halfGap(top, bot);
        if (e > extra) { extra = e; by = el; }
      });
    });
    laurel._by = by;
    return Math.max(MIN_W, 280 + 2 * Math.max(extra, -70));
  }
  function apply(laurel, W, base) {
    const svg = $('svg', laurel);
    svg.setAttribute('viewBox', `0 0 ${W.toFixed(1)} 180`);
    svg.lastChild.setAttribute('transform', `translate(${W.toFixed(1)} 0) scale(-1 1)`);
    laurel.style.aspectRatio = `${W.toFixed(1)} / 180`;
    laurel.style.width = (base * W / 280).toFixed(1) + 'px';
  }
  function fitRow(row) {
    const ls = $$('.laurel', row).filter(l => l.querySelector('svg') && l.offsetParent);
    if (!ls.length) return;
    row.style.columnGap = '';
    ls.forEach(l => { l.style.width = l.style.aspectRatio = l.style.marginInline = ''; const t = $('.laurel-text', l), em = $('em', t);
      t.style.left = t.style.right = '0'; t.style.bottom = ''; delete t.dataset.lift;
      $$('small', t).forEach(x => { x.style.letterSpacing = x.style.fontSize = ''; });
      /* textWrap is a shorthand that also resets the wrap mode, so it goes first */
      if (em) { Object.assign(em.style, { textWrap: '', maxWidth: '', fontSize: '' }); em.style.whiteSpace = 'nowrap'; delete em.dataset.wrapped; } });
    const base = ls.map(l => l.offsetWidth);
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    /* a row inside a shrink-to-fit box grows with its laurels, so the screen is the real limit */
    let avail = row.classList.contains('laurels') ? Math.min(row.clientWidth, document.documentElement.clientWidth - 32) - 2 : Infinity;
    let Ws = ls.map(need), tight = false;
    const GAP_MIN = 16, GAP_MAX = 40;
    const ink = () => Ws.reduce((t, W, i) => t + base[i] * (tight ? W - 2 * EDGE : W) / 280, 0);
    const total = () => ink() + (tight ? GAP_MIN : gap) * (ls.length - 1);
    /* short of room: measure the wreaths by their leaves, not their boxes (the boxes' empty edges may overhang) */
    if (avail !== Infinity && ls.length > 1 && total() > avail) { tight = true; avail = document.documentElement.clientWidth - 32; }
    /* too wide for the row: ease whichever line is actually tight in the widest wreath. A long title wraps onto two
       balanced lines; small print tightens, then the words lift a little (the wreath is wider higher up); only then
       does that line step down in size, never below a readable floor */
    for (let step = 0; total() > avail && step < 14; step++) {
      const i = Ws.indexOf(Math.max(...Ws)), el = ls[i]._by, t = $('.laurel-text', ls[i]);
      if (!el) break;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (el.tagName === 'EM' && !el.dataset.wrapped && /\s/.test(el.textContent.trim())) {
        const w = el.getBoundingClientRect().width; el.dataset.wrapped = 1;
        el.style.textWrap = 'balance'; el.style.whiteSpace = 'normal'; el.style.maxWidth = Math.ceil(w * .84) + 'px';
      } else if (el.tagName === 'SMALL' && !el.style.letterSpacing) el.style.letterSpacing = '.03em';
      else if (el.tagName === 'SMALL' && (+t.dataset.lift || 0) < 2) {
        t.dataset.lift = (+t.dataset.lift || 0) + 1; t.style.bottom = (parseFloat(getComputedStyle(t).bottom) + ls[i].offsetHeight * .05) + 'px';
      } else if (fs > (el.tagName === 'SMALL' ? 7.2 : 10.5)) el.style.fontSize = (fs * .94).toFixed(2) + 'px';
      else break;
      Ws[i] = need(ls[i]);
    }
    ls.forEach((l, i) => apply(l, Ws[i], base[i]));
    if (tight) {
      const g = Math.max(GAP_MIN, Math.min(GAP_MAX, (avail - ink()) / (ls.length - 1)));
      row.style.columnGap = '0';
      ls.forEach((l, i) => { l.style.marginInline = (g / 2 - EDGE * base[i] / 280).toFixed(1) + 'px'; });
    }
  }
  const rows = () => $$('.laurel').map(l => l.closest('.laurels') || l).filter((r, i, a) => a.indexOf(r) === i);
  const fitAll = () => rows().forEach(fitRow);
  if ($('.laurel')) {
    fitAll();
    document.fonts?.ready.then(fitAll);
    let lastW = innerWidth, t;
    addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; clearTimeout(t); t = setTimeout(fitAll, 120); });
  }

  /* Reel: poster + big play button first; our own controls once it runs. Anything with data-seek plays from there. */
  const player = $('#player');
  if (player) {
    const box = player.closest('.player');
    const seek = $('.hud-seek', box), time = $('.hud-time', box);
    const chapters = $$('[data-chapter]').sort((a, b) => a.dataset.seek - b.dataset.seek);
    const want = t => {
      box.classList.add('started');
      if (t != null) {
        if (player.readyState >= 1) player.currentTime = t;
        else player.addEventListener('loadedmetadata', () => { player.currentTime = t; }, { once: true });
      }
      player.play().catch(() => {});
    };
    $('.reel-start', box)?.addEventListener('click', () => want());
    player.addEventListener('click', () => player.paused ? want() : player.pause());
    player.addEventListener('play', () => box.classList.add('playing', 'started'));
    player.addEventListener('pause', () => box.classList.remove('playing'));
    $('.hud-play', box)?.addEventListener('click', () => player.paused ? want() : player.pause());
    $('.hud-mute', box)?.addEventListener('click', () => { player.muted = !player.muted; box.classList.toggle('muted', player.muted); });
    $('.hud-fs', box)?.addEventListener('click', () => {
      const v = $('.player-video', box) || box;
      if (document.fullscreenElement) document.exitFullscreen();
      else if (v.requestFullscreen) v.requestFullscreen(); else if (player.webkitEnterFullscreen) player.webkitEnterFullscreen();
    });
    seek?.addEventListener('input', () => { if (player.duration) player.currentTime = seek.value / 1000 * player.duration; });
    player.addEventListener('timeupdate', () => {
      const t = player.currentTime, d = player.duration || 277;
      if (seek) seek.value = Math.round(t / d * 1000);
      if (time) time.textContent = `${mmss(t)} / ${mmss(d)}`;
      let on = -1;
      chapters.forEach((c, i) => { if (t >= +c.dataset.seek - .3) on = i; });
      chapters.forEach((c, i) => {
        c.classList.toggle('on', i === on);
        if (i === on) { const end = +(chapters[i + 1]?.dataset.seek ?? c.dataset.end ?? d); c.style.setProperty('--p', Math.min(1, (t - c.dataset.seek) / (end - c.dataset.seek)).toFixed(3)); }
      });
    });
    $$('[data-seek]').forEach(b => b.addEventListener('click', () => {
      if (!b.closest('.player')) box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      want(+b.dataset.seek);
    }));
  }

  /* Lightbox for every [data-gallery] button carrying data-full */
  const lb = $('dialog.lightbox');
  if (lb) {
    const shots = $$('[data-gallery] [data-full]'), img = $('img', lb);
    let at = 0;
    const show = i => { at = (i + shots.length) % shots.length; const s = shots[at]; img.src = s.dataset.full; img.alt = s.querySelector('img')?.alt || ''; };
    shots.forEach((s, i) => s.addEventListener('click', () => { show(i); lb.showModal(); }));
    $('.lb-prev', lb).addEventListener('click', e => { e.stopPropagation(); show(at - 1); });
    $('.lb-next', lb).addEventListener('click', e => { e.stopPropagation(); show(at + 1); });
    $('.lb-close', lb).addEventListener('click', () => lb.close());
    lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(at - 1); if (e.key === 'ArrowRight') show(at + 1); });
  }

  /* In view: .in on [data-in] once; numbers in [data-count] count up from 0 when they arrive */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target; el.classList.add('in'); io.unobserve(el);
    $$('[data-count]', el).forEach(n => {
      const end = +n.dataset.count;
      if (reduce) { n.textContent = end; return; }
      const t0 = performance.now(), dur = 1400;
      const step = now => { const k = Math.min(1, (now - t0) / dur); n.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('[data-in]').forEach(el => io.observe(el));

  /* Touch screens can't hover: photos marked .develop come to colour while they sit in the middle of the screen */
  if (matchMedia('(hover: none)').matches) {
    const mid = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('lit', e.isIntersecting)), { rootMargin: '-35% 0px -35% 0px' });
    $$('.develop').forEach(el => mid.observe(el));
  }

  /* Overscroll past a dark footer must be the footer colour, not a pale strip */
  const end = () => root.classList.toggle('at-end', scrollY > (document.body.scrollHeight - innerHeight) / 2);
  addEventListener('scroll', end, { passive: true }); end();
})();
