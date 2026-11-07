/* LA PLAGE · home page: the Sign in / Account control in the header and the pre-order overlay.
   Opens from the product view's "Pre-order" button with that piece and size already chosen.
   Firebase is only downloaded once firebase-config.js has been filled in. */
const cfg = (window.LAPLAGE_CONFIG || {}).FIREBASE_CONFIG || {};
const ready = !!(cfg.apiKey && !/^PASTE_/.test(cfg.apiKey));
// if the SDK can't be reached (a content blocker, a bad connection) the shop carries on without accounts
const load = async () => {
  if (!ready) return [{ isConfigured: false }, {}, {}];
  try {
    return await Promise.all([import('./firebase.js'), import('./auth-form.js'), import('./emails.js')]);
  } catch (e) {
    console.warn('[LA PLAGE] accounts unavailable', e);
    return [{ isConfigured: false }, {}, {}];
  }
};
const [
  {
    isConfigured, auth, db, SHIPPING_FEE, esc, fmtVND, authMessage, loadProducts,
    onAuthStateChanged, doc, updateDoc, addDoc, collection, serverTimestamp,
  },
  { renderAuthForm, loadProfile },
  { sendOrderEmails },
] = await load();

const links = [...document.querySelectorAll('[data-account-link]')];
const setLinks = (label) => links.forEach((a) => { a.textContent = label; });

