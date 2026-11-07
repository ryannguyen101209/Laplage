/* ==========================================================================
   LA PLAGE · accounts & pre-orders configuration
   ==========================================================================
   FILL IN THE THREE PLACEHOLDERS BELOW. Nothing else in the code needs editing.

   1. FIREBASE_CONFIG: Firebase console → Project settings (gear icon) → General →
      "Your apps" → Web app → "SDK setup and configuration" → Config.
      Copy the values across.

   2. ADMIN_EMAILS: the Gmail address(es) allowed into /admin. Each admin creates
      their login in Firebase console → Authentication → Users → "Add user", using
      that Gmail as the email. They then sign in on the site by typing the Gmail in
      the "Username" field. Write them in lowercase.
      ⚠ The same list must also be pasted into firestore.rules (function isAdmin),
      because the database enforces it, not this file.

   3. Leave SHIPPING_FEE at 50000 unless you also change it in firestore.rules.
   ========================================================================== */
window.LAPLAGE_CONFIG = {
  FIREBASE_CONFIG: {
    apiKey: 'AIzaSyCgqIiVDwmWR5ZSPdlipOI28X7JdakIUcc',
    authDomain: 'la-plage-a53db.firebaseapp.com',
    projectId: 'la-plage-a53db',
    storageBucket: 'la-plage-a53db.firebasestorage.app',
    messagingSenderId: '412725896195',
    appId: '1:412725896195:web:0f18234f9eabd84e3ada36',
  },
  ADMIN_EMAILS: [
    'lookmanfc@gmail.com',
    'ryannguyen101209@gmail.com',
  ],
  SHIPPING_FEE: 50000,
  PREORDER_OPENS: '20 November 2026',
  PREORDER_OPENS_AT: '2026-11-20T00:00:00+07:00',   // until this moment the Pre-order button says "Get notified" and leads to the sign-up (Saigon midnight; also enforced in firestore.rules)

  /* Pre-order emails (EmailJS, free up to 200 emails a month). See ACCOUNTS-SETUP.md, "Emails".
     EmailJS dashboard → Account → API keys → Public key; Email Services → Service ID;
     Email Templates → each template's ID. Leave the PASTE_ values to switch emails off. */
  EMAILJS: {
    PUBLIC_KEY: 'PASTE_EMAILJS_PUBLIC_KEY',
    SERVICE_ID: 'PASTE_SERVICE_ID',
    ADMIN_TEMPLATE_ID: 'PASTE_ADMIN_TEMPLATE_ID',
    CUSTOMER_TEMPLATE_ID: 'PASTE_CUSTOMER_TEMPLATE_ID',
    SUBSCRIBER_TEMPLATE_ID: 'PASTE_SUBSCRIBER_TEMPLATE_ID',   // welcome email for the mailing list (optional)
    REPLY_TEMPLATE_ID: 'PASTE_REPLY_TEMPLATE_ID',             // emails a customer when we write back in Messages (optional)
  },

  /* Phone notifications for the admins (free ntfy app, https://ntfy.sh): a push for every new message and new pre-order.
     In the ntfy app tap "+" and subscribe to the TOPIC below. Anyone who knows the topic can read the alerts, so keep it
     long and private (change it to anything unguessable if you like; the app just has to use the same word). */
  NTFY: {
    SERVER: 'https://ntfy.sh',
    TOPIC: 'laplage-admin-6930082a18ac759b',
  },
};
