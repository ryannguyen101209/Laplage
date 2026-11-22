/* LA PLAGE · alerts for the admins: an email through Web3Forms (https://web3forms.com) and an optional phone push through ntfy.
   Web3Forms sends to the one email address the access key was created for (WEB3FORMS_KEY in firebase-config.js).
   Posts a small JSON message to the topic set in firebase-config.js (NTFY). A failure here never blocks the customer. */
const N = (window.LAPLAGE_CONFIG || {}).NTFY || {};
export const ntfyReady = !!(N.SERVER && N.TOPIC && !/^PASTE_/.test(N.TOPIC));

const CFG = window.LAPLAGE_CONFIG || {};
const w3key = CFG.WEB3FORMS_KEY;
export const emailReady = !!(w3key && !/^PASTE_/.test(w3key));

// an email to the shop's inbox with every detail (details falls back to message)
async function emailAdmins({ title, message, details, path, replyTo }) {
  if (!emailReady) return;
  try {
    await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        access_key: w3key,
        subject: `LA PLAGE · ${title}`,
        from_name: 'LA PLAGE website',
        ...(replyTo ? { replyto: replyTo } : {}),
        message: `${details || message}\n\nOpen the admin panel: ${location.origin}${path}`,
      }),
    });
  } catch (e) { console.warn('[LA PLAGE] email alert', e); }
}

export async function notifyAdmins({ title, message, details, path = '/admin.html', tags = [], priority = 4, replyTo }) {
  emailAdmins({ title, message, details, path, replyTo });
  if (!ntfyReady) return;
  try {
    await fetch(N.SERVER.replace(/\/+$/, '') + '/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: N.TOPIC,
        title: String(title).slice(0, 120),
        message: String(message).slice(0, 400),
        tags, priority,
        click: location.origin + path,
      }),
    });
  } catch (e) { console.warn('[LA PLAGE] ntfy', e); }
}
