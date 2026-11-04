import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import JsBarcode from 'jsbarcode'
import { api, date, inr } from '../api'

type DocData = {
  item: {
    id: number; name: string; option: string | null; size: string | null; qty: number; hsn: string | null; gstRate: number
    unitPrice: number; lineTotal: number; taxable: number; cgst: number; sgst: number; igst: number
    status: string; invoiceNo: string | null; invoicedAt: string | null; courier: string | null; awb: string | null
  }
  order: { no: number; date: string; paymentMethod: string; paid: boolean; codAmount: number }
  seller: { name: string; gstin: string; address: string | null; state: string; stateCode: string }
  buyer: { name: string; phone: string; line1: string; city: string; state: string; pincode: string; email: string }
  platform: { name: string; gstin: string; address: string }
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
  'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function words(n: number): string {
  if (n < 20) return ONES[n]
  if (n < 100) return `${TENS[Math.floor(n / 10)]} ${ONES[n % 10]}`.trim()
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} Hundred ${words(n % 100)}`.trim()
  if (n < 100000) return `${words(Math.floor(n / 1000))} Thousand ${words(n % 1000)}`.trim()
  if (n < 10000000) return `${words(Math.floor(n / 100000))} Lakh ${words(n % 100000)}`.trim()
  return `${words(Math.floor(n / 10000000))} Crore ${words(n % 10000000)}`.trim()
}

/** Indian-style amount in words, e.g. "Rupees One Thousand Five Hundred and Paise Fifty Only". */
function amountInWords(amount: number) {
  const rupees = Math.floor(amount)
  const paise = Math.round((amount - rupees) * 100)
  return `Rupees ${words(rupees) || 'Zero'}${paise ? ` and ${words(paise)} Paise` : ''} Only`
}

function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (ref.current) JsBarcode(ref.current, value, { format: 'CODE128', height: 48, width: 1.8, fontSize: 13, margin: 0 })
  }, [value])
  return <svg ref={ref} />
}

export default function Doc() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const kind = params.get('kind') === 'label' ? 'label' : 'invoice'
  const [d, setD] = useState<DocData | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    api<DocData>(`/documents/${id}?t=${params.get('t') ?? ''}`).then(setD, e => setErr(e.message))
  }, [id])

  useEffect(() => {
    if (d) document.title = kind === 'invoice' ? `Invoice ${d.item.invoiceNo}` : `Label – Order ${d.order.no}`
  }, [d, kind])

  if (err) return <div className="doc-page"><div className="error">{err}</div></div>
  if (!d) return null
  const { item, order, seller, buyer, platform } = d
  const variant = [item.option, item.size && `Size ${item.size}`].filter(Boolean).join(', ')
  const intra = item.igst === 0

  return (
    <div className="doc-page">
      <div className="doc-actions no-print">
        <button className="btn" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>

      {kind === 'invoice' ? (
        item.invoiceNo ? (
          <div className="sheet invoice">
            <div className="inv-head">
              <div>
                <h1>Tax Invoice</h1>
                <div className="muted small">Original for recipient</div>
              </div>
              <dl>
                <dt>Invoice no.</dt><dd>{item.invoiceNo}</dd>
                <dt>Invoice date</dt><dd>{date(item.invoicedAt!)}</dd>
                <dt>Order no.</dt><dd>#{order.no} ({date(order.date)})</dd>
              </dl>
            </div>
            <div className="inv-parties">
              <div>
                <h3>Sold by</h3>
                <b>{seller.name}</b>
                <p>{seller.address ?? ''}</p>
                <p>GSTIN: <b>{seller.gstin}</b><br />State: {seller.state} ({seller.stateCode})</p>
              </div>
              <div>
                <h3>Bill to / Ship to</h3>
                <b>{buyer.name}</b>
                <p>{buyer.line1}<br />{buyer.city}, {buyer.state} – {buyer.pincode}<br />Phone: {buyer.phone}</p>
                <p>Place of supply: {buyer.state}</p>
              </div>
            </div>
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Item</th><th>HSN</th><th className="num">Qty</th><th className="num">Rate (incl. GST)</th><th className="num">Taxable value</th>
                  {intra ? <><th className="num">CGST {item.gstRate / 2}%</th><th className="num">SGST {item.gstRate / 2}%</th></> : <th className="num">IGST {item.gstRate}%</th>}
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{item.name}{variant && <div className="muted small">{variant}</div>}</td>
                  <td>{item.hsn ?? '—'}</td>
                  <td className="num">{item.qty}</td>
                  <td className="num">{inr(item.unitPrice)}</td>
                  <td className="num">{inr(item.taxable)}</td>
                  {intra ? <><td className="num">{inr(item.cgst)}</td><td className="num">{inr(item.sgst)}</td></> : <td className="num">{inr(item.igst)}</td>}
                  <td className="num"><b>{inr(item.lineTotal)}</b></td>
                </tr>
              </tbody>
              <tfoot>
                <tr><td colSpan={intra ? 7 : 6} className="num">Total</td><td className="num"><b>{inr(item.lineTotal)}</b></td></tr>
              </tfoot>
            </table>
            <p><b>Amount in words:</b> {amountInWords(item.lineTotal)}</p>
            <p className="small">Payment: {order.paymentMethod === 'COD' ? 'Cash on delivery' : 'Prepaid online'}. Tax is not payable on reverse charge.</p>
            <p className="small muted">
              Supplied through the e-commerce operator {platform.name}{platform.gstin ? ` (GSTIN ${platform.gstin})` : ''}, {platform.address}.
              This is a computer-generated invoice and does not need a signature.
            </p>
          </div>
        ) : (
          <div className="sheet"><p>The invoice is generated when the order ships.</p></div>
        )
      ) : (
        <>
          <div className="sheet label">
            <div className="lbl-row lbl-top">
              <div>
                <div className="lbl-k">{order.paymentMethod === 'COD' ? 'CASH ON DELIVERY' : 'PREPAID'}</div>
                {order.paymentMethod === 'COD' && <div className="lbl-cod">Collect {inr(order.codAmount)}</div>}
              </div>
              <div className="lbl-brand">{platform.name}</div>
            </div>
            <div className="lbl-row">
              <div className="lbl-k">Ship to</div>
              <div className="lbl-to">
                <b>{buyer.name}</b><br />{buyer.line1}<br />{buyer.city}, {buyer.state}<br /><b className="lbl-pin">{buyer.pincode}</b><br />Phone: {buyer.phone}
              </div>
            </div>
            {item.awb && (
              <div className="lbl-row lbl-center">
                <div className="lbl-k">{item.courier} · AWB</div>
                <Barcode value={item.awb} />
              </div>
            )}
            <div className="lbl-row lbl-center">
              <div className="lbl-k">Order</div>
              <Barcode value={`MEY${order.no}-${item.id}`} />
            </div>
            <div className="lbl-row small">
              <div className="lbl-k">Return to</div>
              {seller.name}, {seller.address ?? ''} · GSTIN {seller.gstin}
            </div>
          </div>

          <div className="sheet slip">
            <h2>Packing slip</h2>
            <p className="small">Order #{order.no} · {date(order.date)} · {order.paymentMethod === 'COD' ? `COD ${inr(order.codAmount)}` : 'Prepaid'}</p>
            <table className="inv-table">
              <thead><tr><th>Item</th><th>Variant</th><th className="num">Qty</th><th>Packed ✓</th></tr></thead>
              <tbody><tr><td>{item.name}</td><td>{variant || '—'}</td><td className="num">{item.qty}</td><td>☐</td></tr></tbody>
            </table>
            <p className="small muted">Pack with the tags on. Include the printed invoice inside the parcel once the order is marked shipped.</p>
          </div>
        </>
      )}
    </div>
  )
}
