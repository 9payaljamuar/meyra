import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

// Public policy pages (linked from the app, the Play Store listing and Razorpay onboarding).
// Drafted for an Indian marketplace (IT Act 2000, Consumer Protection (E-Commerce) Rules 2020, DPDP Act 2023);
// have them reviewed by the client's legal advisor before launch.

const UPDATED = '3 November 2026'
const CONTACT = (
  <p>
    <b>Grievance Officer, Meyra</b><br />
    Email: <a href="mailto:support@meyraglory.com">support@meyraglory.com</a> · Phone: +91 993-959-0555<br />
    Bengaluru, Karnataka 560075, India<br />
    We acknowledge complaints within 48 hours and resolve them within 30 days.
  </p>
)

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="legal">
      <header>
        <Link to="/"><img src="/logo.jpg" alt="Meyra" /></Link>
        <nav><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/refund-policy">Refunds</Link><Link to="/shipping-policy">Shipping</Link><Link to="/contact">Contact</Link></nav>
      </header>
      <article>
        <h1>{title}</h1>
        <p className="muted">Last updated {UPDATED}</p>
        {children}
      </article>
    </div>
  )
}

export function Privacy() {
  return (
    <Page title="Privacy Policy">
      <p>Meyra (“we”, “us”) runs the Meyra mobile app and the Meyra Partner Hub, a marketplace where independent sellers offer cosmetics, apparel and accessories to customers in India. This policy explains what personal data we collect, why, and the choices you have.</p>
      <h2>What we collect</h2>
      <ul>
        <li><b>Account details</b> – name, email, mobile number and password (stored only as a secure hash).</li>
        <li><b>Orders</b> – items, delivery address, payment method and order history.</li>
        <li><b>Payments</b> – processed by Razorpay. We never see or store your full card, UPI PIN or bank login details.</li>
        <li><b>Reviews and photos</b> you choose to post, and photos you add to return requests.</li>
        <li><b>Sellers</b> – business name, GSTIN, PAN, GST/PAN documents, pickup address and bank account for payouts.</li>
        <li><b>Device data</b> – basic technical information needed to keep you signed in and the app working.</li>
      </ul>
      <h2>Why we use it</h2>
      <ul>
        <li>To create your account, process and deliver orders, handle returns and refunds, and pay sellers.</li>
        <li>To send order, delivery and account messages by SMS, email and in-app notifications.</li>
        <li>To verify sellers (GST/KYC), prevent fraud and meet legal and tax obligations.</li>
        <li>To improve the catalogue and the app. We do not sell your personal data.</li>
      </ul>
      <h2>Who we share it with</h2>
      <ul>
        <li>The <b>seller</b> of your order, and <b>courier partners</b>, receive your name, phone and delivery address only to fulfil the order.</li>
        <li>Service providers who work for us: payments (Razorpay), SMS and email delivery, cloud hosting and storage. They may use the data only to provide their service.</li>
        <li>Government authorities when required by law.</li>
      </ul>
      <h2>How long we keep it</h2>
      <p>We keep account data while your account is active. Order and invoice records are kept for up to 8 years as required by tax laws. Seller KYC records are kept for as long as the seller account exists and as the law requires after that.</p>
      <h2>Your rights</h2>
      <p>Under the Digital Personal Data Protection Act, 2023, you can ask to access, correct or erase your personal data, and withdraw consent. You can <b>delete your account</b> in the app (Account → Delete account) or by emailing us. Deleting your account removes your name, contact details and saved data; order records are kept in anonymised form for tax purposes.</p>
      <h2>Security</h2>
      <p>Data is sent over encrypted connections (HTTPS). Passwords are hashed and access to personal data is limited to people who need it.</p>
      <h2>Children</h2>
      <p>Meyra is meant for users aged 18 and above. Under-18s may use it only with a parent or guardian’s involvement.</p>
      <h2>Contact and grievances</h2>
      {CONTACT}
    </Page>
  )
}

