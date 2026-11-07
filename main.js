/* LA PLAGE — home interactions. No dependencies. */
(() => {
  'use strict';

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const formatVND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

  /* ---------------- Sticky nav: follows the announcement bar, turns to glass on scroll ---------------- */
  const nav = document.querySelector('[data-nav]');
  const bar = document.querySelector('.announce');
  let navTicking = false;
  const updateNav = () => {
    navTicking = false;
    const y = window.scrollY;
    const barH = bar ? bar.offsetHeight : 0;
    nav.style.setProperty('--nav-y', `${Math.max(0, barH - y)}px`);
    nav.classList.toggle('is-glass', y > barH + 12);
  };
  const queueNav = () => { if (!navTicking) { navTicking = true; requestAnimationFrame(updateNav); } };

  /* ---------------- Scroll spy: highlight the section in view ---------------- */
  const initScrollSpy = () => {
    const links = [...document.querySelectorAll('[data-spy]')];
    if (!links.length || !('IntersectionObserver' in window)) return;
    const byId = new Map(links.map((a) => [a.dataset.spy, a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        const link = byId.get(entry.target.id);
        if (link) link.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('#top, #drop, #collections, #story, #lookbook, #access').forEach((sec) => io.observe(sec));
  };

  /* ---------------- Scroll animation system ----------------
     data-animate="fade-up | fade | words | clip | line"  (+ data-delay="ms")
     data-stagger="fade-up" on a parent reveals its children in sequence (+ data-stagger-step="ms")
     Everything reveals once, when it enters the viewport. */
  const splitWords = (el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const inner = document.createElement('span');
            inner.className = 'w__i';
            inner.style.setProperty('--wi', i++);
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === Node.ELEMENT_NODE && n.tagName !== 'BR') {
          walk(n);
        }
      });
    };
    walk(el);
  };

  // A "clip" element starts fully clipped away, which browsers count as not on screen,
  // so it is watched through its parent and revealed when that comes into view.
  const proxies = new Map();
  const animIO = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      if (entry.target.dataset.animate || entry.target.hasAttribute('data-stagger')) reveal(entry.target);
      (proxies.get(entry.target) || []).forEach(reveal);
      animIO.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }) : null;

  // Hero elements wait until the welcome wave has uncovered them
  let introDone = !window.laPlageIntro;
  if (window.laPlageIntro) window.laPlageIntro.then(() => { introDone = true; });
  const reveal = (el) => {
    if (!introDone && el.closest('.hero')) { window.laPlageIntro.then(() => reveal(el)); return; }
    el.classList.add('is-visible');
    if (el.hasAttribute('data-stagger')) {
      el.querySelectorAll(':scope > [data-animate]').forEach((child) => child.classList.add('is-visible'));
    }
  };

  const prepare = (el) => {
    if (el.dataset.animPrepared) return;
    el.dataset.animPrepared = '1';
    if (el.dataset.delay) el.style.setProperty('--delay', `${parseInt(el.dataset.delay, 10)}ms`);
    if (el.dataset.animate === 'words') splitWords(el);
  };

  const initAnimations = (root = document) => {
    // Stagger groups: children inherit the animation with increasing delays
    root.querySelectorAll('[data-stagger]').forEach((group) => {
      const type = group.dataset.stagger || 'fade-up';
      const step = parseInt(group.dataset.staggerStep || '80', 10);
      [...group.children].forEach((child, i) => {
        if (!child.dataset.animate) child.dataset.animate = type;
        child.style.setProperty('--delay', `${i * step}ms`);
        child.dataset.animPrepared = '1';
      });
      if (animIO) animIO.observe(group); else reveal(group);
    });
    root.querySelectorAll('[data-animate]').forEach((el) => {
      if (el.parentElement && el.parentElement.hasAttribute('data-stagger')) return; // driven by the group
      prepare(el);
      if (!animIO) { reveal(el); return; }
      const watch = el.dataset.animate === 'clip' && el.parentElement ? el.parentElement : el;
      if (watch !== el) proxies.set(watch, [...(proxies.get(watch) || []), el]);
      animIO.observe(watch);
    });
  };

  /* ---------------- Products: render from JSON ---------------- */
  const track = document.querySelector('[data-strip-track]');

  // a piece made in more than one colour lists them in "colors"; this gives the piece as seen in one of them
  const inColor = (p, k) => {
    const c = p.colors && p.colors[k];
    return c ? { ...p, color: { name: c.name, hex: c.hex }, image: c.image || p.image, cutout: c.cutout || p.cutout } : p;
  };
  const colorLabel = (p) => (p.colors && p.colors.length > 1
    ? `<span class="card__dots" aria-hidden="true">${p.colors.map((c) => `<i style="background:${c.hex}"></i>`).join('')}</span>${p.colors.length} colours`
    : p.color.name);

  const productCard = (p, i) => {
    const li = document.createElement('li');
    li.className = 'strip__item';
    li.dataset.collection = p.collection || '';
    li.dataset.category = p.category || '';
    li.dataset.catLabel = (categories.find((c) => c.key === p.category) || {}).name || '';
    li.dataset.animate = 'fade-up';   // each piece in the gallery rises in as it reaches the screen
    li.innerHTML = `
      <a class="card" data-motion href="#product/${p.handle}" data-index="${i}" aria-label="${p.title}, ${p.colors && p.colors.length > 1 ? p.colors.map((c) => c.name).join(' or ') : p.color.name}, ${formatVND.format(p.price)}. View details">
        <div class="card__media" data-motion>
          <div class="card__shadow" data-motion aria-hidden="true"></div>
          <div class="card__lift" data-motion>
            <img src="${p.cutout || p.image.src}" alt="${p.image.alt}" width="${p.image.width}" height="${p.image.height}" loading="lazy" decoding="async" draggable="false">
          </div>
        </div>
        <div class="card__meta" aria-hidden="true">
          <h3 class="card__name">${p.title}</h3>
          <p class="card__price">${formatVND.format(p.price)}</p>
          <p class="card__color">${colorLabel(p)}</p>
        </div>
        ${p.description ? `<p class="card__detail" aria-hidden="true"><span>Detail</span>${p.description}</p>` : ''}
        <div class="card__quick" data-motion aria-hidden="true">
          <span class="card__sizes">${(p.sizes || []).map((s) => `<span>${s}</span>`).join('')}</span>
          <span class="card__view">View</span>
        </div>
      </a>
      ${p.cutoutBack ? `<div class="card__sides" role="group" aria-label="Side of the ${p.title}">
        <button type="button" class="card__side" aria-pressed="true" data-side="${p.cutout}">Front</button>
        <button type="button" class="card__side" aria-pressed="false" data-side="${p.cutoutBack}">Back</button>
      </div>` : ''}`;
    // pieces printed on both sides can be turned around right on the card
    li.querySelectorAll('.card__side').forEach((b) => b.addEventListener('click', () => {
      const img = li.querySelector('.card__lift img');
      li.querySelectorAll('.card__side').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      img.classList.add('is-turning');
      setTimeout(() => { img.src = b.dataset.side; img.classList.remove('is-turning'); }, 180);
    }));
    return li;
  };

  let categories = [];
  // one row per line (Shoreline, Soleil, Marée), each on its own stretch of sand
  const renderRows = (products) => {
    const lines = categories.length ? categories : [{ key: '', name: 'Drop 001', kind: '', note: '' }];
    let n = 0;   // lines with nothing on show are left out, and the rest are numbered in order
    lines.forEach((c) => {
      const items = products.map((p, i) => [p, i]).filter(([p]) => !c.key || p.category === c.key);
      if (!items.length) return;
      n += 1;
      const row = document.createElement('section');
      row.className = 'row float-card'; row.dataset.line = c.key; row.dataset.animate = 'fade-up'; row.dataset.motion = '';
      row.setAttribute('aria-label', `${c.name}, ${c.kind}`);
      row.innerHTML = `
        <header class="row__head">
          <p class="row__index">0${n}</p>
          <h3 class="row__name">${c.name}</h3>
          <p class="row__kind">${c.kind}</p>
          <p class="row__note">${c.note}</p>
          <p class="row__where">Sand &amp; sea · ${String(items.length).padStart(2, '0')} pieces</p>
        </header>
        <ul class="row__items"></ul>`;
      const ul = row.querySelector('.row__items');
      items.forEach(([p, i], k) => {
        const li = productCard(p, i);
        li.style.setProperty('--k', k);
        li.style.setProperty('--r', `${[-4, 3, -2, 5][k % 4]}deg`);   // each piece lies at its own slight angle, like on the sand
        ul.appendChild(li);
      });
      track.appendChild(row);
    });
  };

  const loadProducts = async () => {
    try {
      const res = await fetch('data/products.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      categories = data.categories || [];
      // pieces marked "hidden" in products.json are resting between drops: kept in the data, not shown in the shop
      const live = (data.products || []).filter((p) => !p.hidden);
      renderRows(live);
      return live;
    } catch (err) {
      track.innerHTML = '<p class="eyebrow">The collection could not be loaded. Serve the site over http to read data/products.json.</p>';
      console.error('[LA PLAGE] products', err);
      return [];
    }
  };

  /* ---------------- Product pop: the hovered garment lifts and tilts toward the cursor ---------------- */
  const initCardPop = () => {
    const strip = document.querySelector('[data-strip]');
    const cursorLabel = document.querySelector('[data-drag-cursor] span');
    track.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const card = e.target.closest('.card');
      if (cursorLabel) cursorLabel.textContent = card && !strip.classList.contains('is-dragging') ? 'View' : 'Drag';
      if (!card) return;
      const r = card.querySelector('.card__media').getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      const lift = card.querySelector('.card__lift');
      lift.style.setProperty('--ry', `${(x * 14).toFixed(2)}deg`);
      lift.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`);
    });
    track.addEventListener('pointerout', (e) => {
      const card = e.target.closest('.card');
      if (card && !card.contains(e.relatedTarget)) {
        const lift = card.querySelector('.card__lift');
        lift.style.removeProperty('--rx'); lift.style.removeProperty('--ry');
      }
    });
  };

  /* ---------------- Spotlight: one product, floating, with details and sizes ---------------- */
  const initSpotlight = (products) => {
    const spot = document.querySelector('[data-spotlight]');
    if (!spot || !products.length) return;
    const $ = (sel) => spot.querySelector(sel);
    const stage = $('[data-spot-stage]');
    const img = $('[data-spot-img]');
    const views = $('[data-spot-views]');
    const sizes = $('[data-spot-sizes]');
    const tones = $('[data-spot-colors]');
    const guide = $('[data-spot-guide]');
    // the piece in 3D (piece3d.js): drag to turn it; the flat photo stays underneath as a fallback
    let piece = null;
    try { piece = window.LaPlage3D ? window.LaPlage3D.mount($('.spotlight__float')) : null; } catch (err) { piece = null; }
    if (piece) spot.classList.add('has-3d');
    let pieceId = '';
    const guideBtn = $('[data-spot-guide-btn]');
    let index = 0, tone = 0, view = 'front', opener = null, closeTimer = 0, guideOpen = false;

    // the colour guide (data/colour-guide.json): each print's pattern, colours and patch, shown over the stage
    let prints = [];
    fetch('data/colour-guide.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {})).then((g) => { prints = g.prints || []; if (!spot.hidden) render(0); }).catch(() => {});
    const printFor = (p) => prints.find((g) => g.product === p.id && (!g.color || g.color === p.color.name));
    const chips = (list) => list.map((c) => `<li><i style="background:${c.hex}" aria-hidden="true"></i><b>${c.role}</b><span>${c.hex}${c.share ? ` · ${c.share}%` : ''}</span></li>`).join('');
    const drawGuide = (g) => {
      guide.innerHTML = `
        <div class="sg__pattern" style="background-image:url('${g.pattern}')" role="img" aria-label="The ${g.name} pattern"></div>
        <div class="sg__info">
          <p class="label">${g.name} · ${g.kind}</p>
          <p class="sg__h">Pattern colours</p>
          <div class="sg__bar" aria-hidden="true">${g.patternColours.map((c) => `<span style="background:${c.hex};flex-grow:${c.share}"></span>`).join('')}</div>
          <ul class="sg__chips">${chips(g.patternColours)}</ul>
          <div class="sg__patch">
            <img src="${g.patch}" alt="The embroidered LA PLAGE patch in the ${g.name} colours" width="600" height="376" loading="lazy">
            <div><p class="sg__h">Patch colours</p><ul class="sg__chips">${chips(g.patchColours)}</ul></div>
          </div>
          <a class="link link--underlined sg__more" href="colour-guide.html#${g.key}">The full colour guide</a>
        </div>`;
    };
    const showGuide = (on) => {
      guideOpen = on;
      guide.hidden = !on;
      spot.classList.toggle('is-guide', on);
      guideBtn.setAttribute('aria-pressed', String(on));
      guideBtn.textContent = on ? 'Back to the piece' : 'Pattern & colours';
    };

    const render = (dir = 0) => {
      const base = products[index];
      const p = inColor(base, tone);
      $('[data-spot-index]').textContent = `${String(index + 1).padStart(2, '0')} / ${String(products.length).padStart(2, '0')}`;
      $('[data-spot-title]').textContent = p.title;
      $('[data-spot-desc]').textContent = p.description || '';
      $('[data-spot-color]').textContent = p.color.name;
      $('[data-spot-price]').textContent = formatVND.format(p.price);
      // the cut-out version floats on the frosted glass (the photos have a white backdrop)
      const back = view === 'back' && p.imageHover;
      const src = { src: back ? (p.cutoutBack || p.imageHover.src) : (p.cutout || p.image.src) };
      // never show the previous piece while the next one loads: hide the image until the new one is ready
      if (img.getAttribute('src') !== src.src) {
        img.classList.add('is-loading');
        const want = src.src;
        img.onload = () => { if (img.getAttribute('src') === want) img.classList.remove('is-loading'); };
        img.src = want;
        if (img.complete && img.naturalWidth) img.classList.remove('is-loading');
      }
      img.alt = view === 'back' && p.imageHover ? p.imageHover.alt : p.image.alt;
      if (piece) {
        if (pieceId !== base.id) { pieceId = base.id; piece.reset(); }
        // the 3D piece tilts but does not spin, so "Back" shows the back photo
        piece.show(back ? (p.cutoutBack || p.imageHover.src) : (p.cutout || p.image.src));
      }
      // keep the chosen size when only the colour changes
      const was = sizes.dataset.for === base.id && sizes.querySelector('.size[aria-checked="true"]');
      const keep = was ? was.dataset.size : (p.sizes || [])[1];
      sizes.dataset.for = base.id;
      sizes.innerHTML = (p.sizes || []).map((s) => `<button type="button" class="size" role="radio" aria-checked="${s === keep}" data-size="${s}">${s}</button>`).join('');
      // pieces made in more than one colour get a colour choice
      const many = base.colors && base.colors.length > 1;
      tones.hidden = !many;
      // pieces in the colour guide get a "Pattern & colours" view; it stays open while the colour changes
      const g = printFor(p);
      guideBtn.hidden = !g;
      if (g) drawGuide(g);
      showGuide(!!g && guideOpen);
      tones.querySelector('[data-spot-swatches]').innerHTML = many
        ? base.colors.map((c, k) => `<button type="button" class="swatch" role="radio" aria-checked="${k === tone}" data-tone="${k}"><i style="background:${c.hex}" aria-hidden="true"></i>${c.name}</button>`).join('')
        : '';
      views.innerHTML = p.imageHover
        ? ['front', 'back'].map((v) => `<button type="button" class="view-btn" aria-pressed="${v === view}" data-view="${v}">${v === 'front' ? 'Front' : 'Back'}</button>`).join('')
        : '';
      // pop the garment in again, entering from the direction of travel
      spot.style.setProperty('--enter-x', `${dir * 60}px`);
      spot.classList.remove('is-switching');
      void stage.offsetWidth;
      spot.classList.add('is-switching');
    };

    // warm the cache so every piece opens instantly
    products.forEach((p) => { [p.cutout, p.cutoutBack, ...(p.colors || []).map((c) => c.cutout)].forEach((u) => { if (u) { const pre = new Image(); pre.decoding = 'async'; pre.src = u; } }); });

    const open = (i, from, t = 0) => {
      clearTimeout(closeTimer);
      index = i; tone = t; view = 'front'; sizes.dataset.for = ''; guideOpen = false; opener = from || null;
      spot.hidden = false;
      document.documentElement.classList.add('spot-on');
      if (piece) piece.start();
      render(0);
      requestAnimationFrame(() => spot.classList.add('is-open'));
      $('[data-spot-close]').focus({ preventScroll: true });
    };
    const close = () => {
      spot.classList.remove('is-open');
      document.documentElement.classList.remove('spot-on');
      closeTimer = setTimeout(() => { spot.hidden = true; if (piece) piece.stop(); }, 450);
      if (opener) opener.focus({ preventScroll: true });
    };
    const go = (d) => { index = (index + d + products.length) % products.length; tone = 0; view = 'front'; sizes.dataset.for = ''; guideOpen = false; render(d); };

    // The strip captures the pointer while dragging, so the click lands on the viewport:
    // remember which card the press started on.
    const viewport = document.querySelector('[data-strip-viewport]');
    let downCard = null;
    viewport.addEventListener('pointerdown', (e) => { downCard = e.target.closest('.card'); }, true);
    viewport.addEventListener('click', (e) => {
      const card = e.target.closest('.card') || downCard;
      downCard = null;
      if (!card) return;
      e.preventDefault();
      open(parseInt(card.dataset.index, 10) || 0, card);
    });
    $('[data-spot-close]').addEventListener('click', close);

    // a piece tapped anywhere on the page (collections, featured row) opens straight away
    document.addEventListener('laplage:view', (e) => {
      const { index: i, from } = e.detail;
      if (Number.isNaN(i)) return;
      open(i, from);
    });
    $('[data-spot-prev]').addEventListener('click', () => go(-1));
    $('[data-spot-next]').addEventListener('click', () => go(1));
    // "Pre-order": opens the pre-order form with this piece and size (portal/site.js); until accounts
    // are set up it keeps its old behaviour and leads to Private access
    $('[data-spot-access]').addEventListener('click', (e) => {
      if (typeof window.laPlagePreorder === 'function') {
        e.preventDefault();
        const chosen = sizes.querySelector('.size[aria-checked="true"]');
        const p = products[index];
        close();
        window.laPlagePreorder(p, chosen ? chosen.dataset.size : null, inColor(p, tone).color.name);
        return;
      }
      close();
    });
    sizes.addEventListener('click', (e) => {
      const b = e.target.closest('.size'); if (!b) return;
      sizes.querySelectorAll('.size').forEach((o) => o.setAttribute('aria-checked', String(o === b)));
    });
    guideBtn.addEventListener('click', () => {
      showGuide(!guideOpen);
      if (guideOpen && spot.scrollTop > 0) spot.scrollTo({ top: 0, behavior: 'smooth' });   // phones: the panel sits above the buttons
    });
    // links such as colour-guide.html's "Pre-order" arrive as #product/<handle>/<colour>
    const fromHash = () => {
      const m = /^#product\/([\w-]+)(?:\/([\w-]+))?/.exec(location.hash);
      if (!m) return;
      const i = products.findIndex((p) => p.handle === m[1]);
      if (i < 0) return;
      const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const t = Math.max(0, (products[i].colors || []).findIndex((c) => slug(c.name) === m[2]));
      open(i, null, t);
    };
    fromHash();
    tones.addEventListener('click', (e) => {
      const b = e.target.closest('.swatch'); if (!b) return;
      const k = Number(b.dataset.tone);
      if (k === tone) return;
      tone = k; render(0);
    });
    views.addEventListener('click', (e) => {
      const b = e.target.closest('.view-btn'); if (!b) return;
      view = b.dataset.view; render(0);
    });
    spot.addEventListener('click', (e) => { if (e.target === spot) close(); });
    spot.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowRight') { go(1); return; }
      if (e.key === 'ArrowLeft') { go(-1); return; }
      if (e.key !== 'Tab') return;
      const f = [...spot.querySelectorAll('button, a[href]')].filter((el) => el.offsetParent !== null);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    // The garment leans toward the cursor
    stage.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || piece) return;   // the 3D piece leans toward the cursor by itself
      const r = stage.getBoundingClientRect();
      stage.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - .5) * 16).toFixed(2)}deg`);
      stage.style.setProperty('--rx', `${(-((e.clientY - r.top) / r.height - .5) * 10).toFixed(2)}deg`);
    });
    stage.addEventListener('pointerleave', () => { stage.style.removeProperty('--rx'); stage.style.removeProperty('--ry'); });
    // Swipe between products on touch
    let sx = null;
    stage.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    });
  };

  /* ---------------- Strip: drag with inertia (fine pointers) / native swipe (touch) ---------------- */
  const initStrip = () => {
    const strip = document.querySelector('[data-strip]');
    if (strip.dataset.layout === 'gallery') return;   // the vertical gallery scrolls with the page
    const viewport = strip.querySelector('[data-strip-viewport]');
    const progress = strip.querySelector('[data-strip-progress]');
    const prevBtn = document.querySelector('[data-strip-prev]');
    const nextBtn = document.querySelector('[data-strip-next]');
    const cursor = document.querySelector('[data-drag-cursor]');

    const state = { x: 0, v: 0, min: 0, dragging: false, moved: 0, lastX: 0, lastT: 0, raf: 0, target: null };
    let mode = null; // 'drag' | 'native'

    const step = () => {
      const item = track.querySelector('.strip__item');
      if (!item) return 300;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return item.offsetWidth + gap;
    };

    const measure = () => {
      state.min = Math.min(0, viewport.clientWidth - track.scrollWidth);
      state.x = clamp(state.x, state.min, 0);
    };

    const updateUI = (ratio) => {
      progress.style.transform = `translate3d(${ratio * (progress.parentElement.clientWidth - progress.offsetWidth - parseFloat(getComputedStyle(progress.parentElement).paddingLeft) * 2)}px,0,0)`;
      prevBtn.disabled = ratio <= 0.001;
      nextBtn.disabled = ratio >= 0.999;
    };

    const render = () => {
      const skew = reduceMotion.matches ? 0 : clamp(-state.v * 1.4, -3, 3);
      track.style.transform = `translate3d(${state.x}px,0,0) skewX(${skew}deg)`;
      updateUI(state.min ? state.x / state.min : 0);
    };

    // Rubber band past the edges while dragging
    const rubber = (x) => {
      if (x > 0) return x * 0.35;
      if (x < state.min) return state.min + (x - state.min) * 0.35;
      return x;
    };

    const tick = () => {
      if (state.dragging) { state.raf = 0; return; }
      if (state.target !== null) {
        // eased glide to a target (buttons, keyboard focus)
        const d = state.target - state.x;
        state.v = d * 0.08 / 16;
        state.x += d * 0.08;
        if (Math.abs(d) < 0.5) { state.x = state.target; state.target = null; state.v = 0; }
      } else {
        state.x += state.v * 16;
        state.v *= 0.94; // friction
        // spring back inside bounds
        if (state.x > 0) { state.x += (0 - state.x) * 0.16; state.v *= 0.6; }
        if (state.x < state.min) { state.x += (state.min - state.x) * 0.16; state.v *= 0.6; }
        if (Math.abs(state.v) < 0.005 && state.x <= 0.5 && state.x >= state.min - 0.5) {
          state.v = 0; state.x = clamp(state.x, state.min, 0);
          render(); state.raf = 0; return;
        }
      }
      render();
      state.raf = requestAnimationFrame(tick);
    };
    const run = () => { if (!state.raf) state.raf = requestAnimationFrame(tick); };

    const glideTo = (x) => {
      measure();
      state.target = clamp(x, state.min, 0);
      if (reduceMotion.matches) { state.x = state.target; state.target = null; render(); return; }
      run();
    };

    /* pointer drag */
    const onDown = (e) => {
      if (mode !== 'drag' || e.button !== 0) return;
      measure();
      state.dragging = true; state.moved = 0; state.target = null; state.v = 0;
      state.lastX = e.clientX; state.lastT = performance.now();
      viewport.setPointerCapture(e.pointerId);
      cursor.classList.add('is-pressed');
    };
    const onMove = (e) => {
      if (mode === 'drag') moveCursor(e);
      if (!state.dragging) return;
      const now = performance.now();
      const dx = e.clientX - state.lastX;
      const dt = Math.max(1, now - state.lastT);
      state.moved += Math.abs(dx);
      if (state.moved > 6) strip.classList.add('is-dragging');
      state.x = rubber(state.x + (state.x > 0 || state.x < state.min ? dx * 0.5 : dx));
      state.v = state.v * 0.6 + (dx / dt) * 0.4; // smoothed px/ms
      state.lastX = e.clientX; state.lastT = now;
      render();
    };
    const onUp = (e) => {
      if (!state.dragging) return;
      state.dragging = false;
      cursor.classList.remove('is-pressed');
      if (viewport.hasPointerCapture(e.pointerId)) viewport.releasePointerCapture(e.pointerId);
      if (performance.now() - state.lastT > 80) state.v = 0; // paused before release
      if (reduceMotion.matches) { state.v = 0; state.x = clamp(state.x, state.min, 0); render(); }
      requestAnimationFrame(() => strip.classList.remove('is-dragging'));
      run();
    };
    // swallow the click that ends a drag
    viewport.addEventListener('click', (e) => { if (state.moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);

    /* custom cursor */
    let cx = -200, cy = -200, tx = -200, ty = -200, cursorRaf = 0;
    const cursorLoop = () => {
      cx += (tx - cx) * (reduceMotion.matches ? 1 : 0.22);
      cy += (ty - cy) * (reduceMotion.matches ? 1 : 0.22);
      cursor.style.transform = `translate3d(${cx}px,${cy}px,0) scale(${state.dragging ? 0.82 : 1})`;
      cursorRaf = (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.3) ? requestAnimationFrame(cursorLoop) : 0;
    };
    const moveCursor = (e) => {
      tx = e.clientX; ty = e.clientY;
      if (cx === -200) { cx = tx; cy = ty; }
      if (!cursorRaf) cursorRaf = requestAnimationFrame(cursorLoop);
    };
    viewport.addEventListener('pointerenter', (e) => { if (mode === 'drag' && e.pointerType === 'mouse') { moveCursor(e); cursor.classList.add('is-visible'); } });
    viewport.addEventListener('pointerleave', () => { if (!state.dragging) cursor.classList.remove('is-visible'); });

    viewport.addEventListener('pointerdown', onDown);
    viewport.addEventListener('pointermove', onMove);
    viewport.addEventListener('pointerup', onUp);
    viewport.addEventListener('pointercancel', onUp);

    /* wheel / trackpad horizontal scroll in drag mode */
    viewport.addEventListener('wheel', (e) => {
      if (mode !== 'drag' || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      state.target = null;
      state.x = clamp(state.x - e.deltaX, state.min, 0);
      state.v = 0; render();
    }, { passive: false });

    /* keep focused cards in view (keyboard) */
    track.addEventListener('focusin', (e) => {
      const item = e.target.closest('.strip__item');
      if (!item) return;
      if (mode === 'drag') {
        viewport.scrollLeft = 0;
        const left = item.offsetLeft, right = left + item.offsetWidth;
        const pad = parseFloat(getComputedStyle(track).paddingLeft);
        if (left + state.x < pad) glideTo(-(left - pad));
        else if (right + state.x > viewport.clientWidth - pad) glideTo(-(right - viewport.clientWidth + pad));
      }
    });
    viewport.addEventListener('scroll', () => {
      if (mode === 'drag') { viewport.scrollLeft = 0; return; }
      const max = viewport.scrollWidth - viewport.clientWidth;
      updateUI(max > 0 ? viewport.scrollLeft / max : 0);
    }, { passive: true });

    /* prev / next */
    const page = (dir) => {
      if (mode === 'drag') glideTo(Math.round((state.x - dir * step()) / step()) * step());
      else viewport.scrollBy({ left: dir * step(), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    };
    prevBtn.addEventListener('click', () => page(-1));
    nextBtn.addEventListener('click', () => page(1));

    /* switch modes with input type */
    const setMode = () => {
      const next = finePointer.matches ? 'drag' : 'native';
      if (next === mode) { measure(); render(); return; }
      mode = next;
      strip.classList.toggle('is-draggable', mode === 'drag');
      state.x = 0; state.v = 0;
      if (mode === 'native') { track.style.transform = ''; cursor.classList.remove('is-visible'); updateUI(0); }
      else { viewport.scrollLeft = 0; measure(); render(); }
    };
    finePointer.addEventListener?.('change', setMode);
    window.addEventListener('resize', setMode);
    if ('ResizeObserver' in window) new ResizeObserver(() => setMode()).observe(track);
    document.addEventListener('laplage:filter', () => {
      state.x = 0; state.v = 0; state.target = null; viewport.scrollLeft = 0;
      measure(); render(); updateUI(0);
    });
    setMode();
  };

  /* ---------------- Collections: Sea and Sand panels ---------------- */
  const initCollections = (products) => {

    document.querySelectorAll('[data-collection]').forEach((panel) => {
      if (!panel.classList.contains('panel')) return;
      const key = panel.dataset.collection;
      const items = products.filter((p) => p.collection === key);
      const fan = panel.querySelector('[data-fan]');
      const n = items.length;
      // A loose, hand-placed scatter: no two pieces share a row or a column, sizes and tilts vary,
      // and everything stays clear of the caption in the bottom-left. Only a few pieces show here
      // (featured ones first); the full collection lives in the drop. Each slot is [x%, y%, size, tilt].
      const layout = {
        sea: {
          desk:  [[24, 15, 1, -6], [67, 8, .78, 5], [84, 34, .88, -3], [46, 37, .7, 8], [77, 69, .95, -9]],
          phone: [[22, 12, .95, -6], [74, 7, .8, 5], [57, 27, 1, -3], [87, 39, .72, 8], [21, 42, .82, -9]],
        },
        sand: {
          desk:  [[24, 10, 1, -7], [70, 13, .82, 6], [47, 31, .92, -4]],
          phone: [[25, 9, .95, -7], [77, 15, .8, 6], [52, 30, 1, -4]],
          nuts:  [[80, 37, 1, 0], [72, 67, .95, 0]],
          nutsPhone: [[25, 36, .95, 0], [76, 45, .88, 0]],
        },
      }[key];
      const ranked = [...items].sort((p, q) => (q.featured ? 1 : 0) - (p.featured ? 1 : 0));
      // every piece appears once: the coconuts hide pieces that are not already on show, and when the
      // collection is too small to fill them, the last piece on show moves into a coconut instead
      const shown = ranked.slice(0, layout.desk.length);
      let hidden = layout.nuts ? ranked.slice(shown.length, shown.length + layout.nuts.length) : [];
      if (layout.nuts && !hidden.length && shown.length > 1) hidden = [shown.pop()];
      fan.removeAttribute('aria-hidden');   // the pieces and coconuts are buttons
      const at = (p) => products.indexOf(p);
      const varsFor = (i, [x, y, s, r], [mx, my, ms]) => {
        const bob = (5.2 + ((i * 1.7) % 2.6)).toFixed(2);          // every piece on its own rhythm
        const flow = (19 + ((i * 5) % 9)).toFixed(0);              // and its own slow drift
        return `--i:${i};--x:${x}%;--y:${y}%;--mx:${mx}%;--my:${my}%;--ms:${ms};--r:${r}deg;--dx:${((x - 50) / 50).toFixed(2)};--dy:${((y - 45) / 45).toFixed(2)};--s:${s};--bob:${bob}s;--bob-delay:${(-i * 1.3).toFixed(1)}s;--flow:${flow}s;--flow-delay:${(-i * 4.7).toFixed(1)}s;--fx:${(i % 2 ? -1 : 1) * (2.2 + (i % 3) * 0.8)}vw;--fy:${(1.6 + ((i + 1) % 3) * 0.7).toFixed(1)}vw`;
      };
      const free = shown.map((p, i) => {
        const src = p.cutout || p.image.src;
        const inner = key === 'sand'
          ? `<img class="bubble__item" data-motion src="${src}" alt="" loading="lazy" decoding="async">`
          : `<img class="bubble__item" data-motion src="${src}" alt="" loading="lazy" decoding="async"><div class="bubble__glass" data-motion></div>
             ${Array.from({ length: 10 }, (_, k) => `<span class="pop-drop" data-motion style="--a:${k * 36 + (k % 2) * 14}deg;--l:${(k % 3) * 8 + 52}%"></span>`).join('')}`;
        const pop = key === 'sea';
        return `<figure class="bubble${key === 'sand' ? ' bubble--free' : ''}" style="${varsFor(i, layout.desk[i], layout.phone[i])}" data-motion data-view="${at(p)}"${pop ? ' data-pop' : ''} role="button" tabindex="0" aria-label="${pop ? `Pop the bubble to free the ${p.title}` : `View the ${p.title}`}">
          <div class="bubble__flow" data-motion><div class="bubble__float" data-motion>${inner}</div></div>
          <figcaption>${p.title}</figcaption>
        </figure>`;
      });
      const nuts = hidden.map((p, j) => {
        const src = p.cutout || p.image.src;
        const crack = Array.from({ length: 4 }, (_, k) => `<span class="splash" data-motion style="--k:${k}"></span>`).join('');
        return `<figure class="bubble bubble--coconut" style="${varsFor(shown.length + j, layout.nuts[j], layout.nutsPhone[j])}" data-motion>
          <span class="nut__mound" aria-hidden="true"></span>
          <button class="nut" type="button" aria-pressed="false" aria-label="Crack open the coconut to see the ${p.title}" data-motion data-piece="${at(p)}">
            <span class="coconut__shadow" data-motion></span>
            <span class="nut__shell" data-motion>
              <span class="nut__inside" data-motion></span>
              <span class="nut__half nut__half--l" data-motion><img src="assets/collections/coconut-photo.webp" alt="" width="319" height="325" loading="lazy" decoding="async"></span>
              <span class="nut__half nut__half--r" data-motion><img src="assets/collections/coconut-photo.webp" alt="" width="319" height="325" loading="lazy" decoding="async"></span>
            </span>
            <span class="nut__piece" data-motion><img class="bubble__item" data-motion src="${src}" alt="" loading="lazy" decoding="async"></span>
            ${crack}
          </button>
          <figcaption>${p.title}</figcaption>
        </figure>`;
      });
      fan.innerHTML = free.join('') + nuts.join('');
      // tap a piece: it opens in the spotlight, right here (no jump up the page)
      const view = (el) => document.dispatchEvent(new CustomEvent('laplage:view', { detail: { index: parseInt(el.dataset.view, 10), from: el, kind: key } }));
      // Sea bubbles pop first (glass bursts into droplets, the piece is set free); tap the piece again to see it.
      // A popped bubble slowly forms again a little later.
      const tap = (el) => {
        if (el.hasAttribute('data-pop') && !el.classList.contains('is-popped')) {
          el.classList.add('is-popped');
          el.setAttribute('aria-label', `View the ${el.querySelector('figcaption').textContent}`);
          clearTimeout(el._regrow);
          el._regrow = setTimeout(() => {
            el.classList.remove('is-popped');
            el.setAttribute('aria-label', `Pop the bubble to free the ${el.querySelector('figcaption').textContent}`);
          }, 15000);
          return;
        }
        view(el);
      };
      fan.querySelectorAll('[data-view]').forEach((el) => {
        el.addEventListener('click', () => tap(el));
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(el); } });
      });
      // tap a coconut: it shakes, cracks in two and the piece springs out; tap the piece to see it, or the shell to close it
      fan.querySelectorAll('.nut').forEach((nut) => {
        nut.addEventListener('click', (e) => {
          if (nut.getAttribute('aria-pressed') === 'true' && e.target.closest('.nut__piece')) {
            document.dispatchEvent(new CustomEvent('laplage:view', { detail: { index: parseInt(nut.dataset.piece, 10), from: nut, kind: 'sand' } }));
            return;
          }
          const open = nut.getAttribute('aria-pressed') !== 'true';
          nut.setAttribute('aria-pressed', String(open));
          nut.closest('.bubble').classList.toggle('is-open', open);
        });
      });
      // tiny bubbles rising through the sea
      if (key === 'sea' && !panel.querySelector('.panel__rise')) {
        const rise = document.createElement('div');
        rise.className = 'panel__rise'; rise.setAttribute('aria-hidden', 'true'); rise.dataset.motion = '';
        rise.innerHTML = Array.from({ length: 14 }, (_, k) => {
          const size = 4 + ((k * 7) % 11);
          return `<span data-motion style="--x:${(k * 37) % 100}%;--size:${size}px;--dur:${(9 + (k * 3) % 8).toFixed(1)}s;--delay:${(-(k * 1.9)).toFixed(1)}s;--sway:${(k % 2 ? 1 : -1) * (8 + k % 5 * 3)}px"></span>`;
        }).join('');
        panel.insertBefore(rise, fan);
      }
      // Sea: fine engraved swell lines rolling in, layer behind layer
      if (key === 'sea' && !panel.querySelector('.panel__waves')) {
        const waves = document.createElement('div');
        waves.className = 'panel__waves'; waves.setAttribute('aria-hidden', 'true'); waves.dataset.motion = '';
        const layer = (k) => {
          const W = 2400, step = 300, lines = 5 - (k === 2 ? 1 : 0);
          let d = '';
          for (let j = 0; j < lines; j++) {
            const y0 = 30 + j * (22 + k * 4), amp = 9 - j * 1.1 + k;
            d += `M0 ${y0}`;
            for (let x = 0; x <= W; x += step / 2) {
              const up = (x / (step / 2)) % 2 === 0;
              d += ` Q${x + step / 4} ${up ? y0 - amp : y0 + amp} ${x + step / 2} ${y0}`;
            }
          }
          return `<div class="wave-layer wave-layer--${k}" data-motion><svg viewBox="0 0 2400 200" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/></svg></div>`;
        };
        waves.innerHTML = layer(0) + layer(1) + layer(2);
        panel.insertBefore(waves, fan);
      }
      // Sand: wind ripples, dunes and a turquoise shoreline lapping at the bottom
      if (key === 'sand' && !panel.querySelector('.panel__shore')) {
        const beach = document.createElement('div');
        beach.className = 'panel__beach'; beach.setAttribute('aria-hidden', 'true'); beach.dataset.motion = '';
        beach.innerHTML = `<span class="beach__dune beach__dune--a"></span><span class="beach__dune beach__dune--b"></span><span class="beach__ripples"></span>
          <div class="panel__shore" data-motion><span class="shore__wet" data-motion></span><span class="shore__water" data-motion></span>
          <svg class="shore__foam" data-motion viewBox="0 0 1200 40" preserveAspectRatio="none"><path d="M0 20 Q 50 6 100 20 T 200 20 T 300 20 T 400 20 T 500 20 T 600 20 T 700 20 T 800 20 T 900 20 T 1000 20 T 1100 20 T 1200 20 V40 H0 Z"/></svg></div>`;
        panel.insertBefore(beach, fan);
      }
      // titles: each letter moves on its own (a rolling wave for Sea, a slow gold shimmer for Sand)
      const title = panel.querySelector('.panel__title');
      if (title && !title.dataset.letters) {
        title.dataset.letters = '1';
        title.setAttribute('aria-label', title.textContent.trim());
        title.querySelectorAll('.w__i, em').forEach((el) => {
          if (el.querySelector('.w__i')) return;
          const text = el.textContent;
          el.innerHTML = [...text].map((ch, k) => `<span class="ltr" data-motion aria-hidden="true" style="--k:${k}">${ch}</span>`).join('');
        });
      }
      const count = panel.querySelector('[data-count]');
      if (count) count.textContent = `${String(n).padStart(2, '0')} pieces`;
      const link = panel.querySelector('.panel__link');
      link.setAttribute('aria-label', `${key === 'sea' ? 'Sea' : 'Sand'} collection, ${n} pieces. Shop the collection`);

      // a soft sheen that follows the cursor
      panel.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = panel.getBoundingClientRect();
        panel.style.setProperty('--mx', `${((e.clientX - r.left) / r.width * 100).toFixed(1)}%`);
        panel.style.setProperty('--my', `${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`);
      });
      // clicking a collection filters the drop to its pieces

    });
  };

  /* ---------------- 3D logo: the palm and the wordmark are built from stacked slices so they have
     real thickness; it sways on its own, and can be dragged round (with a little inertia) ---------------- */
  const initLogo3d = () => {
    const root = document.querySelector('[data-logo3d]');
    const obj = root && root.querySelector('[data-logo3d-obj]');
    if (!obj) return;
    const SLICES = 26, WORD = 14;
    let html = '<div class="logo3d__mark">';
    for (let i = SLICES - 1; i >= 0; i--) {
      const cls = i === 0 ? 'is-front' : (i === SLICES - 1 ? 'is-back' : 'is-side');
      html += `<span class="logo3d__slice ${cls}" style="--z:${i}" data-motion></span>`;
    }
    html += '</div><div class="logo3d__word">';
    for (let i = WORD - 1; i >= 0; i--) {
      const cls = i === 0 ? 'is-front' : (i === WORD - 1 ? 'is-back' : 'is-side');
      html += `<span class="logo3d__text ${cls}" style="--z:${i}" data-motion>LA PLAGE</span>`;
    }
    html += '</div>';
    obj.innerHTML = html;

    let ry = 0, rx = 6, vy = 0, dragging = false, lastX = 0, lastY = 0, idle = 0, raf = 0;
    const t0 = performance.now();
    const render = () => {
      obj.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      // light follows the turn: the sheen slides across the face, the sides darken away from the light
      const a = ((ry % 360) + 360) % 360;
      obj.style.setProperty('--sheen', `${(50 + Math.sin(a * Math.PI / 180) * 60).toFixed(1)}%`);
      obj.style.setProperty('--side-light', (0.55 + 0.45 * Math.abs(Math.cos(a * Math.PI / 180))).toFixed(3));
    };
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (dragging) return render();
      // never let it turn side-on: seen edge-first, the stacked slices read as a dark bar and flicker.
      // At rest it sways gently around facing forward; after a drag it eases back into that sway.
      const t = (now - t0) / 1000;
      const swayY = Math.sin(t * 0.55) * 24;
      const swayX = 6 + Math.sin(t * 0.37) * 4;
      if (Math.abs(vy) > 0.02) { ry = clamp(ry + vy, -55, 55); vy *= 0.9; idle = now; }
      const ease = now - idle > 600 ? 0.035 : 0.012;
      ry += (swayY - ry) * ease;
      rx += (swayX - rx) * ease;
      render();
    };
    root.addEventListener('pointerdown', (e) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY; vy = 0;
      root.setPointerCapture(e.pointerId); root.classList.add('is-grabbing');
    });
    root.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      ry = clamp(ry + dx * 0.45, -55, 55); rx = clamp(rx - dy * 0.3, -25, 25);
      vy = vy * 0.5 + dx * 0.45 * 0.5;
      lastX = e.clientX; lastY = e.clientY;
    });
    const up = (e) => {
      if (!dragging) return;
      dragging = false; idle = performance.now(); root.classList.remove('is-grabbing');
      if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId);
    };
    root.addEventListener('pointerup', up);
    root.addEventListener('pointercancel', up);
    // only animate while the hero is on screen
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !raf) raf = requestAnimationFrame(loop);
      if (!en.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
    }).observe(root);
    render();
  };

  /* ---------------- Glass row: featured pieces in glass frames floating over the ocean ---------------- */
  const initGlassRow = (products) => {
    const row = document.querySelector('[data-glass-row]');
    if (!row || !products.length) return;
    // favourites first; any that are resting between drops are skipped and the row fills up with the rest
    const picks = [];
    ['rivage-short', 'corail-patch-short', 'lagon-short', 'maree-short', 'esprit-cotier-tee', 'palmier-short'].forEach((id) => {
      const p = products.find((x) => x.id === id); if (p) picks.push(p);
    });
    products.forEach((p) => { if (picks.length < 6 && !picks.includes(p)) picks.push(p); });
    row.style.setProperty('--n', picks.length);
    row.innerHTML = picks.map((p, k) => `
      <li class="glass" style="--k:${k};--lift:${[0, 34, 8, 46, 14, 28][k % 6]}px;--tilt:${[-3, 2, -1.5, 3, -2.5, 1.5][k % 6]}deg" data-animate="fade-up" data-delay="${k * 110}" data-motion>
        <div class="glass__bob" data-motion>
          <button type="button" class="glass__frame" data-index="${products.indexOf(p)}" aria-label="View the ${p.title}" data-motion>
            <img src="${p.cutout || p.image.src}" alt="" decoding="async" data-motion>
          </button>
          <span class="glass__reflection" aria-hidden="true" data-motion><img src="${p.cutout || p.image.src}" alt="" decoding="async"></span>
        </div>
        <p class="glass__name">${p.title}</p>
        <p class="glass__price">${formatVND.format(p.price)}</p>
      </li>`).join('');
    // each card rides the swell at its own pace as the page scrolls
    const cards = [...row.querySelectorAll('.glass')];
    let ticking = false;
    const drift = () => {
      ticking = false;
      const r = row.getBoundingClientRect();
      const t = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      cards.forEach((c, k) => c.style.setProperty('--swell', `${(t * (k % 2 ? 46 : -30)).toFixed(1)}px`));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(drift); } }, { passive: true });
    drift();
    row.querySelectorAll('.glass__frame').forEach((b) => {
      b.addEventListener('click', () => document.dispatchEvent(new CustomEvent('laplage:view', { detail: { index: parseInt(b.dataset.index, 10), from: b, kind: 'plain' } })));
      b.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = b.getBoundingClientRect();
        b.style.setProperty('--tx', `${(((e.clientX - r.left) / r.width) - .5) * 14}deg`);
        b.style.setProperty('--ty', `${(((e.clientY - r.top) / r.height) - .5) * -14}deg`);
      });
      b.addEventListener('pointerleave', () => { b.style.removeProperty('--tx'); b.style.removeProperty('--ty'); });
    });
  };

  /* ---------------- Hero slogan: a sunlit line that turns to the next every few seconds ---------------- */
  const initSlogan = () => {
    const box = document.querySelector('[data-slogan]');
    if (!box) return;
    const lines = ['golden hour.', 'salt & sun.', 'the shoreline.', 'barefoot days.', 'the open sea.', 'long weekends.'];
    let i = 0;
    const turn = () => {
      const out = box.querySelector('.slogan__line.is-on');
      i = (i + 1) % lines.length;
      const next = document.createElement('em');
      next.className = 'slogan__line'; next.dataset.motion = ''; next.textContent = lines[i];
      box.appendChild(next);
      void next.offsetWidth;
      out.classList.remove('is-on'); out.classList.add('is-off');
      next.classList.add('is-on');
      setTimeout(() => out.remove(), 1200);
    };
    const start = () => setInterval(() => { if (!document.hidden) turn(); }, 3800);
    if (window.laPlageIntro) window.laPlageIntro.then(() => setTimeout(start, 1600)); else setTimeout(start, 1600);
  };

  /* ---------------- Smooth scrolling: the wheel glides instead of jumping, and section links ease into place ---------------- */
  const initSmoothScroll = () => {
    const root = document.documentElement;
    let target = window.scrollY, current = window.scrollY, raf = 0;
    const maxY = () => root.scrollHeight - window.innerHeight;
    const loop = () => {
      current += (target - current) * 0.1;
      if (Math.abs(target - current) < 0.5) current = target;
      window.scrollTo(0, current);
      raf = current === target ? 0 : requestAnimationFrame(loop);
    };
    const glide = (y) => {
      if (!raf) current = window.scrollY;
      target = clamp(y, 0, maxY());
      if (!raf) raf = requestAnimationFrame(loop);
    };
    root.classList.add('has-smooth');
    if (finePointer.matches) {
      window.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.defaultPrevented || root.classList.contains('intro-on') || root.classList.contains('spot-on')) return;
        // an open overlay (the pre-order form) scrolls itself; leave the page behind it alone
        if (root.classList.contains('pf-lock') || (e.target.closest && e.target.closest('.pf-overlay'))) return;
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        e.preventDefault();
        if (!raf) target = window.scrollY;
        const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1;
        glide(target + e.deltaY * unit);
      }, { passive: false });
    }
    // keyboard, scrollbar or touch scrolling: follow along instead of fighting it
    window.addEventListener('scroll', () => { if (!raf) target = current = window.scrollY; }, { passive: true });
    // the menu (header and footer) loads its section: the palm spins once, quickly, while the page
    // moves behind it; other links to a section on the page glide there
    // The veil's fade is one animation (it keeps playing even while the page is busy), the page only
    // moves once the veil is on screen, and the veil leaves when its own animation ends.
    let loader = null, jump = 0;
    const load = (y) => {
      if (!loader) {
        loader = document.createElement('div');
        loader.className = 'page-loader'; loader.setAttribute('aria-hidden', 'true');
        loader.innerHTML = '<img src="assets/brand/mark.png" alt="" width="660" height="603">';
        document.body.appendChild(loader);
        loader.addEventListener('animationend', (e) => { if (e.target === loader) loader.classList.remove('is-on'); });
      }
      clearTimeout(jump);
      loader.classList.remove('is-on'); void loader.offsetWidth; loader.classList.add('is-on');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        jump = setTimeout(() => { cancelAnimationFrame(raf); raf = 0; target = current = clamp(y, 0, maxY()); window.scrollTo(0, current); }, 160);
      }));
    };
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented || a.classList.contains('skip-link')) return;
      const id = a.getAttribute('href').slice(1);
      const el = id && document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      const y = el.getBoundingClientRect().top + window.scrollY - margin;
      if (a.closest('.nav, .footer') && !reduceMotion.matches) load(y); else glide(y);
      history.replaceState(null, '', `#${id}`);
    });
  };

  /* ---------------- Interlude: the wave rushes in each time the tide section comes into view ---------------- */
  const initTide = () => {
    const tide = document.querySelector('[data-tide]');
    if (!tide || !('IntersectionObserver' in window)) { tide?.classList.add('is-in'); return; }
    new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.intersectionRatio >= 0.12) tide.classList.add('is-in');   // the wave starts as soon as the section is coming into view
        else if (!e.isIntersecting && e.boundingClientRect.top > 0) tide.classList.remove('is-in');   // reset only once it is below the screen again
      });
    }, { threshold: [0, 0.12] }).observe(tide);
  };

  /* ---------------- Lookbook parallax ---------------- */
  const initParallax = () => {
    const imgs = [...document.querySelectorAll('[data-parallax]')];
    if (!imgs.length) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      if (reduceMotion.matches) { imgs.forEach((img) => { img.style.transform = ''; }); return; }
      const vh = window.innerHeight;
      imgs.forEach((img) => {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const offset = (r.top + r.height / 2 - vh / 2) * parseFloat(img.dataset.parallax);
        img.style.transform = `translate3d(0, ${clamp(-offset, -r.height * 0.08, r.height * 0.08)}px, 0)`;
      });
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  };

  /* ---------------- Private access form (no backend yet) ---------------- */
  const initAccess = () => {
    const form = document.querySelector('[data-access-form]');
    const input = form.querySelector('input');
    const status = document.getElementById('access-status');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = input.value.trim() && input.checkValidity();
      input.setAttribute('aria-invalid', String(!ok));
      status.classList.toggle('is-error', !ok);
      if (!ok) { status.textContent = 'Please enter a valid email address.'; input.focus(); return; }
      // TODO: connect to the mailing platform (e.g. Shopify customer marketing / Klaviyo)
      status.textContent = 'Thank you. We will write before the next drop.';
      form.reset();
    });
    input.addEventListener('input', () => { input.removeAttribute('aria-invalid'); status.classList.remove('is-error'); status.textContent = ''; });
  };

  /* ---------------- Footer language toggle (visual only for now) ---------------- */
  const initLocale = () => {
    const btns = document.querySelectorAll('[data-lang]');
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    }));
    const y = document.querySelector('[data-year]');
    if (y) y.textContent = new Date().getFullYear();
  };

  /* ---------------- Boot ---------------- */
  updateNav();
  window.addEventListener('scroll', queueNav, { passive: true });
  window.addEventListener('resize', queueNav);
  initScrollSpy();
  initParallax();
  initAccess();
  initLocale();
  loadProducts().then((products) => { initAnimations(); initStrip(); initCardPop(); initSpotlight(products); initCollections(products); initGlassRow(products); initAnimations(document.querySelector('[data-glass-row]')); });
  initLogo3d();
  initSlogan();
  initTide();
  initSmoothScroll();
})();
