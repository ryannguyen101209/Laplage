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

## Emails (one Gmail, one template)
The site sends all its emails through **EmailJS** (free, 200 emails a month), which sends them from **your own normal Gmail** (a website cannot log in to Gmail by itself; EmailJS is the connector).
What gets emailed:
- **New pre-order:** to every admin in `ADMIN_EMAILS` (full details) and a confirmation to the customer.
- **New contact message:** to the admins, and a "we got it" email to the customer. Your reply in /admin → Messages is emailed to them with a link to the conversation.
- **Mailing-list sign-up:** a welcome email with the unsubscribe link.
Setup (10 minutes):
1. Create a free account at https://www.emailjs.com.
2. **Email Services → Add New Service → Gmail → Connect Account**, and pick the Gmail the emails should come from (a normal one, e.g. the shop's address). Copy the **Service ID**.
3. **Email Templates → Create New Template** (just one). Settings: To Email `{{to_email}}`, Reply To `{{reply_to}}`, Subject `{{subject}}`. In the content, switch to the code/HTML view and paste:
   ```
   <div style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:15px;line-height:1.6">{{message}}</div>
   <p><a href="{{link}}">{{link}}</a></p>
   ```
   Save and copy the **Template ID**.
4. **Account → API keys → Public key.**
5. Put the three values in `firebase-config.js` under `EMAILJS` (`PUBLIC_KEY`, `SERVICE_ID`, `TEMPLATE_ID`) and push. Done: no other templates are needed.
Who receives admin emails is `ADMIN_EMAILS` in `firebase-config.js`.

## Mailing list (sign-ups, unsubscribe, privacy and terms)
The home page's "Notify me" form saves each address in Firestore (collection `subscribers`) under a long random token.
That token is the person's private unsubscribe key: `unsubscribe.html?t=TOKEN`. Nothing else is needed on a server.

1. **Publish the new `firestore.rules`** (Firestore Database → Rules → paste the whole file → Publish). It now has a `subscribers` section.
   Without this step sign-ups are refused and the form shows "We could not save your sign-up".
2. **Sending the 20 November announcement.** Open `/admin` → **Mailing list**.
   - "Copy subscribed emails" copies everyone currently subscribed (put them in **BCC**, never in To/CC).
   - "Export CSV" includes each person's own unsubscribe link, for mail-merge tools (Mailchimp, Brevo, Buttondown).
   - Every marketing email must contain a working unsubscribe link and your business name/contact. If you import the list into another mailing tool, use that tool's own unsubscribe, and then mark those people "Unsubscribe" here too so the lists stay in step.
   - Never email anyone listed as **unsubscribed**.
3. **Legal pages.** `privacy.html` and `terms.html` use `lookmanfc@gmail.com` as the contact and "LA PLAGE, Ho Chi Minh City" as the operator.
   Replace those with your registered business name, address and a business email, and have a lawyer check both pages before launch.

## Contact messages (internal inbox in the admin panel)
The footer's **Contact** link and the unsubscribe page lead to `contact.html`. A customer writes a message; it is saved in Firestore
(collection `messages`) and appears live in **/admin → Messages** (a gold counter shows unread ones). You read it, write back in the
same screen, and the answer shows on the customer's private conversation page (`contact.html?t=…`, kept in their browser and in the
confirmation). Nobody's personal email address is shown anywhere.
1. **Publish the new `firestore.rules`** (it has a `messages` section), otherwise sending fails with "We could not send your message".

## Phone notifications (ntfy)
Every new message and every new pre-order sends a push to the free ntfy app.
1. Install **ntfy** (App Store / Google Play, or https://ntfy.sh on desktop).
2. Tap **+ Subscribe to topic** and enter exactly: `laplage-admin-6930082a18ac759b`  (leave the server as ntfy.sh).
3. That's it. The topic and server live in `firebase-config.js` under `NTFY`. Tapping a notification opens /admin on the right tab.
Everyone subscribed to that topic gets the alerts, so share it only with admins. Anyone who learns the topic could read (or spam) the alerts:
if that happens, change the topic in `firebase-config.js` to a new long random word and subscribe to the new one.

