/* LA PLAGE · push notifications for the admins through ntfy (https://ntfy.sh).
   Posts a small JSON message to the topic set in firebase-config.js (NTFY). A failure here never blocks the customer. */
const N = (window.LAPLAGE_CONFIG || {}).NTFY || {};
export const ntfyReady = !!(N.SERVER && N.TOPIC && !/^PASTE_/.test(N.TOPIC));

export async function notifyAdmins({ title, message, path = '/admin.html', tags = [], priority = 4 }) {
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
