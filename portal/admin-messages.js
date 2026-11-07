/* LA PLAGE · admin "Messages": customer conversations from the contact page. Live (Firestore snapshot),
   read them, write back, close or delete. A reply shows on the customer's private page and, if configured, is emailed. */
import { db, esc, authMessage, collection, doc, updateDoc, deleteDoc, serverTimestamp, onSnapshot } from './firebase.js';
import { sendReplyEmail } from './emails.js';

let msgs = [], openId = null, onChange = () => {};
const TOPICS = { general: 'General', unsubscribe: 'Unsubscribe help', preorder: 'Pre-orders', order: 'An order', other: 'Other' };
const lastAt = (m) => ((m.updatedAt && m.updatedAt.seconds) || 0) * 1000 || (m.thread && m.thread.length ? m.thread[m.thread.length - 1].at : 0);
const when = (ms) => new Date(ms).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });

export const unreadCount = () => msgs.filter((m) => m.unreadAdmin && m.status !== 'closed').length;
export const messageCount = () => msgs.length;

export function watchMessages(cb) {
  onChange = cb;
  return onSnapshot(collection(db, 'messages'), (snap) => {
    msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() })); onChange(msgs);
  }, (err) => { console.warn('[LA PLAGE] messages', err); msgs = []; onChange(msgs); });
}

export function drawMessages(panel) {
  const sorted = [...msgs].sort((a, b) => lastAt(b) - lastAt(a));
  if (openId && !msgs.some((m) => m.id === openId)) openId = null;
  if (!openId && sorted.length) openId = sorted[0].id;
  const cur = msgs.find((m) => m.id === openId);
  panel.innerHTML = `
    <div class="msg-wrap">
      <ul class="msg-list" aria-label="Conversations">
        ${sorted.length ? sorted.map((m) => {
          const t = m.thread || [], last = t[t.length - 1] || {};
          return `<li><button type="button" class="msg-item${m.id === openId ? ' is-open' : ''}${m.unreadAdmin ? ' is-unread' : ''}" data-open="${esc(m.id)}">
            <span class="msg-item__top"><b>${esc(m.name)}</b><small>${esc(when(lastAt(m)))}</small></span>
            <span class="msg-item__topic">${esc(TOPICS[m.topic] || m.topic)}${m.status === 'closed' ? ' · closed' : ''}</span>
            <span class="msg-item__prev">${last.from === 'admin' ? 'You: ' : ''}${esc(String(last.text || '').slice(0, 90))}</span>
          </button></li>`; }).join('') : '<li class="pf-state">No messages yet. When someone writes to you it appears here, and your phone buzzes if ntfy is set up.</li>'}
      </ul>
      <section class="msg-thread" aria-live="polite">${cur ? threadHTML(cur) : ''}</section>
    </div>`;
  panel.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => { openId = b.dataset.open; drawMessages(panel); }));
  if (cur) { wire(panel, cur); markRead(cur); }
}

const threadHTML = (m) => `
  <header class="msg-thread__head">
    <div><h2 class="adm-h">${esc(m.name)} <span>${esc(TOPICS[m.topic] || m.topic)}</span></h2><p class="adm-date">${esc(m.email)}</p></div>
    <div class="msg-actions">
      <button type="button" class="ui-btn link" data-toggle>${m.status === 'closed' ? 'Reopen' : 'Close'}</button>
      <button type="button" class="ui-btn link pf-danger" data-del>Delete</button>
    </div>
  </header>
  <ol class="ct-thread ct-thread--adm">${(m.thread || []).map((x) => `
    <li class="ct-msg ct-msg--${x.from === 'admin' ? 'us' : 'you'}"><p class="ct-msg__who">${x.from === 'admin' ? 'You' : esc(m.name)} · ${esc(when(x.at))}</p><p class="ct-msg__text">${esc(x.text)}</p></li>`).join('')}</ol>
  <form class="pf-form" data-reply novalidate>
    <label class="pf-field"><span>Reply to ${esc(m.name)}</span><textarea name="text" rows="4" maxlength="2000" required></textarea></label>
    <p class="pf-error" role="alert" data-err></p>
    <button class="btn-outline pf-submit" type="submit">Send reply</button>
  </form>`;

async function markRead(m) {
  if (!m.unreadAdmin) return;
  m.unreadAdmin = false;   // optimistic; the snapshot confirms it
  try { await updateDoc(doc(db, 'messages', m.id), { unreadAdmin: false }); } catch (e) { m.unreadAdmin = true; }
}

function wire(panel, m) {
  const form = panel.querySelector('[data-reply]'), err = panel.querySelector('[data-err]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = String(new FormData(form).get('text') || '').trim().slice(0, 2000);
    if (!text) { err.textContent = 'Please write a reply.'; return; }
    form.querySelector('button').disabled = true;
    try {
      await updateDoc(doc(db, 'messages', m.id), { thread: [...(m.thread || []), { from: 'admin', text, at: Date.now() }], unreadAdmin: false, updatedAt: serverTimestamp() });
      sendReplyEmail({ email: m.email, name: m.name, text, token: m.id }).catch((x) => console.warn('[LA PLAGE] reply email', x));
    } catch (ex) { err.textContent = authMessage(ex); form.querySelector('button').disabled = false; }
  });
  panel.querySelector('[data-toggle]').addEventListener('click', async () => {
    try { await updateDoc(doc(db, 'messages', m.id), { status: m.status === 'closed' ? 'open' : 'closed', updatedAt: serverTimestamp() }); } catch (ex) { alert(authMessage(ex)); }
  });
  panel.querySelector('[data-del]').addEventListener('click', async () => {
    if (!confirm(`Delete this conversation with ${m.name}? This cannot be undone.`)) return;
    try { await deleteDoc(doc(db, 'messages', m.id)); } catch (ex) { alert(authMessage(ex)); }
  });
}
