# Meyra Marketplace

Multi-vendor marketplace for cosmetics, apparel and accessories. Any business with a GST number can register, pass KYC and list products for free. Meyra takes an automatic commission on each sale.

```
apps/
  api/     Node + Express + PostgreSQL. One REST API for every client.
  web/     React (Vite) web app: Seller Hub (/seller) and Admin Console (/admin)
  mobile/  React Native CLI customer app (Android/iOS)
```

## How it fits together

1. **Seller registers** (web `/seller/register` or the app's "Sell on Meyra") with GSTIN + PAN, then uploads the GST certificate, PAN card and bank details.
2. **Admin approves KYC** in Admin Console → Sellers & KYC.
3. **Seller adds products** (photos, price/MRP, stock, skin/hair types, shades/colours, sizes). New products and later edits wait for approval.
4. **Admin approves the product**, which makes it live in the customer app. Admin can also mark it Featured, which shows it as a Bestseller.
5. **Customer buys** in the app. The order is split per seller, and commission is calculated and frozen on each line (seller override → category rate → default).
6. **Seller ships and marks delivered.** The delivered amount becomes the payout balance, and the admin records bank payouts.
7. **Customer reviews** with rating, text and photos. Reviews from buyers who ordered the product are marked "Verified purchase". Admin can remove reviews.

## Run locally

Requires Node 22+ and Docker.

```bash
npm install                      # api + web workspaces
cp apps/api/.env.example apps/api/.env
npm run db:up                    # Postgres on localhost:5436
npm run seed                     # demo data (wipes the DB)
npm run dev                      # API :4000 + web :5175
```

Web: http://localhost:5175

| Role     | Email                 | Password    |
|----------|-----------------------|-------------|
| Admin    | admin@meyra.app       | admin123    |
| Seller   | meyra@seller.app      | seller123   |
| Seller (KYC pending) | glowlab@seller.app | seller123 |
| Customer (app) | customer@meyra.app | customer123 |

Other demo sellers: silvertales@, clipco@, urbanfrock@ `seller.app` (password `seller123`).

### Mobile app

```bash
cd apps/mobile
npm install
npx react-native run-android                     # dev, with a device/emulator attached
cd android && ./gradlew assembleRelease \
  -PreactNativeArchitectures=arm64-v8a,x86_64    # APK -> android/app/build/outputs/apk/release/
```

`apps/mobile/src/config.ts`:
- `USE_MOCK = true` (current): the app runs fully offline on built-in demo data. Good for sharing previews.
- `USE_MOCK = false`: the app talks to `API_URL` (e.g. `https://app.meyraglory.com/api`, or `http://<LAN-IP>:4000/api` on the same Wi-Fi).

## Integrations

Each one works in **test mode** with no keys and goes live when its keys are added to `apps/api/.env` (see `.env.example`). You can check the status in Admin → Integrations, and the Message outbox there shows every SMS and email.

| Feature | Provider | Test mode behaviour |
|---|---|---|
| Online payments + refunds | Razorpay Payment Links + webhook | Simulated checkout in the app; refunds recorded |
| OTP login, order SMS | MSG91 (DLT templates) | The OTP is returned to the app and logged; SMS appear in the outbox |
| Emails | Any SMTP | Logged to the outbox |
| GSTIN verification | Checksum always runs; live lookup through any GSP API | Checksum only |
| Shipping | Seller enters courier + AWB; Shiprocket booking | Manual AWB only |
| Photo storage | S3 / Cloudflare R2 / Spaces | Local `uploads/` folder |

Order lifecycle: `pending_payment → placed → shipped → delivered → (return_requested → return_approved → refunded)`, or `cancelled`. Online payments are refunded automatically through Razorpay. Cash-on-delivery refunds show up in Admin → Orders → Refunds so you can pay them by UPI or bank and record the reference.

## Deploy

**Option A: Render (easiest).** Push this repo to GitHub, then go to render.com → New → Blueprint and pick the repo. `render.yaml` creates Postgres and the app. Then:
1. Set `PUBLIC_URL` and any provider keys.
2. Run the seed once from the Render shell: `cd apps/api && npx tsx src/seed.ts` (optional demo data).

**Option B: any VPS with Docker.**
```bash
cp apps/api/.env.example apps/api/.env            # set JWT_SECRET, PUBLIC_URL, keys
docker compose -f docker-compose.prod.yml up -d --build
```
Put Caddy in front for HTTPS: `caddy reverse-proxy --from app.meyraglory.com --to localhost:4000`.

The single container serves the web panel at `/` and the API at `/api`. After deploying:
- Set `USE_MOCK = false` and `API_URL = 'https://<domain>/api'` in the mobile config.
- Set `usesCleartextTraffic` to `false` in `AndroidManifest.xml`.
- Rebuild the APK.
- Razorpay webhook: `https://<domain>/api/webhooks/razorpay` (events `payment_link.paid`, `payment_link.expired`, `payment_link.cancelled`).

## Still to do before Play Store launch

- Release signing keystore (release builds use the debug key right now) and the Play Store listing.
- Push notifications (FCM). SMS, email and in-app notifications are done.
- Seller bank-account verification (penny drop), and automated payouts with RazorpayX or Razorpay Route. Payouts are recorded manually today.
- GST invoices / TCS reports for sellers.