if (isConfigured) {
  let user = null, profile = null, products = [], pending = null, overlay = null, lastFocus = null;
  loadProducts().then((p) => { products = p; }).catch(() => {});

  onAuthStateChanged(auth, async (u) => {
    user = u; profile = null;
    setLinks(u ? 'Account' : 'Sign in');
    if (u) { try { profile = await loadProfile(u); } catch (e) { profile = null; } }
    if (overlay && !overlay.hidden) draw();
  });

  const close = () => {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    document.documentElement.classList.remove('pf-lock');
    setTimeout(() => { overlay.hidden = true; }, 350);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };

  const ensureOverlay = () => {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'pf-overlay';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'pf-title');
    overlay.innerHTML = `
      <div class="pf-panel" data-motion>
        <button type="button" class="pf-close ui-btn link" data-pf-close>Close</button>
        <p class="label">Pre-order · Drop 001</p>
        <h2 class="pf-title" id="pf-title">Reserve your <em>piece.</em></h2>
        <p class="pf-lead">Pre-orders join the next production batch. We confirm each one personally and arrange payment with you directly. No card details are taken here.</p>
        <div data-pf-body></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('[data-pf-close]').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  };

  const body = () => overlay.querySelector('[data-pf-body]');

  // pieces made in more than one colour list them in "colors"
  const colorsOf = (id) => ((products.find((p) => p.id === id) || {}).colors || []);
  const itemRow = (it, k) => `
    <div class="pf-item" data-item="${k}">
      <label class="pf-field pf-field--grow"><span>Piece</span>
        <select name="product">${products.map((p) => `<option value="${esc(p.id)}"${p.id === it.productId ? ' selected' : ''}>${esc(p.title)} · ${esc(fmtVND(p.price))}</option>`).join('')}</select></label>
      ${colorsOf(it.productId).length > 1 ? `<label class="pf-field"><span>Colour</span>
        <select name="color">${colorsOf(it.productId).map((c) => `<option${c.name === it.color ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>` : ''}
      <label class="pf-field"><span>Size</span>
        <select name="size">${((products.find((p) => p.id === it.productId) || products[0] || {}).sizes || ['M']).map((s) => `<option${s === it.size ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
      <label class="pf-field pf-field--qty"><span>Qty</span>
        <select name="qty">${[1, 2, 3, 4, 5].map((q) => `<option${q === it.qty ? ' selected' : ''}>${q}</option>`).join('')}</select></label>
      ${k > 0 ? '<button type="button" class="pf-remove ui-btn link" data-remove aria-label="Remove this piece">Remove</button>' : ''}
    </div>`;

  let items = [];
  const totals = () => {
    const subtotal = items.reduce((s, it) => s + ((products.find((p) => p.id === it.productId) || {}).price || 0) * it.qty, 0);
    return { subtotal, total: subtotal + SHIPPING_FEE };
  };

  const draw = () => {
    if (!user) {
      renderAuthForm(body(), { intro: 'Sign in or create an account to place your pre-order.' });
      return;
    }
    if (!profile) { body().innerHTML = '<p class="pf-state">Loading your account…</p>'; return; }
    if (profile.disabled) {
      body().innerHTML = '<p class="pf-state">This account cannot place new pre-orders at the moment. Please contact us if you think this is a mistake.</p>';
      return;
    }
    if (!products.length) { body().innerHTML = '<p class="pf-state">The pieces could not be loaded. Please refresh and try again.</p>'; return; }
    if (!items.length) items = [pending || { productId: products[0].id, size: (products[0].sizes || ['M'])[1] || 'M', qty: 1 }];
    const a = profile.address || {};
    const { subtotal, total } = totals();
    body().innerHTML = `
      <form class="pf-form" novalidate data-order-form>
        <fieldset class="pf-set"><legend>Your pieces</legend>
          <div data-items>${items.map(itemRow).join('')}</div>
          <button type="button" class="ui-btn link pf-add" data-add>+ Add another piece</button>
        </fieldset>
        <fieldset class="pf-set"><legend>Contact</legend>
          <div class="pf-grid">
            <label class="pf-field"><span>Full name</span><input name="name" autocomplete="name" required maxlength="80" value="${esc(profile.name || '')}"></label>
            <label class="pf-field"><span>Phone</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" required maxlength="20" value="${esc(profile.phone || '')}"></label>
            <label class="pf-field"><span>Gmail <em>confirmation goes here</em></span><input name="gmail" type="email" inputmode="email" autocomplete="email" required maxlength="120" value="${esc(profile.gmail || '')}"></label>
          </div>
        </fieldset>
        <fieldset class="pf-set"><legend>Shipping address</legend>
          <div class="pf-grid">
            <label class="pf-field pf-field--wide"><span>Street</span><input name="street" autocomplete="address-line1" required maxlength="120" value="${esc(a.street || '')}"></label>
            <label class="pf-field"><span>Ward</span><input name="ward" required maxlength="60" value="${esc(a.ward || '')}"></label>
            <label class="pf-field"><span>District</span><input name="district" required maxlength="60" value="${esc(a.district || '')}"></label>
            <label class="pf-field"><span>City</span><input name="city" autocomplete="address-level2" required maxlength="60" value="${esc(a.city || '')}"></label>
          </div>
          <label class="pf-check"><input type="checkbox" name="save" checked> Save this address and phone to my account</label>
        </fieldset>
        <label class="pf-field pf-field--wide"><span>Note <em>optional</em></span><textarea name="note" rows="2" maxlength="500"></textarea></label>
        <dl class="pf-sum">
          <div><dt>Subtotal</dt><dd data-subtotal>${esc(fmtVND(subtotal))}</dd></div>
          <div><dt>Shipping</dt><dd>${esc(fmtVND(SHIPPING_FEE))}</dd></div>
          <div class="pf-sum__total"><dt>Total</dt><dd data-total>${esc(fmtVND(total))}</dd></div>
        </dl>
        <p class="pf-error" role="alert" data-order-error></p>
        <button class="btn-outline pf-submit" type="submit">Place pre-order</button>
      </form>`;
    wire();
  };

  const readItems = () => {
    items = [...body().querySelectorAll('[data-item]')].map((row) => ({
      productId: row.querySelector('[name="product"]').value,
      size: row.querySelector('[name="size"]').value,
      color: row.querySelector('[name="color"]') ? row.querySelector('[name="color"]').value : '',
      qty: Number(row.querySelector('[name="qty"]').value) || 1,
    }));
  };
  const refreshSums = () => {
    const { subtotal, total } = totals();
    body().querySelector('[data-subtotal]').textContent = fmtVND(subtotal);
    body().querySelector('[data-total]').textContent = fmtVND(total);
  };

  const wire = () => {
    const form = body().querySelector('[data-order-form]');
    const list = form.querySelector('[data-items]');
    list.addEventListener('change', (e) => {
      readItems();
      if (e.target.name === 'product') { list.innerHTML = items.map(itemRow).join(''); }
      refreshSums();
    });
    list.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-remove]'); if (!rm) return;
      readItems(); items.splice(Number(rm.closest('[data-item]').dataset.item), 1);
      list.innerHTML = items.map(itemRow).join(''); refreshSums();
    });
    form.querySelector('[data-add]').addEventListener('click', () => {
      readItems();
      if (items.length >= 10) return;
      items.push({ productId: products[0].id, size: (products[0].sizes || ['M'])[1] || 'M', qty: 1 });
      list.innerHTML = items.map(itemRow).join(''); refreshSums();
    });
    form.addEventListener('submit', submit);
  };

  const submit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const err = form.querySelector('[data-order-error]');
    const btn = form.querySelector('.pf-submit');
    readItems();
    const f = Object.fromEntries(new FormData(form));
    const clean = (k, n) => String(f[k] || '').trim().slice(0, n);
    const data = {
      name: clean('name', 80), phone: clean('phone', 20), gmail: clean('gmail', 120).toLowerCase(),
      address: { street: clean('street', 120), ward: clean('ward', 60), district: clean('district', 60), city: clean('city', 60) },
      note: clean('note', 500),
    };
    err.textContent = '';
    if (!data.name) { err.textContent = 'Please add your full name.'; return; }
    if (!/^[0-9+\s().-]{8,20}$/.test(data.phone)) { err.textContent = 'Please add a phone number we can reach you on.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.gmail)) { err.textContent = 'Please add your Gmail. We send your pre-order confirmation there.'; return; }
    if (Object.values(data.address).some((v) => !v)) { err.textContent = 'Please complete the street, ward, district and city.'; return; }
    const lines = items.map((it) => {
      const p = products.find((x) => x.id === it.productId);
      const color = (p.colors || []).some((c) => c.name === it.color) ? it.color : p.color.name;
      return { productId: p.id, title: p.title, color, size: it.size, quantity: it.qty, price: p.price, lineTotal: p.price * it.qty };
    });
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    btn.disabled = true; btn.classList.add('is-busy');
    try {
      const ref = await addDoc(collection(db, 'orders'), {
        uid: user.uid, username: profile.username || '', gmail: data.gmail,
        customerName: data.name, phone: data.phone, address: data.address, note: data.note,
        items: lines, subtotal, shippingFee: SHIPPING_FEE, total: subtotal + SHIPPING_FEE,
        status: 'preordered', createdAt: serverTimestamp(),
      });
      if (f.save) {
        try {
          await updateDoc(doc(db, 'users', user.uid), { phone: data.phone, address: data.address, gmail: data.gmail });
          profile = { ...profile, phone: data.phone, address: data.address, gmail: data.gmail };
        } catch (e2) { /* the pre-order is placed; saving the address is a nicety */ }
      }
      // emails to the admins and to the customer; the pre-order is already saved, so a failure here never undoes it
      sendOrderEmails({ id: ref.id, ...data, items: lines, subtotal, shippingFee: SHIPPING_FEE, total: subtotal + SHIPPING_FEE, username: profile.username || '' })
        .catch((e3) => console.warn('[LA PLAGE] order emails', e3));
      items = []; pending = null;
      body().innerHTML = `
        <div class="pf-done">
          <p class="pf-done__title">Thank you, ${esc(data.name.split(' ')[0])}. Your pre-order is in.</p>
          <p class="pf-lead">A confirmation is on its way to ${esc(data.gmail)}. We will be in touch to confirm the details and arrange payment, and you can follow its status in your account.</p>
          <a class="link link--underlined" href="account.html">View my pre-orders</a>
        </div>`;
    } catch (ex) {
      err.textContent = ex && ex.code && ex.code.includes('permission-denied')
        ? 'This pre-order could not be placed. Please check your details, or contact us if your account is paused.'
        : authMessage(ex);
      btn.disabled = false; btn.classList.remove('is-busy');
    }
  };

  // the product view's "Pre-order" button calls this with the piece, size and colour on screen
  window.laPlagePreorder = (product, size, color) => {
    ensureOverlay();
    lastFocus = document.activeElement;
    if (product) { pending = { productId: product.id, size: size || 'M', color: color || '', qty: 1 }; items = []; }
    overlay.hidden = false;
    document.documentElement.classList.add('pf-lock');
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    draw();
    overlay.querySelector('[data-pf-close]').focus({ preventScroll: true });
  };
}
