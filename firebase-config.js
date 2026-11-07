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

  /* Pre-order emails (EmailJS, free up to 200 emails a month). See ACCOUNTS-SETUP.md, "Emails".
     EmailJS dashboard → Account → API keys → Public key; Email Services → Service ID;
     Email Templates → each template's ID. Leave the PASTE_ values to switch emails off. */
  EMAILJS: {
    PUBLIC_KEY: 'PASTE_EMAILJS_PUBLIC_KEY',
    SERVICE_ID: 'PASTE_SERVICE_ID',
    ADMIN_TEMPLATE_ID: 'PASTE_ADMIN_TEMPLATE_ID',
    CUSTOMER_TEMPLATE_ID: 'PASTE_CUSTOMER_TEMPLATE_ID',
  },
};
