/* LA PLAGE · sign in with Google (the only way in).
   Renders one button into any container; used by the pre-order overlay, the home page, the account page and /admin.
   The first time someone signs in, their account record (users/{uid}) is created. */
import {
  auth, db, esc, authMessage, isAdminUser,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut,
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
} from './firebase.js';

// After a customer signs in: return their account record, creating it on the very first login.
export async function loadProfile(user) {
  const ref = doc(db, 'users', user.uid);
  let snap = await getDoc(ref);
  if (!snap.exists()) {
    const email = String(user.email || '').toLowerCase();
    const handle = (email.split('@')[0].replace(/[^a-z0-9._]/g, '').slice(0, 20)).padEnd(3, '_');
    await setDoc(ref, {
      uid: user.uid, username: handle, name: String(user.displayName || email.split('@')[0] || 'Customer').slice(0, 80), gmail: email, phone: '',
      address: { street: '', ward: '', district: '', city: '' },
      disabled: false, createdAt: serverTimestamp(), lastLogin: serverTimestamp(),
    });
    snap = await getDoc(ref);
  } else {
    try { await updateDoc(ref, { lastLogin: serverTimestamp() }); } catch (e) { /* not critical */ }
  }
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Google refuses to sign people in inside the in-app browsers of Instagram, TikTok, Facebook and similar apps
const inAppBrowser = () => /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|BytedanceWebview|Zalo|Line\//i.test(navigator.userAgent || '');

const G_ICON = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.5-5.8c-2.1 1.4-4.8 2.3-8.1 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';

export function renderAuthForm(box, { intro = '', adminOnly = false } = {}) {
  box.innerHTML = `
    <div class="pf-auth">
      ${intro ? `<p class="pf-auth__intro">${esc(intro)}</p>` : ''}
      ${inAppBrowser() ? `<p class="pf-notice">Google sign-in does not work inside this app's browser. Please open <b>laplage.store</b> in <b>Safari</b> or <b>Chrome</b>.
        <button type="button" class="ui-btn link" data-copy-link>Copy link</button></p>` : ''}
      <button type="button" class="btn-outline pf-google" data-google>${G_ICON}<span>Continue with Google</span></button>
      <p class="pf-hint">${adminOnly ? 'Admins: use your admin Gmail.' : 'New here? Signing in with Google creates your account.'}</p>
      ${adminOnly ? '' : '<p class="pf-hint">By continuing you agree to our <a class="link link--underlined" href="terms.html" target="_blank" rel="noopener">Terms of Use</a> and <a class="link link--underlined" href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</p>'}
      <p class="pf-error" role="alert" data-auth-error></p>
    </div>`;
  const btn = box.querySelector('[data-google]'), err = box.querySelector('[data-auth-error]');
  const copy = box.querySelector('[data-copy-link]');
  if (copy) copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText('https://laplage.store'); copy.textContent = 'Copied'; } catch (e) { /* ignore */ } });
  btn.addEventListener('click', async () => {
    err.textContent = ''; btn.disabled = true; btn.classList.add('is-busy');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      let cred;
      try { cred = await signInWithPopup(auth, provider); }
      catch (ex) {
        if (ex && ex.code === 'auth/popup-blocked') { await signInWithRedirect(auth, provider); return; }   // the page reloads and the session is restored
        throw ex;
      }
      // a customer's record is created on first login; an admin has no customer record and none is needed
      if (!adminOnly && !isAdminUser(cred.user)) await loadProfile(cred.user);
    } catch (ex) {
      if (ex && (ex.code === 'auth/popup-closed-by-user' || ex.code === 'auth/cancelled-popup-request')) { btn.disabled = false; btn.classList.remove('is-busy'); return; }
      err.textContent = authMessage(ex);
      try { await signOut(auth); } catch (e2) { /* ignore */ }
      btn.disabled = false; btn.classList.remove('is-busy');
    }
  });
}
