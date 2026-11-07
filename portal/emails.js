/* LA PLAGE · every email the site sends, through EmailJS (https://www.emailjs.com), using one normal Gmail account and ONE template.
   - a new pre-order: one email to every admin in ADMIN_EMAILS and a confirmation to the customer
   - a new contact message: an email to the admins, and a "we got it" email to the customer
   - an admin reply in Messages: an email to the customer with a link to the conversation
   - joining the mailing list: a welcome email with the unsubscribe link
   The template is just {{subject}} and {{message}} (+ {{link}}), so any of the above can use it.
   Does nothing until EMAILJS in firebase-config.js is filled in. */
import { CONFIG, ADMIN_EMAILS, fmtVND, fmtAddress } from './firebase.js';

const E = CONFIG.EMAILJS || {};
const set = (v) => !!v && !/^PASTE_/.test(v);
export const emailsReady = set(E.PUBLIC_KEY) && set(E.SERVICE_ID) && set(E.TEMPLATE_ID);

const send = async ({ to, subject, message, link = '', replyTo = '' }) => {
  if (!emailsReady || !to) return;
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: E.SERVICE_ID, template_id: E.TEMPLATE_ID, user_id: E.PUBLIC_KEY,
      template_params: { to_email: Array.isArray(to) ? to.join(',') : to, reply_to: replyTo || ADMIN_EMAILS[0] || '', subject, message, link },
    }),
  });
  if (!res.ok) throw new Error(`EmailJS ${res.status}: ${await res.text()}`);
};
const warn = (r) => r.forEach((x) => { if (x.status === 'rejected') console.warn('[LA PLAGE] email', x.reason); });

export async function sendOrderEmails(order) {
  const when = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
  const lines = order.items.map((it) => `${it.title}${it.color ? ` · ${it.color}` : ''} · size ${it.size} × ${it.quantity} = ${fmtVND(it.lineTotal)}`).join('\n');
  const sums = `Subtotal: ${fmtVND(order.subtotal)}\nShipping: ${fmtVND(order.shippingFee)}\nTotal: ${fmtVND(order.total)}`;
  warn(await Promise.allSettled([
    send({
      to: ADMIN_EMAILS, replyTo: order.gmail, link: `${location.origin}/admin.html#orders`,
      subject: `New pre-order from ${order.name} · ${fmtVND(order.total)}`,
      message: `New pre-order ${order.id} on ${when}\n\nCustomer: ${order.name} (@${order.username})\nEmail: ${order.gmail}   Phone: ${order.phone}\nShip to: ${fmtAddress(order.address)}\n\n${lines}\n\n${sums}\nNote: ${order.note || '-'}\n\nOpen the admin panel:`,
    }),
    send({
      to: order.gmail, link: `${location.origin}/account.html`,
      subject: 'Your LA PLAGE pre-order is in',
      message: `Hello ${order.name},\n\nThank you for your pre-order. It joins our next production batch. We will be in touch to confirm the details and arrange payment.\n\n${lines}\n\n${sums}\nShip to: ${fmtAddress(order.address)}\n\nFollow your pre-order:`,
    }),
  ]));
}

/* a new contact message: tell the admins, and let the customer know it arrived */
export async function sendContactEmails({ name, email, topic, text, token }) {
  warn(await Promise.allSettled([
    send({ to: ADMIN_EMAILS, replyTo: email, link: `${location.origin}/admin.html#messages`, subject: `New message from ${name}`, message: `${name} <${email}> wrote (${topic}):\n\n${text}\n\nRead and reply in the admin panel:` }),
    send({ to: email, link: `${location.origin}/contact.html?t=${token}`, subject: 'We got your message · LA PLAGE', message: `Hello ${name},\n\nThank you for writing to us. We will answer on your private page, and email you when we do:` }),
  ]));
}
export async function notifyNewCustomerMessage({ name, email, text, token }) {   // a follow-up on an existing conversation
  await send({ to: ADMIN_EMAILS, replyTo: email, link: `${location.origin}/admin.html#messages`, subject: `New message from ${name}`, message: `${name} <${email}> wrote:\n\n${text}\n\nRead and reply in the admin panel:` }).catch((e) => console.warn('[LA PLAGE] email', e));
}

/* an admin reply: email the customer with their private link, because replies live on the site */
export async function sendReplyEmail({ email, name, text, token }) {
  await send({ to: email, link: `${location.origin}/contact.html?t=${token}`, subject: 'A reply from LA PLAGE', message: `Hello ${name || ''},\n\n${text}\n\nRead and answer here:` });
}

/* joining the mailing list: welcome + the personal unsubscribe link */
export async function sendWelcomeEmail({ email, unsubscribeLink }) {
  await send({ to: email, link: unsubscribeLink, subject: 'You are on the LA PLAGE list', message: 'Thank you for joining LA PLAGE.\n\nPre-orders open on 20 November 2026. We will write the moment they do.\n\nYou can unsubscribe at any time:' });
}
