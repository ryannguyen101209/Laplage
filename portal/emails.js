/* LA PLAGE · pre-order emails, sent through EmailJS (https://www.emailjs.com).
   One email to every admin in ADMIN_EMAILS, and one confirmation to the customer's Gmail.
   Does nothing until the EMAILJS block in firebase-config.js is filled in. */
import { CONFIG, ADMIN_EMAILS, fmtVND, fmtAddress } from './firebase.js';

const E = CONFIG.EMAILJS || {};
export const emailsReady = !!(E.PUBLIC_KEY && !/^PASTE_/.test(E.PUBLIC_KEY) && E.SERVICE_ID && E.ADMIN_TEMPLATE_ID && E.CUSTOMER_TEMPLATE_ID);

const send = async (templateId, params) => {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service_id: E.SERVICE_ID, template_id: templateId, user_id: E.PUBLIC_KEY, template_params: params }),
  });
  if (!res.ok) throw new Error(`EmailJS ${res.status}: ${await res.text()}`);
};

export async function sendOrderEmails(order) {
  if (!emailsReady) return;
  // plain text only: EmailJS escapes these values in the email ({{ }} placeholders)
  const params = {
    order_id: order.id,
    order_date: new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }),
    customer_name: order.name,
    customer_username: order.username,
    customer_gmail: order.gmail,
    customer_phone: order.phone,
    shipping_address: fmtAddress(order.address),
    items: order.items.map((it) => `${it.title}${it.color ? ` · ${it.color}` : ''} · size ${it.size} × ${it.quantity} = ${fmtVND(it.lineTotal)}`).join('\n'),
    subtotal: fmtVND(order.subtotal),
    shipping_fee: fmtVND(order.shippingFee),
    total: fmtVND(order.total),
    note: order.note || '—',
    admin_link: `${location.origin}/admin`,
    account_link: `${location.origin}/account`,
  };
  await Promise.allSettled([
    // admins: one email, every admin on the To line
    ADMIN_EMAILS.length ? send(E.ADMIN_TEMPLATE_ID, { ...params, to_email: ADMIN_EMAILS.join(',') }) : Promise.resolve(),
    // the customer's confirmation, replies go to the first admin
    send(E.CUSTOMER_TEMPLATE_ID, { ...params, to_email: order.gmail, reply_to: ADMIN_EMAILS[0] || '' }),
  ]).then((r) => r.forEach((x) => { if (x.status === 'rejected') console.warn('[LA PLAGE] email', x.reason); }));
}

/* Welcome email for the mailing list (optional: needs SUBSCRIBER_TEMPLATE_ID). It carries the personal
   unsubscribe link, so every email we send can be stopped in one click. */
export const welcomeReady = !!(E.PUBLIC_KEY && !/^PASTE_/.test(E.PUBLIC_KEY) && E.SERVICE_ID && E.SUBSCRIBER_TEMPLATE_ID && !/^PASTE_/.test(E.SUBSCRIBER_TEMPLATE_ID));
export async function sendWelcomeEmail({ email, unsubscribeLink }) {
  if (!welcomeReady) return;
  await send(E.SUBSCRIBER_TEMPLATE_ID, {
    to_email: email,
    reply_to: ADMIN_EMAILS[0] || '',
    unsubscribe_link: unsubscribeLink,
    preorder_date: '20 November 2026',
    site_link: location.origin,
  });
}

/* Email to a customer from the Messages tab (optional: needs REPLY_TEMPLATE_ID). Carries their private thread link,
   because replies live on the site and not in an inbox. */
export const replyReady = !!(E.PUBLIC_KEY && !/^PASTE_/.test(E.PUBLIC_KEY) && E.SERVICE_ID && E.REPLY_TEMPLATE_ID && !/^PASTE_/.test(E.REPLY_TEMPLATE_ID));
export async function sendReplyEmail({ email, name, text, token }) {
  if (!replyReady) return;
  await send(E.REPLY_TEMPLATE_ID, {
    to_email: email, customer_name: name || '', reply_text: text,
    thread_link: `${location.origin}/contact.html?t=${token}`, reply_to: ADMIN_EMAILS[0] || '',
  });
}
