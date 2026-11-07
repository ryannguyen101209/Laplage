/* LA PLAGE · admin panel. The page only checks the admin list to decide what to show;
   the real protection is firestore.rules, which refuses every admin read and write to anyone else. */
import {
  isConfigured, auth, db, STATUSES, esc, fmtVND, fmtDate, fmtAddress, titleCase, authMessage, isAdminUser, loadProducts,
  onAuthStateChanged, signOut, doc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp,
} from './firebase.js';
import { renderAuthForm } from './auth-form.js';

const root = document.querySelector('[data-admin]');
const state = (html) => { root.innerHTML = `<div class="pf-card pf-card--narrow"><p class="pf-state">${html}</p></div>`; };

let users = [], orders = [], products = [], tab = 'overview';
const view = { q: '', sort: 'newest', status: 'all', oq: '' };

if (!isConfigured) {
  state('The admin panel is not set up yet. Fill in firebase-config.js first.');
} else {
  state('Loading…');
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      root.innerHTML = '<div class="pf-card pf-card--narrow"><h1 class="pf-title">Admin <em>sign in.</em></h1><div data-auth></div></div>';
      renderAuthForm(root.querySelector('[data-auth]'), { adminOnly: true });
      return;
    }
    if (!isAdminUser(user)) {
      root.innerHTML = `<div class="pf-card pf-card--narrow"><p class="pf-state">This account does not have admin access.</p>
        <p class="pf-actions"><a class="link link--underlined" href="index.html">Back to LA PLAGE</a> <button type="button" class="ui-btn link" data-signout>Sign out</button></p></div>`;
      root.querySelector('[data-signout]').addEventListener('click', () => signOut(auth));
      return;
    }
    await load(user);
  });
}

async function load(user) {
  state('Loading accounts and pre-orders…');
  try {
    const [u, o, p] = await Promise.all([getDocs(collection(db, 'users')), getDocs(collection(db, 'orders')), loadProducts({ includeHidden: true }).catch(() => [])]);
    products = p;
    users = u.docs.map((d) => ({ id: d.id, ...d.data() }));
    orders = o.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    state(`Could not load the data. ${esc(authMessage(e))} If this persists, check that firestore.rules has your admin Gmail.`);
    return;
  }
  shell(user);
}

const ts = (t) => (t && t.seconds) || 0;
const ordersOf = (uid) => orders.filter((o) => o.uid === uid);
const accountStatus = (uid) => (ordersOf(uid).some((o) => o.status !== 'cancelled') ? 'Preordered' : 'No pre-order yet');

function shell(user) {
  root.innerHTML = `
    <div class="pf-adminbar">
      <div>
        <p class="label">The bridge · ${esc(user.email)}</p>
        <h1 class="pf-title">${esc(greeting())}<em> Here is the tide.</em></h1>
        <p class="adm-date">${esc(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Ho_Chi_Minh' }))} · Saigon</p>
      </div>
      <button type="button" class="ui-btn link" data-signout>Sign out</button>
    </div>
    <div class="pf-tabs" role="tablist">
      <button type="button" role="tab" class="pf-tab" data-tab="overview">Tide report</button>
      <button type="button" role="tab" class="pf-tab" data-tab="accounts">Accounts <span data-count-accounts></span></button>
      <button type="button" role="tab" class="pf-tab" data-tab="orders">Pre-orders <span data-count-orders></span></button>
    </div>
    <div data-panel></div>`;
  root.querySelector('[data-signout]').addEventListener('click', () => signOut(auth));
  root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; draw(); }));
  draw();
}

function draw() {
  root.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  root.querySelector('[data-count-accounts]').textContent = `(${users.length})`;
  root.querySelector('[data-count-orders]').textContent = `(${orders.length})`;
  const panel = root.querySelector('[data-panel]');
  if (tab === 'overview') drawOverview(panel);
  else if (tab === 'accounts') drawAccounts(panel);
  else drawOrders(panel);
}

/* ---------------- Tide report: the shop at a glance ---------------- */
function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }));
  return h < 12 ? 'Good morning.' : h < 18 ? 'Good afternoon.' : 'Good evening.';
}
const live = (o) => o.status !== 'cancelled';
const toMake = (o) => o.status === 'preordered' || o.status === 'in production';
const qtyOf = (o) => (o.items || []).reduce((n, it) => n + (Number(it.quantity) || 0), 0);

