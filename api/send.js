/* LA PLAGE · email sender (Vercel serverless function, uses Resend).
   The browser never sees the Resend key and never chooses the text or recipients: it only says WHAT happened
   ("order X was placed", "message token Y was updated"). This function reads that record from Firestore with the
   caller's own permissions, checks it is brand new, and builds the emails itself.

   Vercel → Project → Settings → Environment Variables:
     RESEND_API_KEY   your Resend API key
     FROM_EMAIL       e.g.  LA PLAGE <hello@yourdomain.com>   (a domain verified in Resend)
     ADMIN_EMAILS     comma-separated inboxes that get new-order and new-message alerts
   Optional: FIREBASE_PROJECT_ID and FIREBASE_API_KEY (default to the values below). */

const PROJECT = process.env.FIREBASE_PROJECT_ID || 'la-plage-e7af7';
const WEB_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyBlJJkAw5ddTTeYBji3bUbnNkapG-XEXU8';
const FRESH_MS = 15 * 60 * 1000;   // only things that just happened can trigger an email
const seen = new Map();            // best-effort "send once" memory while the function stays warm

const admins = () => String(process.env.ADMIN_EMAILS || 'lookmanfc@gmail.com,ryannguyen101209@gmail.com').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
const vnd = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(n) || 0);
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Firestore REST returns typed values; turn them into plain JS
const dec = (v) => {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return Date.parse(v.timestampValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, dec(x)]));
  return null;
};
const getDoc = async (path, idToken) => {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, idToken ? { headers: { Authorization: `Bearer ${idToken}` } } : {});
  if (!r.ok) return null;
  const j = await r.json();
  return Object.fromEntries(Object.entries(j.fields || {}).map(([k, v]) => [k, dec(v)]));
};
const whoIs = async (idToken) => {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${WEB_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
  if (!r.ok) return null;
  const j = await r.json(); const u = (j.users || [])[0];
  return u ? { uid: u.localId, email: String(u.email || '').toLowerCase() } : null;
};

const mail = async ({ to, subject, text, link, linkLabel, replyTo }) => {
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#0b2a44;max-width:560px">
    <div style="white-space:pre-wrap">${esc(text)}</div>
    ${link ? `<p style="margin-top:22px"><a href="${esc(link)}" style="background:#0b2a44;color:#fff;padding:11px 20px;text-decoration:none;border-radius:4px;display:inline-block">${esc(linkLabel || 'Open')}</a></p>` : ''}
    <p style="margin-top:28px;font-size:12px;color:#7a8b98">LA PLAGE · Made in Vietnam</p></div>`;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.FROM_EMAIL, to: Array.isArray(to) ? to : [to], subject, text: link ? `${text}\n\n${link}` : text, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
};
const once = (key) => { if (seen.has(key)) return false; seen.set(key, Date.now()); if (seen.size > 500) seen.delete(seen.keys().next().value); return true; };

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) return res.status(503).json({ error: 'Email is not configured' });
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  if (origin && !origin.endsWith('//' + host)) return res.status(403).json({ error: 'Bad origin' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const base = `https://${host}`;
  try {
    /* a new pre-order: full details to the admins, a confirmation to the customer */
    if (b.type === 'order') {
      const me = await whoIs(String(b.idToken || '')); if (!me) return res.status(401).json({ error: 'Sign in required' });
      const id = String(b.orderId || '').replace(/[^A-Za-z0-9]/g, '');
      const o = await getDoc(`orders/${id}`, b.idToken);
      if (!o || o.uid !== me.uid || Date.now() - o.createdAt > FRESH_MS) return res.status(403).json({ error: 'Not a new order of yours' });
      if (!once('order:' + id)) return res.status(200).json({ ok: true, duplicate: true });
      const addr = [o.address.street, o.address.ward, o.address.district, o.address.city].filter(Boolean).join(', ');
      const lines = o.items.map((it) => `${it.title}${it.color ? ` · ${it.color}` : ''} · size ${it.size} × ${it.quantity} = ${vnd(it.lineTotal)}`).join('\n');
      const sums = `Subtotal: ${vnd(o.subtotal)}\nShipping: ${vnd(o.shippingFee)}\nTotal: ${vnd(o.total)}`;
      await Promise.all([
        mail({ to: admins(), replyTo: o.gmail, subject: `New pre-order from ${o.customerName} · ${vnd(o.total)}`, link: `${base}/admin.html#orders`, linkLabel: 'Open admin',
          text: `New pre-order ${id}\n\nCustomer: ${o.customerName} (@${o.username})\nEmail: ${o.gmail}   Phone: ${o.phone}\nShip to: ${addr}\n\n${lines}\n\n${sums}\nNote: ${o.note || '-'}` }),
        mail({ to: o.gmail, subject: 'Your LA PLAGE pre-order is in', link: `${base}/account.html`, linkLabel: 'Follow your pre-order',
          text: `Hello ${o.customerName},\n\nThank you for your pre-order. It joins our next production batch. We will be in touch to confirm the details and arrange payment.\n\n${lines}\n\n${sums}\nShip to: ${addr}` }),
      ]);
      return res.status(200).json({ ok: true });
    }

    /* a customer wrote (new conversation or a follow-up): alert the admins */
    if (b.type === 'contact') {
      const token = String(b.token || '');
      if (!/^[a-f0-9]{32,64}$/.test(token)) return res.status(400).json({ error: 'Bad token' });
      const m = await getDoc(`messages/${token}`);
      if (!m || Date.now() - (m.updatedAt || 0) > FRESH_MS) return res.status(403).json({ error: 'Nothing new' });
      const last = m.thread[m.thread.length - 1];
      if (last.from !== 'customer' || !once(`contact:${token}:${last.at}`)) return res.status(200).json({ ok: true, duplicate: true });
      await mail({ to: admins(), replyTo: m.email, subject: `New message from ${m.name}`, link: `${base}/admin.html#messages`, linkLabel: 'Read and reply',
        text: `${m.name} <${m.email}> wrote (${m.topic}):\n\n${last.text}` });
      return res.status(200).json({ ok: true });
    }

    /* an admin replied in Messages: email the customer their private link */
    if (b.type === 'reply') {
      const me = await whoIs(String(b.idToken || ''));
      if (!me || !admins().includes(me.email)) return res.status(403).json({ error: 'Admins only' });
      const token = String(b.token || '');
      if (!/^[a-f0-9]{32,64}$/.test(token)) return res.status(400).json({ error: 'Bad token' });
      const m = await getDoc(`messages/${token}`, b.idToken);
      if (!m || Date.now() - (m.updatedAt || 0) > FRESH_MS) return res.status(403).json({ error: 'Nothing new' });
      const last = m.thread[m.thread.length - 1];
      if (last.from !== 'admin' || !once(`reply:${token}:${last.at}`)) return res.status(200).json({ ok: true, duplicate: true });
      await mail({ to: m.email, subject: 'A reply from LA PLAGE', link: `${base}/contact.html?t=${token}`, linkLabel: 'Read and answer',
        text: `Hello ${m.name},\n\n${last.text}` });
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: 'Unknown type' });
  } catch (e) {
    console.error('[send]', e);
    return res.status(500).json({ error: 'Could not send' });
  }
}