export function Terms() {
  return (
    <Page title="Terms of Use">
      <p>These terms apply to your use of the Meyra app and website. By creating an account or placing an order you agree to them.</p>
      <h2>The marketplace</h2>
      <p>Meyra is an online marketplace. Products are listed and sold by independent, GST-registered sellers who have completed KYC with us. Each product page shows the seller’s name. The seller is responsible for the product, its description, quality and legal compliance; Meyra provides the platform, payments and customer support.</p>
      <h2>Accounts</h2>
      <p>Keep your login details private and make sure your information is accurate. You are responsible for activity on your account. We may suspend accounts that misuse the platform, post fake reviews or commit fraud.</p>
      <h2>Prices and payment</h2>
      <p>Prices are in Indian Rupees and include applicable taxes. Delivery is free on orders of ₹499 and above; otherwise a delivery fee is shown at checkout. You can pay online through Razorpay or choose cash on delivery where available.</p>
      <h2>Cancellations</h2>
      <p>You can cancel an item before it ships from My Orders. Online payments for cancelled items are refunded to the original payment method.</p>
      <h2>Returns and refunds</h2>
      <ul>
        <li>Most items can be returned within <b>7 days of delivery</b> if they are unused, with tags and original packaging.</li>
        <li>For hygiene reasons, opened cosmetics and personal-care products can be returned only if they arrive damaged, defective or are the wrong item. Earrings cannot be returned once worn.</li>
        <li>Refunds for online payments go to the original payment method within 5–7 working days of the seller receiving the item. Cash-on-delivery refunds are paid by UPI or bank transfer.</li>
      </ul>
      <h2>Reviews</h2>
      <p>Reviews must be honest and relate to the product. We may remove reviews that are abusive, misleading or unrelated.</p>
      <h2>Sellers</h2>
      <p>Sellers must hold a valid GST registration, complete KYC, list only genuine products they are allowed to sell, ship on time and honour the return policy. Meyra deducts its commission from each sale and pays the balance for delivered orders to the seller’s registered bank account.</p>
      <h2>Liability</h2>
      <p>To the extent permitted by law, Meyra is not liable for indirect losses. Our liability for any order is limited to the amount paid for it. Nothing in these terms affects your rights under the Consumer Protection Act, 2019.</p>
      <h2>Law and disputes</h2>
      <p>These terms are governed by the laws of India. Courts in Bengaluru, Karnataka have jurisdiction.</p>
      <h2>Contact and grievances</h2>
      {CONTACT}
    </Page>
  )
}

export function SellerAgreement() {
  return (
    <Page title="Seller Agreement">
      <p>This agreement is between Meyra (the marketplace operator) and you, the seller registering on the Meyra Partner Hub. By ticking “I agree” during registration you accept these terms.</p>
      <h2>Eligibility and KYC</h2>
      <ul>
        <li>You must hold a valid GST registration and provide accurate business, PAN and bank details.</li>
        <li>Meyra verifies your documents before you can list products and may ask for more information at any time.</li>
      </ul>
      <h2>Listings</h2>
      <ul>
        <li>Listing is free. Every product and every change to it is reviewed by Meyra before it goes live.</li>
        <li>You may list only genuine products you are legally allowed to sell, with accurate descriptions, photos, prices, HSN codes and GST rates.</li>
        <li>Prices you set are inclusive of GST and must not exceed the MRP.</li>
        <li>Meyra may reject, suspend or remove listings that break these rules or the law.</li>
      </ul>
      <h2>Orders and shipping</h2>
      <ul>
        <li>Ship orders within 2 working days and add the courier and tracking number in the Partner Hub.</li>
        <li>You issue the GST tax invoice for every sale; the Partner Hub generates it with your details when you mark the order shipped. Include it in the parcel.</li>
        <li>Keep enough stock. Repeated cancellations by the seller may lead to suspension.</li>
      </ul>
      <h2>Returns</h2>
      <p>You accept returns under Meyra’s customer return policy (7 days from delivery; hygiene exceptions for opened cosmetics). Refunds are issued once the returned item reaches you; you must inspect and confirm within 2 working days.</p>
      <h2>Fees and deductions</h2>
      <ul>
        <li>Meyra charges a commission on each sale, shown in the Partner Hub (default 10%, may differ by category or be agreed separately). GST at 18% applies to the commission.</li>
        <li>As an e-commerce operator, Meyra deducts and deposits 1% GST TCS (section 52, CGST Act) and 0.1% income-tax TDS (section 194-O) on your sales. These appear in your statements and can be claimed by you in your returns.</li>
        <li>Your earnings for delivered orders, after these deductions, are paid to your registered bank account on the payout schedule Meyra publishes. Amounts for returned or refunded items are not paid out.</li>
      </ul>
      <h2>Your responsibilities</h2>
      <p>You are responsible for product quality, safety, labelling (including legal metrology and cosmetic labelling rules), warranties and your own tax filings. You will not contact customers outside Meyra for marketing, or ask them to buy off-platform.</p>
      <h2>Suspension and termination</h2>
      <p>Either party may end this agreement with 15 days’ notice. Meyra may suspend a seller immediately for fraud, counterfeit goods, repeated policy breaches or legal requirements. Pending payouts for delivered orders are settled after the return window closes.</p>
      <h2>Law</h2>
      <p>This agreement is governed by Indian law; courts in Bengaluru, Karnataka have jurisdiction.</p>
      <h2>Contact</h2>
      {CONTACT}
    </Page>
  )
}

