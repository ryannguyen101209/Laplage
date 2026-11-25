/* LA PLAGE · emails. The browser only tells our server function (api/send.js, which uses Resend) WHAT happened;
   the function reads the record itself and sends the emails, so the Resend key stays private and nobody can use the
   site to send arbitrary email. A failure here never blocks a customer. */
import { auth } from './firebase.js';

const call = async (body) => {
  try {
    const res = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) console.warn('[LA PLAGE] email', res.status, await res.text());
  } catch (e) { console.warn('[LA PLAGE] email', e); }
};
const idToken = () => (auth && auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(''));

// a pre-order was placed: admins get the details, the customer gets a confirmation
export async function sendOrderEmails(order) { await call({ type: 'order', orderId: order.id, idToken: await idToken() }); }
// a customer wrote (new conversation or follow-up): admins get an email
export async function sendContactEmails({ token }) { await call({ type: 'contact', token }); }
export const notifyNewCustomerMessage = sendContactEmails;
// an admin replied in Messages: the customer gets an email with their private link
export async function sendReplyEmail({ token }) { await call({ type: 'reply', token, idToken: await idToken() }); }

// an admin changed an order's status: the server emails the customer. Returns { ok, reason }.
const adminCall = async (body) => {
  try {
    const res = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, idToken: await idToken() }) });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.sent === true) return { ok: true };
    if (res.ok) return { ok: false, reason: 'No email is sent for that status.' };
    if (res.status === 404) return { ok: false, reason: 'The email function is not on the site yet (404). Vercel may not have deployed it.' };
    if (res.status === 503) return { ok: false, reason: 'Email is not switched on: GMAIL_USER / GMAIL_APP_PASSWORD are missing in Vercel, or the site was not redeployed after adding them.' };
    return { ok: false, reason: j.detail || j.error || `Error ${res.status}` };
  } catch (err) { return { ok: false, reason: 'Could not reach the email function.' }; }
};
export const sendStatusEmail = ({ orderId }) => adminCall({ type: 'status', orderId });
export const sendPaidEmail = ({ orderId }) => adminCall({ type: 'paid', orderId });
export const sendTestEmail = () => adminCall({ type: 'test' });