function drawOverview(panel) {
  const open = orders.filter((o) => toMake(o) || o.status === 'shipped');
  const pieces = orders.filter(toMake).reduce((n, o) => n + qtyOf(o), 0);
  const value = orders.filter(live).reduce((n, o) => n + (Number(o.total) || 0), 0);
  const weekAgo = Date.now() / 1000 - 7 * 86400;
  const newUsers = users.filter((u) => ts(u.createdAt) > weekAgo).length;
  const count = (s) => orders.filter((o) => o.status === s).length;

  // what to make: every piece in pre-orders not yet made, by size
  const board = new Map();
  // a piece made in more than one colour gets a row per colour, since each is cut from its own fabric
  const multi = (id) => ((products.find((x) => x.id === id) || {}).colors || []).length > 1;
  orders.filter(toMake).forEach((o) => (o.items || []).forEach((it) => {
    const tone = multi(it.productId) ? (it.color || '') : '';
    const key = `${it.productId}|${tone}`;
    const row = board.get(key) || { id: it.productId, tone, title: tone ? `${it.title} · ${tone}` : it.title, total: 0, sizes: {} };
    row.total += Number(it.quantity) || 0;
    row.sizes[it.size] = (row.sizes[it.size] || 0) + (Number(it.quantity) || 0);
    board.set(key, row);
  }));
  const rows = [...board.values()].sort((a, b) => b.total - a.total);
  const most = Math.max(1, ...rows.map((r) => r.total));
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const cutout = (id, tone) => {
    const p = products.find((x) => x.id === id); if (!p) return '';
    const c = (p.colors || []).find((x) => x.name === tone);
    return (c && c.cutout) || p.cutout || p.image.src;
  };
  const recent = [...orders].sort((a, b) => ts(b.createdAt) - ts(a.createdAt)).slice(0, 6);

  panel.innerHTML = `
    <section class="adm-stats" aria-label="At a glance">
      <div class="adm-stat"><p class="adm-stat__label">Open pre-orders</p><p class="adm-stat__value">${open.length}</p><p class="adm-stat__sub">not yet delivered</p></div>
      <div class="adm-stat"><p class="adm-stat__label">Pieces to make</p><p class="adm-stat__value">${pieces}</p><p class="adm-stat__sub">for the next batch</p></div>
      <div class="adm-stat adm-stat--gold"><p class="adm-stat__label">Pre-order value</p><p class="adm-stat__value">${esc(fmtVND(value))}</p><p class="adm-stat__sub">incl. shipping, excl. cancelled</p></div>
      <div class="adm-stat"><p class="adm-stat__label">Accounts</p><p class="adm-stat__value">${users.length}</p><p class="adm-stat__sub">${newUsers} new this week</p></div>
    </section>

    <section class="adm-card" aria-labelledby="adm-pipe">
      <h2 class="adm-h" id="adm-pipe">The voyage <span>every pre-order, stage by stage</span></h2>
      <ol class="adm-pipe">
        ${STATUSES.map((st, i) => `
          <li><button type="button" class="adm-stage adm-stage--${i}" data-goto="${esc(st)}" aria-label="${esc(titleCase(st))}: ${count(st)}. Show these pre-orders">
            <span class="adm-stage__n">${count(st)}</span><span class="adm-stage__l">${esc(titleCase(st))}</span>
          </button></li>`).join('')}
      </ol>
    </section>

    <div class="adm-split">
      <section class="adm-card" aria-labelledby="adm-make">
        <h2 class="adm-h" id="adm-make">To make <span>pre-ordered and in production, by size</span></h2>
        ${rows.length ? `<ul class="adm-board">${rows.map((r) => `
          <li class="adm-board__row">
            ${cutout(r.id, r.tone) ? `<img src="${esc(cutout(r.id, r.tone))}" alt="" loading="lazy">` : '<span class="adm-board__ph"></span>'}
            <div class="adm-board__main">
              <p class="adm-board__name">${esc(r.title)} <span>${r.total} ${r.total === 1 ? 'piece' : 'pieces'}</span></p>
              <span class="adm-board__bar" title="${r.total} pieces"><span style="width:${(r.total / most * 100).toFixed(1)}%"></span></span>
              <p class="adm-board__sizes">${Object.keys(r.sizes).sort((a, b) => sizeOrder.indexOf(a) - sizeOrder.indexOf(b)).map((sz) => `<span><b>${esc(sz)}</b> ${r.sizes[sz]}</span>`).join('')}</p>
            </div>
          </li>`).join('')}</ul>` : '<p class="pf-state">Nothing to make yet. Pre-orders will gather here, piece by piece.</p>'}
      </section>

      <section class="adm-card" aria-labelledby="adm-recent">
        <h2 class="adm-h" id="adm-recent">Latest arrivals <span>newest pre-orders</span></h2>
        ${recent.length ? `<ul class="adm-recent">${recent.map((o) => `
          <li><button type="button" class="adm-recent__row" data-goto="all">
            <span class="adm-recent__who">${esc(o.customerName)}<small>${esc(fmtDate(o.createdAt))} · ${qtyOf(o)} ${qtyOf(o) === 1 ? 'piece' : 'pieces'}</small></span>
            <span class="adm-recent__amt">${esc(fmtVND(o.total))}<small class="adm-dot adm-dot--${STATUSES.indexOf(o.status)}">${esc(titleCase(o.status || ''))}</small></span>
          </button></li>`).join('')}</ul>` : '<p class="pf-state">The shore is quiet. New pre-orders will wash up here.</p>'}
      </section>
    </div>`;
  panel.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => { view.status = b.dataset.goto; tab = 'orders'; draw(); }));
}

