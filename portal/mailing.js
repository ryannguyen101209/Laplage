/* LA PLAGE · mailing list. Signing up stores the address under a long random token in Firestore
   (collection "subscribers"); that token is the person's private unsubscribe key. */
import {
  isConfigured, db, doc, getDoc, setDoc, updateDoc, serverTimestamp,
} from './firebase.js';
import { sendWelcomeEmail } from './emails.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const newToken = () => {
  const b = new Uint8Array(24); crypto.getRandomValues(b);   // 192 bits, 48 hex characters
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
};
export const unsubscribeLink = (token) => `${location.origin}/unsubscribe.html?t=${token}`;

export async function subscribe(email, source = 'home') {
  if (!isConfigured || !db) throw new Error('unavailable');
  const addr = String(email || '').trim().toLowerCase();
  if (addr.length > 120 || !EMAIL_RE.test(addr)) throw new Error('invalid');
  const token = newToken();
  await setDoc(doc(db, 'subscribers', token), {
    email: addr, status: 'subscribed', source, consent: true,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  // the welcome email (with the unsubscribe link) is a bonus: the sign-up is already saved
  sendWelcomeEmail({ email: addr, unsubscribeLink: unsubscribeLink(token) }).catch((e) => console.warn('[LA PLAGE] welcome email', e));
  return token;
}

export const readSubscriber = async (token) => {
  if (!/^[a-f0-9]{32,64}$/.test(token || '')) return null;
  const snap = await getDoc(doc(db, 'subscribers', token));
  return snap.exists() ? snap.data() : null;
};
export const setStatus = (token, status) => updateDoc(doc(db, 'subscribers', token), { status, updatedAt: serverTimestamp() });
