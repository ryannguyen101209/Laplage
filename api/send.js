/* LA PLAGE · email sender (Vercel serverless function, uses Resend).
   The browser never sees the Resend key and never chooses the text or recipients: it only says WHAT happened
   ("order X was placed", "message token Y was updated"). This function reads that record from Firestore with the
   caller's own permissions, checks it is brand new, and builds the emails itself.

   Vercel → Project → Settings → Environment Variables. Use ONE of these two ways to send:
     A) Gmail (no domain needed):  GMAIL_USER = the LA PLAGE Gmail address,  GMAIL_APP_PASSWORD = its 16-letter app password
     B) Resend:                    RESEND_API_KEY = your key,  FROM_EMAIL = LA PLAGE <hello@yourdomain.com>  (a domain verified in Resend)
     ADMIN_EMAILS     comma-separated inboxes that get new-order and new-message alerts (optional)
   Optional: FIREBASE_PROJECT_ID and FIREBASE_API_KEY (default to the values below). */

const PROJECT = process.env.FIREBASE_PROJECT_ID || 'la-plage-e7af7';
const WEB_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyBlJJkAw5ddTTeYBji3bUbnNkapG-XEXU8';
const FRESH_MS = 15 * 60 * 1000;   // only things that just happened can trigger an email
const seen = new Map();            // best-effort "send once" memory while the function stays warm

const admins = () => String(process.env.ADMIN_EMAILS || 'lookmanfc@gmail.com,ryannguyen101209@gmail.com,yosuke6eguchi@gmail.com').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
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
  return u ? { uid: u.localId, email: String(u.email || '').toLowerCase(), verified: u.emailVerified === true } : null;
};

