/* LA PLAGE · sign in / create account form (username + password).
   Renders into any container; used by the pre-order overlay, the account page and /admin. */
import {
  auth, db, esc, authMessage, loginEmailFor, USERNAME_RE, isAdminUser,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, deleteUser, signOut,
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
} from './firebase.js';

const GMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// After a customer signs in: refresh lastLogin and return their profile (null if the record was removed)
export async function loadProfile(user) {
  const ref = doc(db, 'users', user.uid);
  // right after sign-up the record is still being written, so give it a moment before deciding it is missing
  let snap = await getDoc(ref);
  for (let i = 0; i < 5 && !snap.exists(); i++) {
    await new Promise((r) => setTimeout(r, 400));
    snap = await getDoc(ref);
  }
  if (!snap.exists()) return null;
  try { await updateDoc(ref, { lastLogin: serverTimestamp() }); } catch (e) { /* not critical */ }
  return { id: snap.id, ...snap.data() };
}

export function renderAuthForm(box, { mode = 'signin', intro = '', adminOnly = false } = {}) {
  let current = mode;
  const draw = () => {
    const signup = current === 'signup';
    box.innerHTML = `
      <div class="pf-auth">
        ${intro ? `<p class="pf-auth__intro">${esc(intro)}</p>` : ''}
        ${adminOnly ? '' : `<div class="pf-tabs" role="tablist">
          <button type="button" role="tab" class="pf-tab" aria-selected="${!signup}" data-mode="signin">Sign in</button>
          <button type="button" role="tab" class="pf-tab" aria-selected="${signup}" data-mode="signup">Create account</button>
        </div>`}
        <form class="pf-form" novalidate data-auth-form>
          <label class="pf-field"><span>${adminOnly ? 'Admin Gmail' : 'Username'}</span>
            <input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
          ${signup ? `
          <label class="pf-field"><span>Your name</span><input name="name" autocomplete="name" required maxlength="80"></label>` : ''}
          <label class="pf-field"><span>Password</span>
            <input name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" required></label>
          ${signup ? `
          <label class="pf-field"><span>Re-enter password</span><input name="password2" type="password" autocomplete="new-password" required></label>
          <label class="pf-field"><span>Gmail <em>for pre-order emails</em></span>
            <input name="gmail" type="email" autocomplete="email" inputmode="email" maxlength="120" required></label>
          <p class="pf-hint">3–20 characters for the username: lowercase letters, numbers, dots or underscores. Passwords need 8 characters or more.</p>` : ''}
          <p class="pf-error" role="alert" data-auth-error></p>
          <button class="btn-outline pf-submit" type="submit">${signup ? 'Create account' : 'Sign in'}</button>
        </form>
      </div>`;
    box.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { current = b.dataset.mode; draw(); }));
    box.querySelector('[data-auth-form]').addEventListener('submit', submit);
    box.querySelector('input[name="username"]').focus({ preventScroll: true });
  };

  const submit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const err = form.querySelector('[data-auth-error]');
    const btn = form.querySelector('.pf-submit');
    const f = Object.fromEntries(new FormData(form));
    const username = String(f.username || '').trim().toLowerCase();
    const fail = (msg) => { err.textContent = msg; btn.disabled = false; btn.classList.remove('is-busy'); };
    err.textContent = '';

    if (current === 'signup') {
      if (!USERNAME_RE.test(username)) return fail('Usernames are 3–20 characters: lowercase letters, numbers, dots or underscores.');
      if (!String(f.name || '').trim()) return fail('Please add your name.');
      if (String(f.password || '').length < 8) return fail('Please use a password of at least 8 characters.');
      if (f.password !== f.password2) return fail('The two passwords do not match.');
      const gmail = String(f.gmail || '').trim().toLowerCase();
      if (!gmail) return fail('Please add your Gmail. We send your pre-order confirmation there.');
      if (!GMAIL_RE.test(gmail)) return fail('That Gmail address does not look right.');
      btn.disabled = true; btn.classList.add('is-busy');
      let cred = null;
      try {
        cred = await createUserWithEmailAndPassword(auth, loginEmailFor(username), f.password);
        const name = String(f.name).trim().slice(0, 80);
        await updateProfile(cred.user, { displayName: name });
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid, username, name, gmail, phone: '',
          address: { street: '', ward: '', district: '', city: '' },
          disabled: false, createdAt: serverTimestamp(), lastLogin: serverTimestamp(),
        });
      } catch (ex) {
        // never leave a login without its account record
        if (cred) { try { await deleteUser(cred.user); } catch (e2) { await signOut(auth).catch(() => {}); } }
        return fail(authMessage(ex));
      }
      return;
    }

    if (!username) return fail(adminOnly ? 'Please enter your admin Gmail.' : 'Please enter your username.');
    if (!f.password) return fail('Please enter your password.');
    btn.disabled = true; btn.classList.add('is-busy');
    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmailFor(username), f.password);
      // a non-admin on /admin stays signed in; the admin page then explains there is no access
      if (adminOnly && !isAdminUser(cred.user)) return;
      if (!isAdminUser(cred.user)) {
        const profile = await loadProfile(cred.user);
        if (!profile) { await signOut(auth); return fail('This account is no longer active. Please contact us.'); }
      }
    } catch (ex) { return fail(authMessage(ex)); }
  };

  draw();
}