/* ---------------- Accounts ---------------- */
function drawAccounts(panel) {
  panel.innerHTML = `
    <div class="pf-toolbar">
      <label class="pf-field pf-field--grow"><span>Search</span><input type="search" data-q placeholder="Name, username or Gmail" value="${esc(view.q)}"></label>
      <label class="pf-field"><span>Sort</span><select data-sort>
        ${[['newest', 'Newest first'], ['oldest', 'Oldest first'], ['name', 'Name A–Z'], ['orders', 'Most pre-orders']].map(([v, l]) => `<option value="${v}"${view.sort === v ? ' selected' : ''}>${l}</option>`).join('')}
      </select></label>
    </div>
    <div data-list></div>`;
  const list = panel.querySelector('[data-list]');
  const paint = () => {
    const q = view.q.trim().toLowerCase();
    let rows = users.filter((u) => !q || [u.name, u.username, u.gmail].some((v) => String(v || '').toLowerCase().includes(q)));
    const by = {
      newest: (a, b) => ts(b.createdAt) - ts(a.createdAt),
      oldest: (a, b) => ts(a.createdAt) - ts(b.createdAt),
      name: (a, b) => String(a.name || '').localeCompare(String(b.name || '')),
      orders: (a, b) => ordersOf(b.id).length - ordersOf(a.id).length,
    }[view.sort];
    rows = rows.sort(by);
    if (!users.length) { list.innerHTML = '<p class="pf-state">No accounts yet.</p>'; return; }
    if (!rows.length) { list.innerHTML = '<p class="pf-state">No accounts match that search.</p>'; return; }
    list.innerHTML = `
      <table class="pf-table">
        <thead><tr><th>Name</th><th>Gmail</th><th>Joined</th><th>Status</th><th>Pre-orders</th><th><span class="visually-hidden">Actions</span></th></tr></thead>
        <tbody>${rows.map((u) => `
          <tr class="${u.disabled ? 'is-disabled' : ''}">
            <td data-label="Name">${esc(u.name || '—')}<small>@${esc(u.username || '')}</small></td>
            <td data-label="Gmail">${esc(u.gmail || '—')}</td>
            <td data-label="Joined">${esc(fmtDate(u.createdAt))}</td>
            <td data-label="Status"><span class="pf-badge${accountStatus(u.id) === 'Preordered' ? ' is-on' : ''}">${esc(accountStatus(u.id))}</span>${u.disabled ? '<span class="pf-badge is-off">Disabled</span>' : ''}</td>
            <td data-label="Pre-orders">${ordersOf(u.id).length}</td>
            <td class="pf-table__actions">
              <button type="button" class="ui-btn link" data-toggle="${esc(u.id)}">${u.disabled ? 'Enable' : 'Disable'}</button>
              <button type="button" class="ui-btn link pf-danger" data-delete="${esc(u.id)}">Delete</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  };
  panel.querySelector('[data-q]').addEventListener('input', (e) => { view.q = e.target.value; paint(); });
  panel.querySelector('[data-sort]').addEventListener('change', (e) => { view.sort = e.target.value; paint(); });
  list.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-toggle]'), d = e.target.closest('[data-delete]');
    if (t) {
      const u = users.find((x) => x.id === t.dataset.toggle);
      t.disabled = true;
      try { await updateDoc(doc(db, 'users', u.id), { disabled: !u.disabled }); u.disabled = !u.disabled; paint(); }
      catch (ex) { alert(authMessage(ex)); t.disabled = false; }
    }
    if (d) {
      const u = users.find((x) => x.id === d.dataset.delete);
      if (!confirm(`Delete the account record for ${u.name || u.username}?\n\nTheir pre-orders stay in the Orders tab. They will no longer be able to sign in to the site.`)) return;
      d.disabled = true;
      try { await deleteDoc(doc(db, 'users', u.id)); users = users.filter((x) => x.id !== u.id); draw(); }
      catch (ex) { alert(authMessage(ex)); d.disabled = false; }
    }
  });
  paint();
}

