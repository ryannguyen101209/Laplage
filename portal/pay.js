/* LA PLAGE · how to pay. One clean panel used right after ordering and on the account page.
   Bank / QR show the VietinBank details and the QR; cash says how it works. Settings live in firebase-config.js (PAYMENT). */
import { esc, fmtVND } from './firebase.js';

const PAY = (window.LAPLAGE_CONFIG || {}).PAYMENT || {};
// the order number: made from the order's own unique id, so every order gets its own and it never changes
export const orderCode = (id) => `LP-${String(id || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}`;
// bank transfer notes cannot hold accents, so the name is written in plain capitals
const plain = (n) => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/[^A-Za-z ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
export const transferNote = (id, name) => `${orderCode(id)} ${plain(name)}`.trim();

const row = (label, value, copy) => `
  <div class="pay-row"><dt>${esc(label)}</dt><dd><span>${esc(value)}</span>${copy ? `<button type="button" class="pay-copy" data-copy="${esc(copy)}">Copy</button>` : ''}</dd></div>`;

export function payPanel(method, { total, id, name }) {
  const code = orderCode(id);
  const note = transferNote(id, name);
  if (method === 'cash') {
    return `<section class="pay"><h3 class="pay__title">Pay in cash</h3>
      <p class="pay__lead">${esc(PAY.CASH || 'We will arrange it with you.')}</p>
      <dl class="pay-rows">${row('Amount', fmtVND(total))}${row('Order number', code, code)}${row('Name', plain(name))}</dl></section>`;
  }
  const hasBank = PAY.ACCOUNT_NO;
  return `<section class="pay"><h3 class="pay__title">${method === 'qr' ? 'Scan to pay' : 'Bank transfer'}</h3>
    <p class="pay__lead">Send <b>${esc(fmtVND(total))}</b> and write this exactly in the transfer note: <b>${esc(note)}</b> (your order number, then your name). It lets us match your payment.</p>
    <div class="pay__grid">
      ${PAY.QR_IMAGE ? `<figure class="pay__qr"><img src="${esc(PAY.QR_IMAGE)}" alt="Payment QR code for LA PLAGE" width="220" height="220"><figcaption>Scan with any banking app</figcaption></figure>` : ''}
      ${hasBank ? `<dl class="pay-rows">
        ${row('Bank', PAY.BANK_NAME || '')}
        ${row('Account name', PAY.ACCOUNT_NAME || '')}
        ${row('Account number', PAY.ACCOUNT_NO, PAY.ACCOUNT_NO)}
        ${row('Amount', fmtVND(total), String(Number(total) || 0))}
        ${row('Order number', code, code)}
        ${row('Transfer note', note, note)}
      </dl>` : '<p class="pay__lead">We will send you the bank details shortly.</p>'}
    </div>
    <p class="pay__foot">We start on your order as soon as your payment arrives. Its status updates in your account.</p></section>`;
}

// make every "Copy" button inside a container work
export function wireCopy(root) {
  root.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy'; }, 1600); }
    catch (e) { /* clipboard blocked: the value is still shown */ }
  }));
}
