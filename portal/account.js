/* LA PLAGE · account page: sign in, profile, notification Gmail & address, pre-orders, sign out. */
import {
  isConfigured, auth, db, esc, fmtVND, fmtDate, fmtAddress, titleCase, authMessage, isAdminUser,
  onAuthStateChanged, signOut, doc, updateDoc, collection, query, where, getDocs,
} from './firebase.js';
import { renderAuthForm, loadProfile } from './auth-form.js';

const root = document.querySelector('[data-account]');
const GMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const state = (html) => { root.innerHTML = `<div class="pf-card"><p class="pf-state">${html}</p></div>`; };

if (!isConfigured) {
  state('Accounts are opening soon. Please check back shortly.');
} else {
  state('Loading…');
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      root.innerHTML = '<div class="pf-card pf-card--narrow"><h1 class="pf-title">Your <em>account.</em></h1><div data-auth></div></div>';
      renderAuthForm(root.querySelector('[data-auth]'), { intro: 'Sign in to see your pre-orders, or create an account to place one.' });
      return;
    }
    if (isAdminUser(user)) {
      root.innerHTML = `<div class="pf-card pf-card--narrow">
        <h1 class="pf-title">Signed in as <em>admin.</em></h1>
        <p class="pf-lead">${esc(user.email)}</p>
        <p class="pf-actions"><a class="btn-outline" href="admin.html">Open the admin panel</a>
        <button type="button" class="ui-btn link" data-signout>Sign out</button></p></div>`;
      root.querySelector('[data-signout]').addEventListener('click', () => signOut(auth));
      return;
    }
    let profile, orders;
    try {
      profile = await loadProfile(user);
      if (!profile) { await signOut(auth); state('This account is no longer active. Please contact us.'); return; }
      const snap = await getDocs(query(collection(db, 'orders'), where('uid', '==', user.uid)));
      orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0));
    } catch (e) {
      state(`We could not load your account. ${esc(authMessage(e))} <button type="button" class="ui-btn link" onclick="location.reload()">Try again</button>`);
      return;
    }
    render(user, profile, orders);
  });
}

function render(user, profile, orders) {
  const a = profile.address || {};
  const status = orders.some((o) => o.status !== 'cancelled') ? 'Preordered' : 'No pre-order yet';
  root.innerHTML = `
    <div class="pf-card">
      <div class="pf-head">
        <div>
          <p class="label">Account · @${esc(profile.username || '')}</p>
          <h1 class="pf-title">Hello, <em>${esc((profile.name || '').split(' ')[0] || 'there')}.</em></h1>
        </div>
        <span class="pf-badge${status === 'Preordered' ? ' is-on' : ''}">${esc(status)}</span>
      </div>
      ${profile.disabled ? '<p class="pf-notice">This account is paused and cannot place new pre-orders. Please contact us.</p>' : ''}
      <dl class="pf-facts">
        <div><dt>Name</dt><dd>${esc(profile.name || '—')}</dd></div>
        <div><dt>Username</dt><dd>${esc(profile.username || '—')}</dd></div>
        <div><dt>Joined</dt><dd>${esc(fmtDate(profile.createdAt))}</dd></div>
      </dl>
    </div>

    <div class="pf-card">
      <h2 class="pf-h2">Notifications &amp; address</h2>
      <p class="pf-lead">We use your Gmail only to tell you about your pre-orders. Your address is filled in for you next time.</p>
      <form class="pf-form" novalidate data-profile-form>
        <div class="pf-grid">
          <label class="pf-field"><span>Gmail for notifications</span><input name="gmail" type="email" inputmode="email" maxlength="120" required value="${esc(profile.gmail || '')}"></label>
          <label class="pf-field"><span>Phone</span><input name="phone" type="tel" inputmode="tel" maxlength="20" value="${esc(profile.phone || '')}"></label>
          <label class="pf-field pf-field--wide"><span>Street</span><input name="street" maxlength="120" value="${esc(a.street || '')}"></label>
          <label class="pf-field"><span>Ward</span><input name="ward" maxlength="60" value="${esc(a.ward || '')}"></label>
          <label class="pf-field"><span>District</span><input name="district" maxlength="60" value="${esc(a.district || '')}"></label>
          <label class="pf-field"><span>City</span><input name="city" maxlength="60" value="${esc(a.city || '')}"></label>
        </div>
        <p class="pf-error" role="status" aria-live="polite" data-profile-msg></p>
        <button class="btn-outline pf-submit" type="submit">Save</button>
      </form>
    </div>

    <div class="pf-card">
      <h2 class="pf-h2">Your pre-orders</h2>
      ${orders.length ? orders.map(orderCard).join('') : `
        <p class="pf-state">No pre-order yet. Open any piece in the shop and choose <em>Pre-order</em>.</p>
        <p><a class="link link--underlined" href="index.html#drop">Go to the shop</a></p>`}
    </div>

    <p class="pf-actions pf-actions--end"><button type="button" class="btn-outline" data-signout>Sign out</button></p>`;

  root.querySelector('[data-signout]').addEventListener('click', () => signOut(auth));
  root.querySelector('[data-profile-form]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget, msg = form.querySelector('[data-profile-msg]'), btn = form.querySelector('.pf-submit');
    const f = Object.fromEntries(new FormData(form));
    const clean = (k, n) => String(f[k] || '').trim().slice(0, n);
    const gmail = clean('gmail', 120).toLowerCase();
    msg.classList.remove('is-ok');
    if (!gmail) { msg.textContent = 'Please add your Gmail. We send pre-order emails there.'; return; }
    if (!GMAIL_RE.test(gmail)) { msg.textContent = 'That Gmail address does not look right.'; return; }
    btn.disabled = true;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        gmail, phone: clean('phone', 20),
        address: { street: clean('street', 120), ward: clean('ward', 60), district: clean('district', 60), city: clean('city', 60) },
      });
      msg.textContent = 'Saved.'; msg.classList.add('is-ok');
    } catch (ex) { msg.textContent = authMessage(ex); }
    btn.disabled = false;
  });
}

function orderCard(o) {
  return `
    <article class="pf-order">
      <header class="pf-order__head">
        <span>${esc(fmtDate(o.createdAt))}</span>
        <span class="pf-status pf-status--${esc(String(o.status || '').replace(/\s+/g, '-'))}">${esc(titleCase(o.status || 'preordered'))}</span>
      </header>
      <ul class="pf-order__items">${(o.items || []).map((it) => `
        <li><span>${esc(it.title)}${it.color ? ` · ${esc(it.color)}` : ''} · ${esc(it.size)} × ${esc(it.quantity)}</span><span>${esc(fmtVND(it.lineTotal))}</span></li>`).join('')}
      </ul>
      <dl class="pf-sum pf-sum--small">
        <div><dt>Subtotal</dt><dd>${esc(fmtVND(o.subtotal))}</dd></div>
        <div><dt>Shipping</dt><dd>${esc(fmtVND(o.shippingFee))}</dd></div>
        <div class="pf-sum__total"><dt>Total</dt><dd>${esc(fmtVND(o.total))}</dd></div>
      </dl>
      <p class="pf-order__addr">${esc(fmtAddress(o.address))}</p>
    </article>`;
}
