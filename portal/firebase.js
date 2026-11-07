/* LA PLAGE · shared Firebase setup for accounts, pre-orders and the admin panel.
   Loaded as an ES module; the SDK comes from Google's CDN. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, connectAuthEmulator, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, updateProfile, deleteUser,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, getDocs, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

export const CONFIG = window.LAPLAGE_CONFIG || {};
export const SHIPPING_FEE = Number(CONFIG.SHIPPING_FEE) || 50000;
export const ADMIN_EMAILS = (CONFIG.ADMIN_EMAILS || []).map((e) => String(e).trim().toLowerCase());
export const STATUSES = ['preordered', 'in production', 'shipped', 'delivered', 'cancelled'];

// the site works exactly as before until the placeholders are filled in
export const isConfigured = !!(CONFIG.FIREBASE_CONFIG && CONFIG.FIREBASE_CONFIG.apiKey && !/^PASTE_/.test(CONFIG.FIREBASE_CONFIG.apiKey));

export let auth = null, db = null;
if (isConfigured) {
  const app = initializeApp(CONFIG.FIREBASE_CONFIG);
  auth = getAuth(app);
  db = getFirestore(app);
  // local testing only: a "demo-" project on localhost talks to the Firebase emulators
  if (/^demo-/.test(CONFIG.FIREBASE_CONFIG.projectId || '') && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
}

/* ---------- usernames ----------
   Customers sign in with a username. Behind the scenes Firebase needs an email
   address, so each username maps to a private address that is never shown or mailed.
   Admins sign in with their Gmail instead (anything containing "@" is used as is). */
export const USERNAME_RE = /^[a-z0-9._]{3,20}$/;
const LOGIN_DOMAIN = 'members.laplage.app';
export const loginEmailFor = (name) => {
  const v = String(name).trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${LOGIN_DOMAIN}`;
};
export const isAdminUser = (user) => !!(user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

/* ---------- helpers ---------- */
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ESC[c]);
const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
export const fmtVND = (n) => vnd.format(Number(n) || 0);
export const fmtDate = (ts) => {
  const d = ts && typeof ts.toDate === 'function' ? ts.toDate() : (ts instanceof Date ? ts : null);
  return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
};
export const fmtAddress = (a) => (a ? [a.street, a.ward, a.district, a.city].filter(Boolean).join(', ') : '');
export const titleCase = (s) => String(s).replace(/\b\w/g, (c) => c.toUpperCase());

// friendly messages for the errors people actually hit
export const authMessage = (err) => {
  const code = (err && err.code) || '';
  if (code.includes('email-already-in-use')) return 'That username is taken. Please choose another.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'Username or password is not right.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Please wait a moment and try again.';
  if (code.includes('weak-password')) return 'Please use a password of at least 8 characters.';
  if (code.includes('network')) return 'We could not reach the server. Please check your connection.';
  if (code.includes('permission-denied')) return 'This action is not allowed for this account.';
  return 'Something went wrong. Please try again.';
};

// hidden pieces are left out of the pre-order form; the admin panel asks for them too, for past orders
export async function loadProducts({ includeHidden = false } = {}) {
  const res = await fetch('data/products.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`products ${res.status}`);
  const all = (await res.json()).products || [];
  return includeHidden ? all : all.filter((p) => !p.hidden);
}

export {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, deleteUser,
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, query, where, getDocs, serverTimestamp,
};
