/* LA PLAGE · contact. A customer writes a message (stored in Firestore, shown in the admin panel's Messages tab);
   the admins answer there, and the reply appears on the customer's private thread page (?t=TOKEN).
   Nothing goes through a personal inbox. */
import { isConfigured, db, esc, doc, getDoc, setDoc, updateDoc, serverTimestamp } from './firebase.js';
import { newToken } from './mailing.js';
import { notifyAdmins } from './notify.js';
import { sendContactEmails, notifyNewCustomerMessage } from './emails.js';

const root = document.querySelector('[data-contact]');
const card = (html) => { root.innerHTML = `<div class="pf-card pf-card--narrow">${html}</div>`; };
const TOPICS = { general: 'A general question', unsubscribe: 'Help with unsubscribing', preorder: 'Pre-orders', order: 'An order I placed', other: 'Something else' };
const params = new URLSearchParams(location.search);
const token = params.get('t') || '';
const KEY = 'laplage-threads';
const saved = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
const remember = (t, name) => { try { const l = saved().filter((x) => x.t !== t); l.unshift({ t, name, at: Date.now() }); localStorage.setItem(KEY, JSON.stringify(l.slice(0, 8))); } catch (e) { /* private mode */ } };
const when = (ms) => new Date(ms).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function drawForm(note = '') {
  const pre = TOPICS[params.get('topic')] ? params.get('topic') : 'general';
  const mine = saved();
  card(`
    <p class="label">Contact</p>
    <h1 class="pf-title">Write <em>to us.</em></h1>
    <p class="pf-lead">Send us a message and we will answer here, on your own private page. No email needed to read the reply.</p>
    ${note ? `<p class="pf-hint">${esc(note)}</p>` : ''}
    <form class="pf-form" novalidate data-contact-form>
      <label class="pf-field"><span>Your name</span><input name="name" autocomplete="name" required maxlength="80"></label>
      <label class="pf-field"><span>Email <em>so we can also let you know when we reply</em></span><input name="email" type="email" inputmode="email" autocomplete="email" required maxlength="120"></label>
      <label class="pf-field"><span>About</span><select name="topic">${Object.entries(TOPICS).map(([k, v]) => `<option value="${k}"${k === pre ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
      <label class="pf-field"><span>Message</span><textarea name="text" rows="6" maxlength="2000" required></textarea></label>
      <div class="access__trap" aria-hidden="true"><label>Leave this empty <input type="text" name="company" tabindex="-1" autocomplete="off"></label></div>
      <p class="pf-hint">We use your details only to answer you. See the <a class="link link--underlined" href="privacy.html">Privacy Policy</a>.</p>
      <p class="pf-error" role="alert" data-err></p>
      <button class="btn-outline pf-submit" type="submit">Send message</button>
    </form>
    ${mine.length ? `<p class="pf-hint" style="margin-top:22px">Your earlier conversations on this device:</p>
      <ul class="pf-threads">${mine.map((x) => `<li><a class="link link--underlined" href="contact.html?t=${esc(x.t)}">${esc(x.name || 'Conversation')} · ${esc(when(x.at))}</a></li>`).join('')}</ul>` : ''}`);
  const form = root.querySelector('[data-contact-form]'), err = root.querySelector('[data-err]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const name = String(f.name || '').trim().slice(0, 80), email = String(f.email || '').trim().toLowerCase().slice(0, 120), text = String(f.text || '').trim().slice(0, 2000);
    err.textContent = '';
    if (!name) { err.textContent = 'Please add your name.'; return; }
    if (!EMAIL_RE.test(email)) { err.textContent = 'Please add a valid email address.'; return; }
    if (!text) { err.textContent = 'Please write a message.'; return; }
    if (f.company) { drawForm('Thank you. Your message was sent.'); return; }   // a bot filled the hidden field
    const btn = form.querySelector('button[type="submit"]'); btn.disabled = true;
    const t = newToken();
    try {
      await setDoc(doc(db, 'messages', t), {
        name, email, topic: TOPICS[f.topic] ? f.topic : 'general', status: 'open', unreadAdmin: true,
        thread: [{ from: 'customer', text, at: Date.now() }],
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
    } catch (ex) { err.textContent = 'We could not send your message. Please check your connection and try again.'; btn.disabled = false; return; }
    remember(t, name);
    notifyAdmins({ title: `New message · ${name}`, message: text, path: '/admin.html#messages', tags: ['speech_balloon'] });
    sendContactEmails({ name, email, topic: TOPICS[f.topic] || 'General', text, token: t }).catch(() => {});
    history.replaceState(null, '', `contact.html?t=${t}`);
    load(t, 'Your message was sent. Keep this page (bookmark it): our answer will appear here.');
  });
}

async function load(t, note = '') {
  let m = null;
  try { const snap = await getDoc(doc(db, 'messages', t)); m = snap.exists() ? snap.data() : null; }
  catch (e) { card('<p class="pf-state">We could not load this conversation. Please refresh.</p>'); return; }
  if (!m) { drawForm('That conversation link was not found. You can send us a new message below.'); return; }
  remember(t, m.name);
  const thread = m.thread || [];
  card(`
    <p class="label">${esc(TOPICS[m.topic] || 'Contact')}</p>
    <h1 class="pf-title">Your <em>conversation.</em></h1>
    ${note ? `<p class="pf-hint">${esc(note)}</p>` : ''}
    <ol class="ct-thread">${thread.map((x) => `
      <li class="ct-msg ct-msg--${x.from === 'admin' ? 'us' : 'you'}"><p class="ct-msg__who">${x.from === 'admin' ? 'LA PLAGE' : esc(m.name)} · ${esc(when(x.at))}</p><p class="ct-msg__text">${esc(x.text)}</p></li>`).join('')}</ol>
    ${m.status === 'closed' ? '<p class="pf-hint">This conversation is closed. Send another message below to reopen it.</p>' : ''}
    <form class="pf-form" novalidate data-reply-form>
      <label class="pf-field"><span>Write back</span><textarea name="text" rows="4" maxlength="2000" required></textarea></label>
      <p class="pf-error" role="alert" data-err></p>
      <button class="btn-outline pf-submit" type="submit">Send</button>
    </form>
    <p class="pf-hint" style="margin-top:18px"><a class="link link--underlined" href="contact.html">Start a new conversation</a></p>`);
  const form = root.querySelector('[data-reply-form]'), err = root.querySelector('[data-err]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = String(new FormData(form).get('text') || '').trim().slice(0, 2000);
    if (!text) { err.textContent = 'Please write a message.'; return; }
    const btn = form.querySelector('button[type="submit"]'); btn.disabled = true;
    try {
      await updateDoc(doc(db, 'messages', t), {
        thread: [...thread, { from: 'customer', text, at: Date.now() }], unreadAdmin: true, status: 'open', updatedAt: serverTimestamp(),
      });
    } catch (ex) { err.textContent = 'We could not send that. Please try again.'; btn.disabled = false; return; }
    notifyAdmins({ title: `New message · ${m.name}`, message: text, path: '/admin.html#messages', tags: ['speech_balloon'] });
    notifyNewCustomerMessage({ name: m.name, email: m.email, text, token: t });
    load(t, 'Sent.');
  });
}

if (!isConfigured) card('<p class="pf-state">Messages are not available yet. Please try again soon.</p>');
else if (/^[a-f0-9]{32,64}$/.test(token)) { load(token); setInterval(() => { if (document.visibilityState === 'visible' && !root.querySelector('textarea:focus')) load(token); }, 30000); }
else drawForm();
