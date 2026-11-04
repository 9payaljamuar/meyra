# Meyra — Google Play listing pack

Everything to copy into Play Console for **com.meyraglory.shop** (version 1.0.0, versionCode 1).

| File | Use |
|---|---|
| `builds/meyra-1.0.0-live.aab` | Upload in **Testing → Closed testing → Create release** (rebuild after icon change: see bottom) |
| `store/icon-512.png` | Store listing → App icon (512×512, 32-bit PNG) |
| `store/feature-graphic-1024x500.png` | Store listing → Feature graphic |
| Phone screenshots | Take 4–8 on a phone from the installed app (Home, Product, Shop with filters, Bag/Checkout, Orders tracking, Login). 1080×2400 is fine. |

---

## Store listing

**App name** (max 30): `Meyra: Beauty & Fashion`

**Short description** (max 80):
`Shop skincare, haircare, dresses & jewellery from verified Indian sellers.`

**Full description** (max 4000):

```
Meyra brings together skincare, haircare, fashion and jewellery from India's finest boutiques and homegrown brands — all in one beautifully simple app.

FIND WHAT SUITS YOU
• Filter skincare by skin type and haircare by hair type
• Browse by price, discount, category and shade
• See every shade and colour before you buy, with stock shown per size

SHOP WITH CONFIDENCE
• Every seller is GST-registered and KYC-verified by Meyra
• Real reviews and photos from verified buyers
• Prices include GST, with a proper tax invoice for every order

EASY ORDERS
• Free delivery on orders of ₹499 and above
• Cash on delivery available
• Track every parcel step by step with courier tracking
• Easy 7-day returns and quick refunds

MADE FOR YOU
• Save favourites to your wishlist
• Double-tap a photo to save it
• Delete your account anytime from the app

Meyra — Crafting Confidence.

Have a brand or boutique? Sell on Meyra: free listing, quick GST-based onboarding and payouts straight to your bank. Register at partners.meyraglory.com.

Help: support@meyraglory.com · +91 993-959-0555
```

**App category:** Shopping · **Tags:** Beauty, Fashion, Shopping
**Contact email:** support@meyraglory.com · **Phone:** +91 9939590555 · **Website:** https://partners.meyraglory.com
**Privacy policy URL:** https://partners.meyraglory.com/privacy

---

## App content (Policy → App content)

**Privacy policy:** https://partners.meyraglory.com/privacy

**Ads:** No, the app does not contain ads.

**App access:** *All or some functionality is restricted* → add instructions:
```
Browsing works without login. To place orders, sign in:
Email: reviewer@meyraglory.com   Password: (see note below)
or tap "Continue with mobile number" with any 10-digit number — test code 123456 (while SMS is in test mode).
Choose Cash on Delivery at checkout; test orders are cancelled by our team.
```
> Create this reviewer account in the app (Join) right before submitting, and put its password here.

**Content rating:** Start questionnaire → category *All other app types* (or *Shopping/E-commerce* if offered).
Answer **No** to violence, sexuality, language, controlled substances, gambling. **Yes** to "users can interact or share content" (public product reviews with photos). **No** to sharing location, **No** to digital purchases (only physical goods). Expected rating: **Everyone / 3+**.

**Target audience:** 18 and over. Not designed for children.

**News app:** No · **Government app:** No · **Health app:** No · **Financial features:** None (payments are processed by Razorpay; the app offers no loans, banking or investments).

**Account deletion:**
- Users can delete their account in the app: **Account → Delete account**.
- Web link for deletion requests: **https://partners.meyraglory.com/delete-account**

### Data safety
- Does your app collect or share user data? **Yes**
- Is all data encrypted in transit? **Yes** (HTTPS only)
- Do you provide a way to request deletion? **Yes**

| Data type | Collected | Shared | Required? | Purposes |
|---|---|---|---|---|
| Personal info → **Name** | Yes | Yes (with the seller and courier for delivery) | Required | App functionality, Account management |
| Personal info → **Email address** | Yes | No | Required (email login) | Account management, App functionality (order & password emails) |
| Personal info → **Phone number** | Yes | Yes (seller and courier for delivery) | Required for orders | App functionality, Account management |
| Personal info → **Address** | Yes | Yes (seller and courier for delivery) | Required for orders | App functionality |
| Financial info → **Purchase history** | Yes | No | Required | App functionality |
| Photos and videos → **Photos** | Yes | No (shown publicly only if added to a review) | Optional | App functionality (reviews, return requests) |

Not collected: precise/approximate location, contacts, payment card/UPI details (entered on Razorpay's page, never in the app), device or advertising IDs, health, messages, files.

---

## Release
1. **Testing → Closed testing → Create track** → upload the `.aab` → release name `1.0.0`.
   Release notes: `First release of Meyra — shop beauty, fashion and jewellery from verified Indian sellers.`
2. **Testers:** create an email list with at least **12** Gmail addresses → copy the opt-in link and send it to them. They must join and **keep the app installed for 14 days** (personal developer accounts).
3. Accept **Play App Signing** when prompted (Google keeps the app signing key; our upload key in `~/.meyra-keys/` is used to upload).
4. After 14 days: **Dashboard → Apply for production** → answer the short questionnaire → release to Production.

**Each new upload needs a higher `versionCode`** (android/app/build.gradle). Build: `cd apps/mobile/android && ./gradlew bundleRelease`.

## Before Production (not needed for closed testing)
- Real OTP (MSG91) — removes the fixed test code 123456
- Email (SMTP) for password reset and order emails
- Razorpay for online payments
- Meyra GSTIN in Admin → Tax & compliance
- `launch-reset` to remove demo sellers, products and reviews
