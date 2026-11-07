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
