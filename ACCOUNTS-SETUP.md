# LA PLAGE · accounts, pre-orders and admin: setup

Until these steps are done the site behaves exactly as before: "Sign in" leads to a
"opening soon" page and the product view's "Pre-order" button leads to Private access.

## 1. Create the Firebase project
1. Go to https://console.firebase.google.com → **Add project** (any name, e.g. `la-plage`). Google Analytics is not needed.
2. In the project: **Build → Authentication → Get started → Sign-in method → Email/Password → Enable** (leave "Email link" off). Save.
3. **Authentication → Settings → Authorized domains**: make sure these are listed (add any that are missing):
   `la-plage-eight.vercel.app`, `localhost`, and any custom domain you use later.
4. **Build → Firestore Database → Create database** → choose a location close to Vietnam (e.g. `asia-southeast1`) → start in **production mode**.

## 2. Create your admin login (do this before going live)
**Authentication → Users → Add user**: email = your admin Gmail, password = a strong password.
You sign in to `/admin` by typing this Gmail in the "Admin Gmail" field.
Doing this first also reserves that address so nobody else can register it.

## 3. Fill in `firebase-config.js`
**Project settings (gear) → General → Your apps → Web (`</>`) → Register app** (no hosting needed).
Copy `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`
into `FIREBASE_CONFIG`, and your admin Gmail into `ADMIN_EMAILS` (lowercase).

## 4. Publish the security rules
Open `firestore.rules`, replace `PASTE_ADMIN_GMAIL@gmail.com` with the same admin Gmail (lowercase),
then paste the whole file into **Firestore Database → Rules → Publish**.
These rules are what actually protect customer data; the admin list in `firebase-config.js` only decides what the pages show.

## 5. Deploy and test
Commit and push (Vercel deploys). Then:
1. Open the site → **Sign in** → **Create account** → place a test pre-order from any product.
2. Open `/account` and check it is listed with the 50.000 ₫ shipping line.
3. Open `/admin`, sign in with the admin Gmail, change the order's status, export CSV.

## Good to know
- Customers sign in with a **username**. Firebase stores it as a private address `username@members.laplage.app`
  (never shown, never emailed). Because that address has no inbox, there is no self-service
  "forgot password". If someone forgets theirs: in **Authentication → Users** delete their login, then in
  **Firestore → users** delete their record (their pre-orders stay), and ask them to sign up again with the same username.
- Every customer must give a **Gmail**. It receives their pre-order confirmation (see Emails below); their login still uses the username.
- **Disable** an account in /admin to stop new pre-orders. **Delete** removes the account record (their pre-orders stay); their username login still exists in Authentication until you delete it there too.
- Prices are read from `data/products.json` in the browser. The rules check the 50.000 ₫ shipping and that total = subtotal + shipping, but cannot check each price, so glance at totals before confirming payment.

## Emails (EmailJS, free up to 200 emails a month)
Every pre-order sends two emails: one to all admins in `ADMIN_EMAILS`, and a confirmation to the customer's Gmail.
1. Sign up at https://www.emailjs.com (free).
2. **Email Services → Add New Service → Gmail → Connect account** with the Gmail that should send the emails. Note the **Service ID**.
3. **Email Templates → Create New Template**, twice:
   - **Admin template.** Settings: To Email `{{to_email}}`, Subject `New pre-order from {{customer_name}} · {{total}}`. Content:
     ```
     New pre-order {{order_id}} on {{order_date}}

     Customer: {{customer_name}} (@{{customer_username}})
     Gmail: {{customer_gmail}}   Phone: {{customer_phone}}
     Ship to: {{shipping_address}}

     {{items}}

     Subtotal: {{subtotal}}
     Shipping: {{shipping_fee}}
     Total: {{total}}
     Note: {{note}}

     Open the admin panel: {{admin_link}}
     ```
   - **Customer template.** Settings: To Email `{{to_email}}`, Reply To `{{reply_to}}`, Subject `Your LA PLAGE pre-order is in`. Content:
     ```
     Hello {{customer_name}},

     Thank you for your pre-order. It joins our next production batch.
     We will be in touch to confirm the details and arrange payment.

     {{items}}

     Subtotal: {{subtotal}}
     Shipping: {{shipping_fee}}
     Total: {{total}}
     Ship to: {{shipping_address}}

     Follow your pre-order: {{account_link}}

     LA PLAGE · made by students in Saigon
     ```
   Note each template's **Template ID**.
