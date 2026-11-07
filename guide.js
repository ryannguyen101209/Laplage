/* LA PLAGE · colour guide page: every print up close, from data/colour-guide.json */
(() => {
  const main = document.querySelector('[data-guide]');
  const slug = (n) => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const chips = (list) => `<ul class="cg-chips">${list.map((c) => `
    <li>
      <span class="cg-chips__sw" style="background:${c.hex}" aria-hidden="true"></span>
      <b>${c.role}</b>
      <code>${c.hex}</code>
      ${c.share ? `<span>${c.share}% of the print</span>` : ''}
    </li>`).join('')}</ul>`;

  const section = (g, n, products) => {
    const p = products.find((x) => x.id === g.product);
    const href = p ? `index.html#product/${p.handle}${g.color ? `/${slug(g.color)}` : ''}` : '';
    return `
      <section class="cg-print" id="${g.key}" style="--accent:${g.patchColours[1].hex}" aria-labelledby="cg-${g.key}">
        <header class="cg-print__head">
          <p class="cg-print__n">0${n + 1}</p>
          <h2 class="cg-print__name" id="cg-${g.key}">${g.name}</h2>
          <p class="cg-print__kind">${g.kind}</p>
        </header>
        <div class="cg-print__body">
          <figure class="cg-print__shorts"><img src="${g.shorts}" alt="The ${g.name} short" width="900" height="798" loading="lazy"></figure>
          <figure class="cg-print__pattern"><img src="${g.pattern}" alt="The ${g.name} pattern, full size" loading="lazy"><figcaption>Pattern, full size</figcaption></figure>
          <div class="cg-print__colours">
            <h3 class="cg-h">Pattern colours</h3>
            <p class="cg-note">Share = how much of the printed fabric that colour covers.</p>
            <div class="cg-bar" aria-hidden="true">${g.patternColours.map((c) => `<span style="background:${c.hex};flex-grow:${c.share}"></span>`).join('')}</div>
            ${chips(g.patternColours)}
            <div class="cg-patch">
              <img src="${g.patch}" alt="The embroidered LA PLAGE patch in the ${g.name} colours" width="600" height="376" loading="lazy">
              <div><h3 class="cg-h">Patch colours</h3>${chips(g.patchColours)}</div>
            </div>
            ${p ? `<a class="btn-outline cg-cta" href="${href}">Pre-order the ${p.title}${g.color ? `, ${g.color}` : ''}</a>` : ''}
          </div>
        </div>
      </section>`;
  };

  Promise.all([
    fetch('data/colour-guide.json', { cache: 'no-cache' }).then((r) => r.json()),
    fetch('data/products.json', { cache: 'no-cache' }).then((r) => r.json()).then((d) => (d.products || []).filter((p) => !p.hidden)).catch(() => []),
  ]).then(([guide, products]) => {
    guide.prints = guide.prints.filter((g) => !g.hidden);   // prints resting between drops stay in the data, off the page
    const [first, ...rest] = guide.title.split(' ');
    main.innerHTML = `
      <section class="cg-hero">
        <h1 class="cg-hero__title">${first} <em>${rest.join(' ')}</em></h1>
        <p class="cg-hero__tag">${guide.tagline}</p>
        ${guide.pdf ? `<a class="cg-download" href="${guide.pdf.href}" download>Download the colour guide <span>PDF · ${guide.pdf.size}</span></a>` : ''}
        <ul class="cg-index" style="--n:${guide.prints.length}">${guide.prints.map((g) => `
          <li><a href="#${g.key}">
            <img src="${g.shorts}" alt="" width="900" height="798" loading="lazy">
            <span class="cg-index__name">${g.name}</span>
            <span class="cg-index__kind">${g.kind}</span>
          </a></li>`).join('')}</ul>
      </section>
      ${guide.prints.map((g, n) => section(g, n, products)).join('')}
      <section class="cg-brand" id="brand" aria-labelledby="cg-brand">
        <h2 class="cg-print__name" id="cg-brand">Brand colours</h2>
        <p class="cg-print__kind">The LA PLAGE palette</p>
        <ul class="cg-brand__list">${guide.brand.colours.map((c) => `
          <li><span style="background:${c.hex}" aria-hidden="true"></span><b>${c.name}</b><code>${c.hex}</code></li>`).join('')}</ul>
        <p class="cg-note">${guide.brand.note}</p>
      </section>`;
    // each print rises in as it reaches the screen
    const els = main.querySelectorAll('.cg-print, .cg-brand');
    if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
      els.forEach((el) => { el.classList.add('cg-rise'); io.observe(el); });
    }
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }).catch(() => {
    main.innerHTML = '<p class="pf-state">The colour guide could not be loaded. Please refresh and try again.</p>';
  });
})();
