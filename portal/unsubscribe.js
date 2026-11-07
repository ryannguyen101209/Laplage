/* LA PLAGE · unsubscribe page. The link in every email carries the person's private token (?t=...).
   The page asks for one click before changing anything, so mail scanners that open links cannot unsubscribe anyone. */
import { isConfigured, esc } from './firebase.js';
import { readSubscriber, setStatus } from './mailing.js';

const root = document.querySelector('[data-unsub]');
const CONTACT = 'contact.html?topic=unsubscribe';
const card = (html) => { root.innerHTML = `<div class="pf-card pf-card--narrow">${html}</div>`; };
const token = new URLSearchParams(location.search).get('t') || '';

const noLink = () => card(`
  <p class="label">Mailing list</p>
  <h1 class="pf-title">Unsubscribe <em>from emails.</em></h1>
  <p class="pf-lead">Use the unsubscribe link in any email we sent you; it takes you straight to your own page. If you no longer have an email, <a class="link link--underlined" href="${CONTACT}">send us a message</a> from the address you signed up with and we will remove you within 3 working days.</p>`);

const show = (email, status) => {
  const on = status === 'subscribed';
  card(`
    <p class="label">Mailing list</p>
    <h1 class="pf-title">${on ? 'Unsubscribe' : 'You are'} <em>${on ? 'from emails.' : 'unsubscribed.'}</em></h1>
    <p class="pf-lead">${on
      ? `<strong>${esc(email)}</strong> is on our list for pre-order news and new drops. Unsubscribe and we will not email you again.`
      : `<strong>${esc(email)}</strong> will not receive marketing emails from LA PLAGE. Changed your mind? You can rejoin below.`}</p>
    <p class="pf-error" role="alert" data-err></p>
    <button class="btn-outline pf-submit" type="button" data-act>${on ? 'Unsubscribe me' : 'Subscribe me again'}</button>`);
  root.querySelector('[data-act]').addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    try { await setStatus(token, on ? 'unsubscribed' : 'subscribed'); show(email, on ? 'unsubscribed' : 'subscribed'); }
    catch (err) { root.querySelector('[data-err]').textContent = `That did not work. Please try again, or <a class="link link--underlined" href="${CONTACT}">send us a message</a>.`; btn.disabled = false; }
  });
};

if (!token) noLink();
else if (!isConfigured) card(`<p class="pf-state">This page is not available yet. Please <a class="link link--underlined" href="${CONTACT}">send us a message</a> and we will remove you.</p>`);
else {
  readSubscriber(token).then((s) => {
    if (!s) card(`<p class="label">Mailing list</p><h1 class="pf-title">Link <em>not found.</em></h1><p class="pf-lead">This unsubscribe link is not valid. Please <a class="link link--underlined" href="${CONTACT}">send us a message</a> and we will remove you within 3 working days.</p>`);
    else show(s.email, s.status);
  }).catch(() => card(`<p class="pf-state">We could not load your subscription. Please refresh, or <a class="link link--underlined" href="${CONTACT}">send us a message</a> and we will remove you.</p>`));
}