4. **Account → General → Public Key**: copy it.
5. **Account → Security**: tick "Allow EmailJS API for non-browser applications" OFF, and add `la-plage-eight.vercel.app` to the allowed domains, so nobody else can send with your key.
6. Put the four values in the `EMAILJS` block of `firebase-config.js`.

## Mailing list (sign-ups, unsubscribe, privacy and terms)
The home page's "Notify me" form saves each address in Firestore (collection `subscribers`) under a long random token.
That token is the person's private unsubscribe key: `unsubscribe.html?t=TOKEN`. Nothing else is needed on a server.

1. **Publish the new `firestore.rules`** (Firestore Database → Rules → paste the whole file → Publish). It now has a `subscribers` section.
   Without this step sign-ups are refused and the form shows "We could not save your sign-up".
2. **Optional welcome email (with the unsubscribe link).** In EmailJS create a third template:
   To Email `{{to_email}}`, Reply To `{{reply_to}}`, Subject `You are on the LA PLAGE list`. Content:
   ```
   Thank you for joining LA PLAGE.

   Pre-orders open on {{preorder_date}}. We will write the moment they do.

   {{site_link}}

   You can unsubscribe at any time: {{unsubscribe_link}}
   ```
   Paste its ID into `SUBSCRIBER_TEMPLATE_ID` in `firebase-config.js`.
3. **Sending the 20 November announcement.** Open `/admin` → **Mailing list**.
   - "Copy subscribed emails" copies everyone currently subscribed (put them in **BCC**, never in To/CC).
   - "Export CSV" includes each person's own unsubscribe link, for mail-merge tools (Mailchimp, Brevo, Buttondown).
   - Every marketing email must contain a working unsubscribe link and your business name/contact. If you import the list into another mailing tool, use that tool's own unsubscribe, and then mark those people "Unsubscribe" here too so the lists stay in step.
   - Never email anyone listed as **unsubscribed**.
4. **Legal pages.** `privacy.html` and `terms.html` use `lookmanfc@gmail.com` as the contact and "LA PLAGE, Ho Chi Minh City" as the operator.
   Replace those with your registered business name, address and a business email, and have a lawyer check both pages before launch.

## Contact messages (internal inbox in the admin panel)
The footer's **Contact** link and the unsubscribe page lead to `contact.html`. A customer writes a message; it is saved in Firestore
(collection `messages`) and appears live in **/admin → Messages** (a gold counter shows unread ones). You read it, write back in the
same screen, and the answer shows on the customer's private conversation page (`contact.html?t=…`, kept in their browser and in the
confirmation). Nobody's personal email address is shown anywhere.
1. **Publish the new `firestore.rules`** (it has a `messages` section), otherwise sending fails with "We could not send your message".
2. **Optional: email the customer when you reply.** In EmailJS create a fourth template: To Email `{{to_email}}`, Reply To `{{reply_to}}`,
   Subject `A message from LA PLAGE`. Content:
   ```
   Hello {{customer_name}},

   {{reply_text}}

   Read and answer here: {{thread_link}}
   ```
   Paste its ID into `REPLY_TEMPLATE_ID` in `firebase-config.js`. Without it, replies still work; the customer just opens their page.

## Phone notifications (ntfy)
Every new message and every new pre-order sends a push to the free ntfy app.
1. Install **ntfy** (App Store / Google Play, or https://ntfy.sh on desktop).
2. Tap **+ Subscribe to topic** and enter exactly: `laplage-admin-6930082a18ac759b`  (leave the server as ntfy.sh).
3. That's it. The topic and server live in `firebase-config.js` under `NTFY`. Tapping a notification opens /admin on the right tab.
Everyone subscribed to that topic gets the alerts, so share it only with admins. Anyone who learns the topic could read (or spam) the alerts:
if that happens, change the topic in `firebase-config.js` to a new long random word and subscribe to the new one.