/* ---------------- Pre-orders ---------------- */
const filteredOrders = () => {
  const q = view.oq.trim().toLowerCase();
  return orders
    .filter((o) => view.status === 'all' || o.status === view.status)
    .filter((o) => !q || [o.customerName, o.phone, o.username, fmtAddress(o.address)].some((v) => String(v || '').toLowerCase().includes(q)))
    .sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
};

function drawOrders(panel) {
  panel.innerHTML = `
    <div class="pf-toolbar">
      <label class="pf-field pf-field--grow"><span>Search</span><input type="search" data-oq placeholder="Customer, phone or address" value="${esc(view.oq)}"></label>
      <label class="pf-field"><span>Status</span><select data-status>
        <option value="all">All</option>${STATUSES.map((s) => `<option value="${esc(s)}"${view.status === s ? ' selected' : ''}>${esc(titleCase(s))}</option>`).join('')}
      </select></label>
      <button type="button" class="btn-outline pf-export" data-export>Export CSV</button>
    </div>
    <div data-list></div>`;
  const list = panel.querySelector('[data-list]');
  const paint = () => {
    const rows = filteredOrders();
    if (!orders.length) { list.innerHTML = '<p class="pf-state">No pre-orders yet.</p>'; return; }
    if (!rows.length) { list.innerHTML = '<p class="pf-state">No pre-orders match these filters.</p>'; return; }
    list.innerHTML = `
      <table class="pf-table pf-table--orders">
        <thead><tr><th>Date</th><th>Customer</th><th>Shipping address</th><th>Pieces</th><th>Subtotal</th><th>Shipping</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>${rows.map((o) => `
          <tr>
            <td data-label="Date">${esc(fmtDate(o.createdAt))}</td>
            <td data-label="Customer">${esc(o.customerName)}<small>${esc(o.phone)}${o.gmail ? ` · ${esc(o.gmail)}` : ''}</small></td>
            <td data-label="Address">${esc(fmtAddress(o.address))}${o.note ? `<small>Note: ${esc(o.note)}</small>` : ''}</td>
            <td data-label="Pieces">${(o.items || []).map((it) => `${esc(it.title)}${it.color ? ` · ${esc(it.color)}` : ''} · ${esc(it.size)} × ${esc(it.quantity)}`).join('<br>')}</td>
            <td data-label="Subtotal">${esc(fmtVND(o.subtotal))}</td>
            <td data-label="Shipping">${esc(fmtVND(o.shippingFee))}</td>
            <td data-label="Total"><strong>${esc(fmtVND(o.total))}</strong></td>
            <td data-label="Status"><select class="pf-status-select" data-order="${esc(o.id)}" aria-label="Status for ${esc(o.customerName)}">
              ${STATUSES.map((s) => `<option value="${esc(s)}"${o.status === s ? ' selected' : ''}>${esc(titleCase(s))}</option>`).join('')}
            </select></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  };
  panel.querySelector('[data-oq]').addEventListener('input', (e) => { view.oq = e.target.value; paint(); });
  panel.querySelector('[data-status]').addEventListener('change', (e) => { view.status = e.target.value; paint(); });
  panel.querySelector('[data-export]').addEventListener('click', exportCSV);
  list.addEventListener('change', async (e) => {
    const sel = e.target.closest('[data-order]'); if (!sel) return;
    const o = orders.find((x) => x.id === sel.dataset.order);
    const prev = o.status;
    sel.disabled = true;
    try { await updateDoc(doc(db, 'orders', o.id), { status: sel.value, updatedAt: serverTimestamp() }); o.status = sel.value; }
    catch (ex) { alert(authMessage(ex)); sel.value = prev; }
    sel.disabled = false;
    if (view.status !== 'all') paint();
  });
  paint();
}

function exportCSV() {
  // quote every cell, and neutralise values a spreadsheet would treat as a formula
  const cell = (v) => {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const head = ['Order ID', 'Date', 'Customer', 'Username', 'Phone', 'Gmail', 'Street', 'Ward', 'District', 'City', 'Pieces', 'Subtotal (VND)', 'Shipping (VND)', 'Total (VND)', 'Status', 'Note'];
  const rows = filteredOrders().map((o) => {
    const a = o.address || {};
    const d = o.createdAt && o.createdAt.toDate ? o.createdAt.toDate().toISOString().slice(0, 10) : '';
    return [o.id, d, o.customerName, o.username, o.phone, o.gmail, a.street, a.ward, a.district, a.city,
      (o.items || []).map((it) => `${it.title}${it.color ? ` - ${it.color}` : ''} (${it.size}) x${it.quantity}`).join('; '),
      o.subtotal, o.shippingFee, o.total, o.status, o.note];
  });
  const csv = '﻿' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = `la-plage-preorders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
