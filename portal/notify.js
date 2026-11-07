/* LA PLAGE · notifications for the admins: an email to NOTIFY_EMAIL (EmailJS) and/or a push through ntfy (https://ntfy.sh).
   Posts a small JSON message to the topic set in firebase-config.js (NTFY). A failure here never blocks the customer. */
const N = (window.LAPLAGE_CONFIG || {}).NTFY || {};
export const ntfyReady = !!(N.SERVER && N.TOPIC && !/^PASTE_/.test(N.TOPIC));

const CFG = window.LAPLAGE_CONFIG || {}, EJ = CFG.EMAILJS || {};
const alertReady = !!(CFG.NOTIFY_EMAIL && EJ.PUBLIC_KEY && !/^PASTE_/.test(EJ.PUBLIC_KEY) && EJ.SERVICE_ID && EJ.ALERT_TEMPLATE_ID && !/^PASTE_/.test(EJ.ALERT_TEMPLATE_ID));

/* An alert email to the shop's notification inbox (NOTIFY_EMAIL), through EmailJS. */
async function emailAlert({ title, message, path }) {
  if (!alertReady) return;
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: EJ.SERVICE_ID, template_id: EJ.ALERT_TEMPLATE_ID, user_id: EJ.PUBLIC_KEY,
        template_params: { to_email: CFG.NOTIFY_EMAIL, subject: `LA PLAGE · ${title}`, message, link: location.origin + path } }),
    });
    if (!res.ok) throw new Error(`EmailJS ${res.status}`);
  } catch (e) { console.warn('[LA PLAGE] alert email', e); }
}

export async function notifyAdmins({ title, message, path = '/admin.html', tags = [], priority = 4 }) {
  emailAlert({ title, message, path });
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
