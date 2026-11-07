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
    apiKey: 'AIzaSyBlJJkAw5ddTTeYBji3bUbnNkapG-XEXU8',
    authDomain: 'la-plage-e7af7.firebaseapp.com',
    projectId: 'la-plage-e7af7',
    storageBucket: 'la-plage-e7af7.firebasestorage.app',
    messagingSenderId: '1057824799093',
    appId: '1:1057824799093:web:4ef54779230d73ae3e7b3c',
  },
  ADMIN_EMAILS: [
    'lookmanfc@gmail.com',
    'ryannguyen101209@gmail.com',
  ],
  SHIPPING_FEE: 50000,
  PREORDER_OPENS: '20 November 2026',
  PREORDER_OPENS_AT: '2026-11-20T00:00:00+07:00',   // until this moment the Pre-order button says "Get notified" and leads to the sign-up (Saigon midnight; also enforced in firestore.rules)


  /* Phone notifications for the admins (free ntfy app, https://ntfy.sh): a push for every new message and new pre-order.
     In the ntfy app tap "+" and subscribe to the TOPIC below. Anyone who knows the topic can read the alerts, so keep it
     long and private (change it to anything unguessable if you like; the app just has to use the same word). */
  NTFY: {
    SERVER: 'https://ntfy.sh',
    TOPIC: 'laplage-admin-6930082a18ac759b',
  },
};