const mail = async ({ to, subject, text, link, linkLabel, replyTo }) => {
  const siteBase = process.env.SITE_URL || 'https://laplage.store';
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#EFE6D6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EFE6D6;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FBF8F2;border:1px solid #E2D6BF;">
<tr><td align="center" style="padding:34px 32px 6px;">
  <img src="${siteBase}/assets/brand/mark.png" width="48" alt="LA PLAGE" style="display:block;border:0;height:auto;">
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:18px;letter-spacing:7px;color:#0B2C47;margin-top:12px;padding-left:7px;">LA PLAGE</div>
  <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;color:#8A6A45;margin-top:5px;">Dressed for the tide.</div>
</td></tr>
<tr><td style="padding:10px 32px 0;"><div style="border-top:1px solid #C7A272;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
<tr><td style="padding:24px 40px 6px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.75;color:#0B2C47;"><div style="white-space:pre-wrap">${esc(text)}</div></td></tr>
${link ? `<tr><td align="center" style="padding:20px 40px 8px;"><a href="${esc(link)}" style="display:inline-block;background:#0B2C47;color:#FBF8F2;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:3px;padding:15px 30px;">${esc(String(linkLabel || 'Open').toUpperCase())}</a></td></tr>` : ''}
<tr><td align="center" style="padding:26px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#8A8A8A;">10% of our profit goes to Saigon Xanh.<br><a href="${siteBase}" style="color:#2B7BB6;text-decoration:none;">laplage.store</a> &middot; Instagram <a href="https://instagram.com/laplage.vn" style="color:#2B7BB6;text-decoration:none;">@laplage.vn</a></td></tr>
</table></td></tr></table></body></html>`;
  const plain = link ? `${text}\n\n${link}` : text;
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    const nodemailer = require('nodemailer');
    const tx = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });
    await tx.sendMail({ from: `LA PLAGE <${process.env.GMAIL_USER}>`, to: Array.isArray(to) ? to.join(', ') : to, subject, text: plain, html, ...(replyTo ? { replyTo } : {}) });
    return;
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.FROM_EMAIL, to: Array.isArray(to) ? to : [to], subject, text: plain, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
};
const once = (key) => { if (seen.has(key)) return false; seen.set(key, Date.now()); if (seen.size > 500) seen.delete(seen.keys().next().value); return true; };

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const gmailOn = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD, resendOn = process.env.RESEND_API_KEY && process.env.FROM_EMAIL;
  if (!gmailOn && !resendOn) return res.status(503).json({ error: 'Email is not configured' });
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
      const pay = { bank: 'Bank transfer', qr: 'QR code', cash: 'Cash' }[o.payment] || '-';
      const code = `LP-${id.slice(0, 6).toUpperCase()}`;
      const plainName = String(o.customerName || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/[^A-Za-z ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
      const howToPay = o.payment === 'cash'
        ? 'HOW TO PAY\nPay in cash, in person. We will contact you to arrange where and when to meet.'
        : `HOW TO PAY\nBank: VietinBank - CN Tan Binh - PGD Bau Cat\nAccount name: NGUYEN MINH HY\nAccount number: 105600101209\nAmount: ${vnd(o.total)}\nTransfer note: ${code} ${plainName}\n(You can also scan the QR code on your account page.)`;
      const sums = `Payment: ${pay}\nSubtotal: ${vnd(o.subtotal)}${o.discount ? `\nTwo-piece price: -${vnd(o.discount)}` : ''}\nShipping: ${o.shippingFee ? vnd(o.shippingFee) : 'Free'}\nTotal: ${vnd(o.total)}`;
      await Promise.all([
        mail({ to: admins(), replyTo: o.gmail, subject: `New pre-order from ${o.customerName} · ${vnd(o.total)}`, link: `${base}/admin.html#orders`, linkLabel: 'Open admin',
          text: `New pre-order ${id} (order no. LP-${id.slice(0, 6).toUpperCase()})\n\nCustomer: ${o.customerName} (@${o.username})\nEmail: ${o.gmail}   Phone: ${o.phone}\nShip to: ${addr}\n\n${lines}\n\n${sums}\nNote: ${o.note || '-'}` }),
        mail({ to: o.gmail, subject: `Thank you for your order · ${code}`, link: `${base}/account.html`, linkLabel: 'Pay and follow your order',
          text: `Hello ${o.customerName},\n\nThank you for your order. It is now in our queue, and we start on it as soon as your payment arrives.\n\nOrder number: ${code}\n\n${lines}\n\n${sums}\nShip to: ${addr}\n\n${howToPay}` }),
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

    /* the admin panel's "Send test email to me" button: a real styled email to the signed-in admin */
    if (b.type === 'test') {
      const me = await whoIs(String(b.idToken || ''));
      if (!me || !me.verified || !admins().includes(me.email)) return res.status(403).json({ error: 'Admins only' });
      await mail({ to: me.email, subject: 'Test · LA PLAGE emails are working', link: `${base}/admin.html#orders`, linkLabel: 'Open the admin panel',
        text: 'Hello,\n\nThis is a test email from your LA PLAGE website.\n\nIf you can read this, customers will receive their order and status emails the same way.' });
      return res.status(200).json({ ok: true, sent: true });
    }

    /* "Mark as paid" in the admin panel: always tell the customer their payment arrived */
    if (b.type === 'paid') {
      const me = await whoIs(String(b.idToken || ''));
      if (!me || !me.verified || !admins().includes(me.email)) return res.status(403).json({ error: 'Admins only' });
      const id = String(b.orderId || '').replace(/[^A-Za-z0-9]/g, '');
      const o = await getDoc(`orders/${id}`, b.idToken);
      if (!o || o.paid !== true || !o.paidAt || Date.now() - o.paidAt > FRESH_MS) return res.status(403).json({ error: 'This order was not just marked as paid' });
      const code = `LP-${id.slice(0, 6).toUpperCase()}`;
      const first = String(o.customerName || '').trim() || 'there';
      if (!once(`paid:${id}:${o.paidAt}`)) return res.status(200).json({ ok: true, duplicate: true });
      const more = o.status === 'in process' ? '\n\nYour order is now in process, and we are getting started on it.' : '\n\nYou can follow your order any time in your account.';
      await mail({ to: o.gmail, subject: `Payment received · ${code}`, link: `${base}/account.html`, linkLabel: 'View your order', text: `Hello ${first},\n\nWe have received your payment for order ${code}. Thank you so much!${more}` });
      return res.status(200).json({ ok: true, sent: true });
    }

    /* an admin changed an order's status: tell the customer (payment received, being packed, shipped, delivered, cancelled) */
    if (b.type === 'status') {
      const me = await whoIs(String(b.idToken || ''));
      if (!me || !me.verified || !admins().includes(me.email)) return res.status(403).json({ error: 'Admins only' });
      const id = String(b.orderId || '').replace(/[^A-Za-z0-9]/g, '');
      const o = await getDoc(`orders/${id}`, b.idToken);
      if (!o || !o.updatedAt || Date.now() - o.updatedAt > FRESH_MS) return res.status(403).json({ error: 'No recent change to send' });
      const code = `LP-${id.slice(0, 6).toUpperCase()}`;
      const first = String(o.customerName || '').trim() || 'there';
      const msgs = {
        'in process': ['Payment received', `We have received your payment for order ${code}. Thank you so much!\n\nYour order is now in process, and we are getting started on it.`],
        packaging: ['Your order is being packed', `Good news: order ${code} is being packed now, with care.`],
        shipped: ['Your order has shipped', `Order ${code} is on its way to you.\n\nIf you have any question about it, write to us from the contact page.`],
        delivered: ['Your order was delivered', `Order ${code} is marked as delivered. We hope you love it.\n\nWe would be so happy to see how you wear it. Tag us @laplage.vn.`],
        cancelled: ['Your order was cancelled', `Order ${code} has been cancelled.\n\nIf you did not expect this, please write to us from the contact page and we will help.`],
      };
      const m = msgs[o.status];
      if (!m) return res.status(200).json({ ok: true, skipped: 'no email for this status' });
      if (!once(`status:${id}:${o.status}:${o.updatedAt}`)) return res.status(200).json({ ok: true, duplicate: true });
      await mail({ to: o.gmail, subject: `${m[0]} · ${code}`, link: `${base}/account.html`, linkLabel: 'View your order', text: `Hello ${first},\n\n${m[1]}` });
      return res.status(200).json({ ok: true, sent: true });
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
    const adminType = ['status', 'paid', 'test', 'reply'].includes(b.type);
    return res.status(500).json({ error: 'Could not send', ...(adminType ? { detail: String((e && e.message) || e).replace(/pass(word)?[^ ]*/gi, '***').slice(0, 220) } : {}) });
  }
}
