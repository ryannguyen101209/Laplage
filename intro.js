/* LA PLAGE · welcome wave
   The page opens under water. The wave washes back toward the sea (down on
   landscape screens, left on phones, matching the hero photo), leaving a thin
   film and wet sand that dries. Canvas 2D, no libraries. Any click, key or
   scroll speeds it up. */
(() => {
  'use strict';

  const root = document.documentElement;
  const el = document.querySelector('[data-intro]');
  let resolveUncovered;
  // Resolves once the hero text area is uncovered, so main.js can start the hero reveals
  window.laPlageIntro = new Promise((r) => { resolveUncovered = r; });
  if (!el) { resolveUncovered(); return; }

  const canvas = el.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const brand = el.querySelector('[data-intro-brand]');
  if (!ctx) { finish(); return; }

  root.classList.add('intro-on');

  /* ---------- Textures: caustic light and foam lace, drawn once from SVG noise ---------- */
  const svgImage = (svg) => new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = 'data:image/svg+xml,' + encodeURIComponent(svg);
  });
  const causticSVG = `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'><filter id='c' x='0' y='0' width='100%' height='100%'><feTurbulence type='turbulence' baseFrequency='.008 .013' numOctaves='3' seed='4' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -3.4 0 0 0 .9'/></filter><rect width='100%' height='100%' filter='url(#c)'/></svg>`;
  const laceSVG = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='l' x='0' y='0' width='100%' height='100%'><feTurbulence type='turbulence' baseFrequency='.05' numOctaves='3' seed='11' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -5 0 0 0 1.3'/></filter><rect width='100%' height='100%' filter='url(#l)'/></svg>`;

  /* ---------- Geometry: logical u = along the shore, v = toward the sea ---------- */
  let W = 0, H = 0, L = 0, D = 0, scale = 1, seaward = 'down';
  const resize = () => {
    W = window.innerWidth; H = window.innerHeight;
    seaward = 'down';   // the hero's sea sits along the bottom on every screen
    L = seaward === 'down' ? W : H;
    D = seaward === 'down' ? H : W;
    scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.8;   // a little under native: water is soft, frames stay cheap
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
  };
  const setFrame = () => {
    // Map logical (u, v) to the screen so water always drains toward the sea side of the photo
    if (seaward === 'down') ctx.setTransform(scale, 0, 0, scale, 0, 0);
    else ctx.setTransform(0, scale, -scale, 0, W * scale, 0);
  };

  /* ---------- Shape of the shoreline ---------- */
  const rnd = (a, b) => a + Math.random() * (b - a);
  const waves = [
    { k: rnd(.0045, .006), w: .0009, a: .032, p: rnd(0, 6.28) },
    { k: rnd(.011, .014), w: -.0016, a: .016, p: rnd(0, 6.28) },
    { k: rnd(.026, .032), w: .0026, a: .007, p: rnd(0, 6.28) },
    { k: rnd(.06, .07), w: -.004, a: .0025, p: rnd(0, 6.28) },
  ];
  const ripple = (u, t, amp = 1) => waves.reduce((s, q) => s + Math.sin(u * q.k + t * q.w + q.p) * q.a * D * amp, 0);
  const foamWidth = (u, t) => 16 + 30 * (.5 + .5 * Math.sin(u * .009 + t * .0012 + 1.3)) + 10 * (.5 + .5 * Math.sin(u * .031 - t * .002));

  const STEP = 12;
  const edgePoints = (base, t, amp, offset = 0) => {
    const pts = [];
    for (let u = -STEP; u <= L + STEP; u += STEP) pts.push([u, base + ripple(u, t, amp) + offset]);
    return pts;
  };
  const traceBand = (top, bottom) => {
    ctx.beginPath();
    ctx.moveTo(top[0][0], top[0][1]);
    for (let i = 1; i < top.length; i++) ctx.lineTo(top[i][0], top[i][1]);
    for (let i = bottom.length - 1; i >= 0; i--) ctx.lineTo(bottom[i][0], bottom[i][1]);
    ctx.closePath();
  };
  const traceLine = (pts) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
  };

  /* ---------- Timeline ---------- */
  const HOLD = 700;       // under water, wordmark visible
  const RECEDE = 2700;    // the wash back
  const FADE = 250;
  const ease = (p) => -(Math.cos(Math.PI * p) - 1) / 2;   // sine in-out: no sudden starts or stops
  // Recede with one small surge back in, the way real backwash hesitates
  const travel = (p) => {
    const surge = Math.sin(Math.PI * Math.min(1, Math.max(0, (p - .34) / .3))) * .03;
    return ease(p) - surge;
  };
  const baseAt = (p) => -0.2 * D + travel(Math.min(1, Math.max(0, p))) * 1.42 * D;

  let caustic = null, lace = null, speed = 1, target = 1, clock = 0, last = 0, uncovered = false, done = false;

  const draw = (t) => {
    const p = Math.max(0, (t - HOLD) / RECEDE);
    const base = baseAt(p);
    const filmBase = baseAt(p - .07) - 6;        // thin film drains a moment behind the edge

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFrame();

    const edge = edgePoints(base, t, 1);
    const film = edgePoints(filmBase, t * .8, .8);
    const top = edgePoints(-D, t, 0);
    const bottom = edgePoints(D * 2.4, t, 0);

    // Wet sand behind the water, drying as it gets further from the sea
    if (p > 0) {
      const g = ctx.createLinearGradient(0, filmBase, 0, filmBase - D * .55);
      g.addColorStop(0, 'rgba(78, 53, 25, .2)');
      g.addColorStop(1, 'rgba(78, 53, 25, 0)');
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, p - .7) / .3);
      traceBand(top, film);
      ctx.fillStyle = g; ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Swash film: thin, glassy water between the film line and the edge
    traceBand(film, edge);
    ctx.fillStyle = 'rgba(176, 232, 226, .32)';
    ctx.fill();
    ctx.save();
    traceLine(film);
    ctx.strokeStyle = 'rgba(255, 255, 255, .45)'; ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // Water body, shallow turquoise at the edge to deep teal offshore
    const body = ctx.createLinearGradient(0, base, 0, base + D * .75);
    body.addColorStop(0, '#C4F1EA');
    body.addColorStop(.05, '#6FD6CF');
    body.addColorStop(.22, '#33B6B9');
    body.addColorStop(.55, '#1A97A6');
    body.addColorStop(1, '#0F7891');
    traceBand(edge, bottom);
    ctx.fillStyle = body; ctx.fill();

    ctx.save();
    traceBand(edge, bottom);
    ctx.clip();
    // Caustic light drifting through the water
    if (caustic) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = caustic;
      [[1.6, .55, .016, .009], [2.7, .4, -.011, .014]].forEach(([s, a, vx, vy]) => {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate((t * vx) % (512 * s), base + (t * vy) % (512 * s));
        ctx.scale(s, s);
        ctx.fillRect(-1024, -1024, (L + 2048) / s, (D * 3 + 2048) / s);
        ctx.restore();
      });
      ctx.globalCompositeOperation = 'source-over';
    }
    // Breaking lines further out
    [[.18, .6, 26], [.34, .4, 18], [.55, .24, 12]].forEach(([off, alpha, width], i) => {
      const tt = t * (1.1 + i * .2), amp = .6 + i * .2;
      const a = edgePoints(base + D * off, tt, amp);
      const b = a.map(([u, v]) => [u, v + width * (.35 + .65 * (.5 + .5 * Math.sin(u * .008 + i * 2 + t * .0009)))]);
      traceBand(a, b);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * .22})`; ctx.fill();
      if (lace) {
        ctx.save(); traceBand(a, b); ctx.clip();
        ctx.globalAlpha = alpha * .9; ctx.fillStyle = lace;
        ctx.translate((t * .006 * (i + 1)) % 240, 0);
        ctx.fillRect(-260, base + D * off - 60, L + 520, width + 120);
        ctx.restore();
      }
    });
    ctx.restore();

    // Foam crest along the edge: creamy band, lace, and a bright leading line
    const crestBack = edge.map(([u, v]) => [u, v + foamWidth(u, t)]);
    const crest = ctx.createLinearGradient(0, base - 10, 0, base + 46);
    crest.addColorStop(0, 'rgba(255, 255, 255, .95)');
    crest.addColorStop(.45, 'rgba(255, 255, 255, .6)');
    crest.addColorStop(1, 'rgba(255, 255, 255, 0)');
    traceBand(edge.map(([u, v]) => [u, v - 3]), crestBack);
    ctx.fillStyle = crest; ctx.fill();
    if (lace) {
      ctx.save();
      traceBand(edge, edge.map(([u, v]) => [u, v + foamWidth(u, t) * 2.2]));
      ctx.clip();
      ctx.translate(-(t * .01) % 240, base);
      ctx.fillStyle = lace; ctx.globalAlpha = .9;
      ctx.fillRect(-240, -60, L + 480, 260);
      ctx.restore();
    }
    ctx.save();
    traceLine(edge);
    ctx.shadowColor = 'rgba(255, 255, 255, .9)'; ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(255, 255, 255, .95)'; ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Wordmark fades as the water starts to move
    if (brand) {
      const k = Math.min(1, p / .35);
      brand.style.opacity = String(1 - k * k * (3 - 2 * k));
      brand.style.transform = `translate(-50%, calc(-50% - ${(k * 18).toFixed(1)}px))`;
    }
    // the whole overlay melts away over the last stretch, so there is no separate fade step
    canvas.style.opacity = String(p < .78 ? 1 : Math.max(0, 1 - (p - .78) / .22));

    // Hero text area uncovered: let the page start its own entrance
    if (!uncovered && p > .32) { uncovered = true; resolveUncovered(); }
    return p;
  };

  const frame = (now) => {
    if (done) return;
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    speed += (target - speed) * Math.min(1, dt / 220);
    clock += dt * speed;
    const p = draw(clock);
    if (p >= 1) {
      el.classList.add('is-leaving');
      setTimeout(finish, FADE);
      done = true;
      return;
    }
    requestAnimationFrame(frame);
  };

  function onResize() { resize(); }

  function finish() {
    done = true;
    root.classList.remove('intro-on');
    if (el) el.remove();
    resolveUncovered();
    window.removeEventListener('resize', onResize);
  }

  // Impatient visitors: any input speeds the wave up
  const hurry = () => { target = 2.6; };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((type) => window.addEventListener(type, hurry, { once: true, passive: true }));

  window.addEventListener('resize', onResize);

  resize();
  Promise.all([svgImage(causticSVG), svgImage(laceSVG)]).then(([c, l]) => {
    if (c) caustic = ctx.createPattern(c, 'repeat');
    if (l) lace = ctx.createPattern(l, 'repeat');
    el.classList.add('is-drawing');
    requestAnimationFrame(frame);
  });

  // Never trap the page: if frames are not running (background tab), finish anyway
  setTimeout(() => { if (!done) { el.classList.add('is-leaving'); setTimeout(finish, FADE); done = true; } }, 9000);
})();
