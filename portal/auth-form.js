/* LA PLAGE · sign in / create account form (username + password).
   Renders into any container; used by the pre-order overlay, the account page and /admin. */
import {
  auth, db, esc, authMessage, loginEmailFor, ADMIN_EMAILS, isAdminUser,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, deleteUser, signOut,
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
} from './firebase.js';

const isAdminEmail = (e) => ADMIN_EMAILS.includes(String(e).toLowerCase());
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

const EYE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-2.9 3.9M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>';

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
          <label class="pf-field"><span>${adminOnly ? 'Admin Gmail' : 'Email'}</span>
            <input name="username" type="${adminOnly ? 'text' : 'email'}" autocomplete="${signup ? 'email' : 'username'}" inputmode="email" autocapitalize="none" spellcheck="false" required></label>
          ${signup ? `
          <label class="pf-field"><span>Your name</span><input name="name" autocomplete="name" required maxlength="80"></label>` : ''}
          <label class="pf-field"><span>Password</span>
            <span class="pf-pass">
              <input name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" required>
              <button type="button" class="pf-pass__eye" aria-label="Show password" aria-pressed="false" data-show-pass>${EYE}</button>
            </span></label>
          ${signup ? `
          <p class="pf-hint">Your email is your username. Passwords need 8 characters or more.</p>
          <p class="pf-hint">By creating an account you agree to our <a class="link link--underlined" href="terms.html" target="_blank" rel="noopener">Terms of Use</a> and <a class="link link--underlined" href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</p>` : ''}
          ${adminOnly
            ? '<p class="pf-hint">Admins: sign in with your real Gmail, not the customer form.</p>'
            : '<p class="pf-hint pf-login-note">Your login is saved as: <b data-login-preview>yourname_at_gmail.com@members.laplage.app</b><br>(the part of your email before the @, then <b>_at_</b>, then the rest of your email, then <b>@members.laplage.app</b>)</p>'}
          <p class="pf-error" role="alert" data-auth-error></p>
          <button class="btn-outline pf-submit" type="submit">${signup ? 'Create account' : 'Sign in'}</button>
        </form>
      </div>`;
    box.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { current = b.dataset.mode; draw(); }));
    box.querySelector('[data-auth-form]').addEventListener('submit', submit);
    // the eye shows the password so it can be checked before sending, and hides it again
    const eye = box.querySelector('[data-show-pass]'), pass = box.querySelector('input[name="password"]');
    eye.addEventListener('click', (e) => {
      e.preventDefault();
      const show = pass.type === 'password';
      pass.type = show ? 'text' : 'password';
      eye.setAttribute('aria-pressed', String(show));
      eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      eye.innerHTML = show ? EYE_OFF : EYE;
      pass.focus({ preventScroll: true });
      const end = pass.value.length; pass.setSelectionRange(end, end);
    });
    const idInput = box.querySelector('input[name="username"]'), preview = box.querySelector('[data-login-preview]');
    if (preview) idInput.addEventListener('input', () => {
      const v = idInput.value.trim().toLowerCase();
      preview.textContent = v.includes('@') ? loginEmailFor(v) : 'yourname_at_gmail.com@members.laplage.app';
    });
    idInput.focus({ preventScroll: true });
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
      if (!GMAIL_RE.test(username)) return fail('Please enter a valid email address.');
      if (isAdminEmail(username)) return fail('That email is reserved. Please use another.');
      if (!String(f.name || '').trim()) return fail('Please add your name.');
      if (String(f.password || '').length < 8) return fail('Please use a password of at least 8 characters.');
      const gmail = username;
      const handle = (username.split('@')[0].replace(/[^a-z0-9._]/g, '').slice(0, 20).padEnd(3, '_'));
      btn.disabled = true; btn.classList.add('is-busy');
      let cred = null;
      try {
        cred = await createUserWithEmailAndPassword(auth, loginEmailFor(username), f.password);
        const name = String(f.name).trim().slice(0, 80);
        await updateProfile(cred.user, { displayName: name });
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid, username: handle, name, gmail, phone: '',
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

    if (!username) return fail(adminOnly ? 'Please enter your admin Gmail.' : 'Please enter your email.');
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
    } catch (ex) {
      // on the admin page, show exactly what was tried and what Firebase answered, so a failed login can be diagnosed
      const detail = adminOnly ? ` [tried: ${loginEmailFor(username)} · ${(ex && ex.code) || 'no code'}]` : '';
      return fail(authMessage(ex) + detail);
    }
  };

  draw();
}