export function RefundPolicy() {
  return (
    <Page title="Refund & Cancellation Policy">
      <h2>Cancelling an order</h2>
      <ul>
        <li>You can cancel any item before it ships from <b>My Orders</b> in the Meyra app.</li>
        <li>If you paid online, the full amount for the cancelled item is refunded to your original payment method.</li>
        <li>Sellers may cancel an item if it is out of stock; you are refunded in full and notified by SMS/email.</li>
      </ul>
      <h2>Returns</h2>
      <ul>
        <li>Request a return within <b>7 days of delivery</b> from My Orders, with the reason and photos if the item is damaged or wrong.</li>
        <li>Items must be unused, with original tags and packaging.</li>
        <li>Opened cosmetics and personal-care products, and earrings, can be returned only if they arrive damaged, defective, expired or are the wrong item.</li>
        <li>The seller reviews the request within 2 working days. Once approved, the item is picked up from your address.</li>
      </ul>
      <h2>Refunds</h2>
      <ul>
        <li>Refunds are issued after the returned item reaches the seller and passes inspection.</li>
        <li><b>Online payments</b> (UPI, cards, netbanking, wallets): refunded to the original payment method through Razorpay, usually within <b>5–7 working days</b>.</li>
        <li><b>Cash on delivery</b>: refunded by UPI or bank transfer to the details you share with our support team, within 7 working days.</li>
        <li>Delivery charges are refunded only if the whole order is returned because of a seller error.</li>
      </ul>
      <h2>Need help?</h2>
      {CONTACT}
    </Page>
  )
}

export function ShippingPolicy() {
  return (
    <Page title="Shipping Policy">
      <ul>
        <li>We deliver across India through courier partners. Each seller ships their items separately, so one order may arrive in more than one parcel.</li>
        <li>Sellers dispatch orders within <b>2 working days</b>. Delivery usually takes <b>3–7 working days</b> after dispatch, depending on your pincode.</li>
        <li>Delivery is <b>free on orders of ₹499 and above</b>; a ₹49 delivery fee applies to smaller orders and is shown at checkout.</li>
        <li>Cash on delivery is available on most pincodes. Please keep the exact amount ready.</li>
        <li>You get an SMS/email with the courier name and tracking number when your order ships, and can track it in My Orders.</li>
        <li>If a parcel arrives damaged or tampered with, please refuse it or report it within 48 hours with photos so we can help.</li>
      </ul>
      <h2>Contact</h2>
      {CONTACT}
    </Page>
  )
}

export function Contact() {
  return (
    <Page title="Contact Us">
      <p>We’re here to help with orders, returns, refunds and selling on Meyra.</p>
      <p>
        <b>Meyra</b><br />
        Email: <a href="mailto:support@meyraglory.com">support@meyraglory.com</a><br />
        Phone / WhatsApp: +91 993-959-0555 (Mon–Sat, 10 AM – 7 PM)<br />
        Bengaluru, Karnataka 560075, India
      </p>
      <p>Sellers can also log in to the <Link to="/login">Meyra Partner Hub</Link>.</p>
      <h2>Grievance Officer</h2>
      {CONTACT}
    </Page>
  )
}

export function DeleteAccount() {
  const [contact, setContact] = useState('')
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    try {
      await api('/deletion-requests', { body: { contact, reason: reason || undefined } })
      setDone(true)
    } catch (e: any) {
      setErr(e.message)
    }
  }
  return (
    <Page title="Delete your Meyra account">
      <h2>Fastest: from the app</h2>
      <p>Open the Meyra app → <b>Account</b> → <b>Delete account</b> → confirm. Your account is deleted immediately.</p>
      <h2>Or request it here</h2>
      <p>No access to the app? Send us the email or mobile number on your account. We verify that it’s you and delete the account within 7 days.</p>
      {done ? (
        <div className="ok">Request received. We’ll contact you on {contact} to confirm, then delete the account.</div>
      ) : (
        <form className="form" onSubmit={submit} style={{ maxWidth: 460 }}>
          {err && <div className="error">{err}</div>}
          <label className="field">Email or mobile number on your account<input value={contact} onChange={e => setContact(e.target.value)} required /></label>
          <label className="field">Reason (optional)<textarea value={reason} onChange={e => setReason(e.target.value)} /></label>
          <button className="btn">Request account deletion</button>
        </form>
      )}
      <h2>What gets deleted</h2>
      <ul>
        <li>Your name, email, mobile number, saved addresses, wishlist and reviews.</li>
        <li>Order and invoice records are kept in anonymised form for up to 8 years, as required by tax law.</li>
      </ul>
    </Page>
  )
}
