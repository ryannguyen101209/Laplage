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
