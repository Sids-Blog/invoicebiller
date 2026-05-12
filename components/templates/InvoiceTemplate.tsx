import React from 'react';
import { BillItem, Bill, SellerInfo } from '@/lib/types';

export interface Customer {
  name: string;
  address?: string;
}

interface InvoiceTemplateProps {
  billCalculations: {
    sgst: number;
    cgst: number;
    cess: number;
    taxableValue: number;
    subtotal: number;
    grandTotal: number;
    discount: number;
    roundOff?: number;
    roundedTotal?: number;
  };
  billDetails: Bill;
  items: BillItem[];
  customerDetails: Customer;
  sellerInfo?: SellerInfo;
}

const numberToWords = (n: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function below100(num: number): string {
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  }
  function below1000(num: number): string {
    if (num < 100) return below100(num);
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + below100(num % 100) : '');
  }

  let rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  if (rupees === 0) return 'Zero Rupees Only';

  let result = '';
  if (rupees >= 10000000) { result += below1000(Math.floor(rupees / 10000000)) + ' Crore '; rupees %= 10000000; }
  if (rupees >= 100000) { result += below100(Math.floor(rupees / 100000)) + ' Lakh '; rupees %= 100000; }
  if (rupees >= 1000) { result += below100(Math.floor(rupees / 1000)) + ' Thousand '; rupees %= 1000; }
  if (rupees > 0) { result += below1000(rupees) + ' '; }

  result = result.trim() + ' Rupees';
  if (paise > 0) result += ' and ' + below100(paise) + ' Paise';
  return result + ' Only';
};

function fmt(n: number | undefined) {
  if (n === undefined || isNaN(n)) return "0.00";
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
}

function fmtDate(dateStr: string | undefined) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ billCalculations, billDetails, items, customerDetails, sellerInfo }) => {
  const isGst = billDetails.is_gst_bill;
  const isQuotation = billDetails.type === "quotation";

  // Build tax breakdown for the GST table
  const taxBreakdownMap: Record<number, { rate: number, taxable: number, tax: number }> = {};
  if (isGst) {
    items.forEach(item => {
      const rate = (item.cgst_rate || 0) + (item.sgst_rate || 0) || item.tax_rate || 0;
      if (!taxBreakdownMap[rate]) {
        taxBreakdownMap[rate] = { rate, taxable: 0, tax: 0 };
      }
      const grossAmt = item.quantity * item.price;
      const globalDiscProportion = billCalculations.subtotal > 0 ? (grossAmt / billCalculations.subtotal) * (billCalculations.discount || 0) : 0;
      const taxable = grossAmt - globalDiscProportion;
      const taxAmt = taxable * (rate / 100);

      taxBreakdownMap[rate].taxable += taxable;
      taxBreakdownMap[rate].tax += taxAmt;
    });
  }
  const taxBreakdown = Object.values(taxBreakdownMap);

  return (
    <>
      <style>{`
        .invoice-page-custom {
          --brand-primary   : #0E1F40;
          --brand-accent    : #C8960C;
          --brand-accent-lt : #FDF3D8;
          --text-primary    : #111827;
          --text-secondary  : #4B5563;
          --text-muted      : #9CA3AF;
          --border-color    : #D1D5DB;
          --border-strong   : #6B7280;
          --bg-header       : #0E1F40;
          --bg-table-head   : #1E2F50;
          --bg-row-alt      : #F9FAFB;
          --bg-total        : #F3F4F6;
          --bg-grand-total  : #0E1F40;
          --font-display    : 'Crimson Pro', Georgia, serif;
          --font-body       : 'Inter', sans-serif;
          --font-mono       : 'DM Mono', 'Courier New', monospace;
          --page-width      : 210mm;
          --page-padding    : 12mm;
          --radius          : 3px;

          font-family    : var(--font-body);
          font-size      : 12px;
          color          : var(--text-primary);
          background     : #fff;
          line-height    : 1.5;
          width          : var(--page-width);
          min-height     : 297mm;
          margin         : 20px auto;
          position       : relative;
          box-sizing     : border-box;
          padding        : var(--page-padding);
          box-shadow     : 0 4px 24px rgba(0,0,0,0.12);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          display        : flex;
          flex-direction : column;
        }

        @media print {
          body          { background: #fff; }
          .invoice-page-custom { margin: 0; box-shadow: none; width: 100%; min-height: 100vh; padding: 10mm; }
          .no-print     { display: none !important; }
          @page         { size: A4; margin: 8mm; }
        }

        .invoice-page-custom * { box-sizing: border-box; }

        .inv-header {
          display         : grid;
          grid-template-columns: 1fr auto;
          gap             : 12px;
          background      : var(--bg-header);
          color           : #fff;
          padding         : 14px 16px;
          margin-bottom   : 0;
        }

        .inv-header__logo-name {
          font-family : var(--font-display);
          font-size   : 24px;
          font-weight : 700;
          color       : #fff;
          letter-spacing: 0.3px;
        }

        .inv-header__logo-name span { color: var(--brand-accent); }

        .inv-header__tagline {
          font-size   : 10px;
          font-weight : 600;
          color       : rgba(255,255,255,0.7);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-top  : 2px;
        }

        .inv-header__title { text-align: right; }

        .inv-header__title h1 {
          font-family : var(--font-display);
          font-size   : 22px;
          font-weight : 700;
          color       : var(--brand-accent);
          letter-spacing: 1px;
          text-transform: uppercase;
          margin: 0;
        }

        .inv-type-badge {
          display       : inline-block;
          font-size     : 9px;
          font-weight   : 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color         : rgba(255,255,255,0.6);
          border        : 0.5px solid rgba(255,255,255,0.25);
          padding       : 2px 8px;
          border-radius : 20px;
          margin-top    : 4px;
        }

        .inv-accent-bar {
          height     : 3px;
          background : linear-gradient(90deg, var(--brand-accent) 0%, #E8B84B 50%, var(--brand-accent) 100%);
        }

        .inv-supplier-strip {
          background   : #F8F9FB;
          border-bottom: 0.5px solid var(--border-color);
          padding      : 10px 16px;
          display      : grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap          : 12px;
        }

        .inv-supplier-strip__field label {
          font-size    : 9px;
          font-weight  : 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          color        : var(--text-muted);
          display      : block;
          margin-bottom: 2px;
        }

        .inv-supplier-strip__field span {
          font-size    : 11px;
          color        : var(--text-primary);
          font-weight  : 600;
        }

        .inv-supplier-strip__field .gstin {
          font-family  : var(--font-mono);
          font-size    : 11px;
          color        : var(--brand-primary);
          letter-spacing: 1px;
          font-weight  : 700;
        }

        .inv-meta-customer {
          display      : grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 0.5px solid var(--border-color);
        }

        .inv-meta, .inv-customer { padding: 10px 14px; }
        .inv-meta { border-right: 0.5px solid var(--border-color); }

        .inv-meta-customer__section-label {
          font-size    : 9px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color        : var(--brand-primary);
          font-weight  : 700;
          padding-bottom: 5px;
          border-bottom: 1px solid var(--brand-accent);
          margin-bottom: 8px;
          display      : inline-block;
        }

        .inv-field-row {
          display      : grid;
          grid-template-columns: 110px 1fr;
          gap          : 4px;
          margin-bottom: 5px;
          align-items  : start;
        }

        .inv-field-row label {
          font-size    : 10px;
          font-weight  : 600;
          color        : var(--text-muted);
          padding-top  : 1px;
        }

        .inv-field-row span,
        .inv-field-row address {
          font-size    : 11px;
          color        : var(--text-primary);
          font-style   : normal;
          font-weight  : 600;
          line-height  : 1.4;
          margin: 0;
        }

        .inv-supply-strip {
          display      : grid;
          grid-template-columns: repeat(4, 1fr);
          border-bottom: 0.5px solid var(--border-color);
        }

        .inv-supply-strip__cell {
          padding      : 7px 12px;
          border-right : 0.5px solid var(--border-color);
        }

        .inv-supply-strip__cell:last-child { border-right: none; }

        .inv-supply-strip__cell label {
          font-size    : 7.5px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color        : var(--text-muted);
          display      : block;
          margin-bottom: 2px;
        }

        .inv-supply-strip__cell span {
          font-size    : 9.5px;
          font-weight  : 500;
          color        : var(--text-primary);
        }

        .inv-supply-strip__cell .tax-type {
          display      : inline-block;
          background   : var(--brand-accent-lt);
          color        : #7A5F00;
          font-size    : 8px;
          font-weight  : 600;
          padding      : 1px 7px;
          border-radius: 10px;
          letter-spacing: 0.5px;
          border       : 0.5px solid var(--brand-accent);
        }

        .inv-items {
          width        : 100%;
          border-collapse: collapse;
          border-bottom: 0.5px solid var(--border-color);
          font-size    : 10px;
          font-weight  : 500;
        }

        .inv-items thead tr {
          background   : var(--bg-table-head);
          color        : #fff;
        }

        .inv-items thead th {
          padding      : 7px 8px;
          text-align   : left;
          font-weight  : 700;
          font-size    : 9.5px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          border-right : 0.5px solid rgba(255,255,255,0.1);
          white-space  : nowrap;
        }

        .inv-items thead th:last-child { border-right: none; }
        .inv-items thead th.num        { text-align: center; }
        .inv-items thead th.right      { text-align: right; }

        .inv-items tbody tr { border-bottom: 0.5px solid var(--border-color); }
        .inv-items tbody tr:nth-child(even) { background: var(--bg-row-alt); }

        .inv-items tbody td {
          padding      : 7px 8px;
          vertical-align: top;
          border-right : 0.5px solid var(--border-color);
        }

        .inv-items tbody td:last-child { border-right: none; }

        .inv-items td.num    { text-align: center; color: var(--text-muted); font-weight: 600; }
        .inv-items td.right  { text-align: right; font-family: var(--font-mono); font-size: 10px; font-weight: 600; }
        .inv-items td.center { text-align: center; font-weight: 600; }

        .inv-items td .item-name {
          font-weight  : 700;
          font-size    : 11px;
          color        : var(--text-primary);
          margin-bottom: 1px;
        }

        .inv-items td .item-desc {
          font-size    : 9.5px;
          font-weight  : 500;
          color        : var(--text-secondary);
          line-height  : 1.4;
        }

        .inv-items td .hsn-badge {
          display      : inline-block;
          font-family  : var(--font-mono);
          font-size    : 7.5px;
          color        : var(--text-muted);
          background   : #F3F4F6;
          padding      : 1px 5px;
          border-radius: 2px;
          margin-top   : 2px;
          border       : 0.5px solid var(--border-color);
        }

        .inv-financials {
          display      : grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 0.5px solid var(--border-color);
        }

        .inv-tax-breakdown {
          border-right : 0.5px solid var(--border-color);
          padding      : 10px 12px;
        }

        .inv-tax-breakdown__title {
          font-size    : 9px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color        : var(--brand-primary);
          font-weight  : 700;
          padding-bottom: 4px;
          border-bottom: 1px solid var(--brand-accent);
          margin-bottom: 7px;
          display      : inline-block;
        }

        .inv-tax-table {
          width        : 100%;
          font-size    : 9.5px;
          border-collapse: collapse;
        }

        .inv-tax-table th {
          text-align   : left;
          font-weight  : 700;
          color        : var(--text-muted);
          padding      : 3px 4px;
          border-bottom: 0.5px solid var(--border-color);
          font-size    : 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .inv-tax-table th.right, .inv-tax-table td.right { text-align: right; }

        .inv-tax-table td {
          padding      : 4px 4px;
          border-bottom: 0.5px solid var(--border-color);
          font-family  : var(--font-mono);
          font-size    : 9.5px;
          font-weight  : 600;
        }

        .inv-tax-table tr:last-child td {
          font-weight  : 800;
          border-bottom: none;
          color        : var(--brand-primary);
        }

        .inv-totals { padding: 10px 12px; }

        .inv-totals__row {
          display      : flex;
          justify-content: space-between;
          align-items  : center;
          padding      : 4px 0;
          border-bottom: 0.5px solid var(--border-color);
          font-size    : 10px;
          font-weight  : 600;
        }

        .inv-totals__row:last-child    { border-bottom: none; }
        .inv-totals__row label         { color: var(--text-secondary); }
        .inv-totals__row span          { font-family: var(--font-mono); font-size: 10px; font-weight: 700; }
        .inv-totals__row.discount span { color: #B91C1C; }
        .inv-totals__row.discount span::before { content: '- '; }
        .inv-totals__row.subtotal      { padding-top: 6px; margin-top: 2px; border-top: 0.5px dashed var(--border-color); }
        .inv-totals__row.subtotal label{ font-weight: 700; color: var(--text-primary); }
        .inv-totals__row.subtotal span { font-weight: 800; }

        .inv-grand-total {
          background   : var(--bg-grand-total);
          color        : #fff;
          display      : flex;
          justify-content: space-between;
          align-items  : center;
          padding      : 10px 12px;
          border-top   : 2px solid var(--brand-accent);
        }

        .inv-grand-total__label {
          font-family  : var(--font-display);
          font-size    : 16px;
          font-weight  : 700;
          color        : #fff;
        }

        .inv-grand-total__label small {
          display      : block;
          font-family  : var(--font-body);
          font-size    : 9px;
          color        : rgba(255,255,255,0.7);
          font-weight  : 600;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }

        .inv-grand-total__amount { text-align: right; }

        .inv-grand-total__amount .figure {
          font-family  : var(--font-mono);
          font-size    : 20px;
          font-weight  : 700;
          color        : var(--brand-accent);
        }

        .inv-grand-total__amount .currency {
          font-size    : 11px;
          color        : rgba(255,255,255,0.6);
          margin-right : 3px;
        }

        .inv-amount-words {
          background   : var(--brand-accent-lt);
          border-bottom: 0.5px solid var(--brand-accent);
          padding      : 7px 14px;
          font-size    : 9.5px;
          font-weight  : 600;
          color        : #6B4E00;
        }

        .inv-amount-words strong { font-weight: 700; }

        .inv-footer {
          display      : block;
          border-bottom: 0.5px solid var(--border-color);
        }

        .inv-footer__bank {
          padding      : 10px 12px;
        }

        .inv-footer__section-label {
          font-size    : 9px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color        : var(--brand-primary);
          font-weight  : 700;
          padding-bottom: 4px;
          border-bottom: 1px solid var(--brand-accent);
          margin-bottom: 8px;
          display      : inline-block;
        }

        .inv-bank-grid {
          display      : grid;
          grid-template-columns: 1fr 1fr;
          column-gap   : 24px;
        }

        .inv-bank-row {
          display      : grid;
          grid-template-columns: 90px 1fr;
          gap          : 4px;
          margin-bottom: 4px;
        }

        .inv-bank-row label {
          font-size    : 9.5px;
          font-weight  : 600;
          color        : var(--text-muted);
        }

        .inv-bank-row span {
          font-size    : 9.5px;
          font-weight  : 700;
          color        : var(--text-primary);
        }

        .inv-bank-row .mono {
          font-family  : var(--font-mono);
          font-size    : 9px;
          letter-spacing: 0.8px;
        }

        .inv-upi {
          display      : flex;
          align-items  : center;
          gap          : 6px;
          margin-top   : 6px;
          padding-top  : 6px;
          border-top   : 0.5px dashed var(--border-color);
        }

        .inv-upi__label {
          font-size    : 9px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color        : var(--text-muted);
          font-weight  : 700;
        }

        .inv-upi__id {
          font-family  : var(--font-mono);
          font-size    : 10px;
          color        : #1A6B3A;
          font-weight  : 700;
        }

        .inv-notes-strip {
          border-bottom: 0.5px solid var(--border-color);
          padding      : 7px 14px;
          font-size    : 9.5px;
          font-weight  : 500;
          color        : var(--text-secondary);
        }

        .inv-notes-strip strong { color: var(--text-primary); }

        .inv-compliance-bar {
          display      : flex;
          justify-content: space-between;
          align-items  : center;
          border-radius: 0 0 var(--radius) var(--radius);
          padding      : 6px 14px;
          background   : #F9FAFB;
          font-size    : 8.5px;
          font-weight  : 600;
          color        : var(--text-muted);
          border-bottom: 0.5px solid var(--border-color);
        }

        .inv-compliance-bar .powered {
          font-family  : var(--font-mono);
          color        : var(--brand-accent);
          font-size    : 7.5px;
        }
      `}</style>
      <div className="invoice-page-custom">
        <div style={{ flexGrow: 1 }}>
          <div className="inv-header">
            <div className="inv-header__supplier" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {sellerInfo?.logo_url && (
                <img
                  src={sellerInfo.logo_url}
                  alt="Company Logo"
                  style={{ height: '40px', width: 'auto', objectFit: 'contain', borderRadius: '4px', background: 'white', padding: '2px' }}
                />
              )}
              <div className="inv-header__logo-name">
                {sellerInfo?.trade_name || sellerInfo?.company_name}
              </div>
            </div>
            <div className="inv-header__title">
              <h1>{isQuotation ? 'Quotation' : (isGst ? 'Tax Invoice' : 'Invoice')}</h1>
            </div>
          </div>

          <div className="inv-accent-bar"></div>

          <div className="inv-supplier-strip">
            <div className="inv-supplier-strip__field">
              <label>Supplier</label>
              <span>{sellerInfo?.company_name}</span>
              <div style={{ fontSize: '8.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {sellerInfo?.address}
              </div>
            </div>
            <div className="inv-supplier-strip__field">
              <label>Contact</label>
              <span>{sellerInfo?.contact_number || '—'}</span>
              <div style={{ fontSize: '8.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {sellerInfo?.email || ''}
              </div>
            </div>
            {!isQuotation && isGst && (
              <div className="inv-supplier-strip__field">
                <label>GSTIN</label>
                <span className="gstin">{sellerInfo?.gst_number ? sellerInfo.gst_number : '—'}</span>
                {sellerInfo?.pan && <div style={{ fontSize: '7.5px', color: 'var(--text-muted)', marginTop: '2px' }}>PAN: {sellerInfo.pan}</div>}
              </div>
            )}
            {!isQuotation && !isGst && sellerInfo?.pan && (
              <div className="inv-supplier-strip__field">
                <label>PAN</label>
                <span className="gstin">{sellerInfo.pan}</span>
              </div>
            )}
          </div>

          <div className="inv-meta-customer">
            <div className="inv-meta">
              <div className="inv-meta-customer__section-label">Invoice Details</div>
              <div className="inv-field-row">
                <label>Invoice Number</label>
                <span className="mono" style={{ fontSize: '10px', fontWeight: 600, color: 'var(--brand-primary)' }}>{billDetails.invoice_number}</span>
              </div>
              <div className="inv-field-row">
                <label>Date of Issue</label>
                <span>{fmtDate(billDetails.date_of_bill || billDetails.created_at)}</span>
              </div>
            </div>

            <div className="inv-customer">
              <div className="inv-meta-customer__section-label">Billed To</div>
              <div className="inv-field-row">
                <label>Name</label>
                <span style={{ fontWeight: 600 }}>{billDetails.customer_name}</span>
              </div>
              {isGst && (
                <div className="inv-field-row">
                  <label>GSTIN</label>
                  <span className="mono">{billDetails.customer_gstin || <span style={{ color: 'var(--text-muted)' }}>Unregistered (URP)</span>}</span>
                </div>
              )}
              <div className="inv-field-row">
                <label>Billing Address</label>
                <address>{billDetails.customer_address}</address>
              </div>
            </div>
          </div>

          <table className="inv-items">
            <thead>
              <tr>
                <th className="num" style={{ width: '28px' }}>#</th>
                <th>Description of Goods / Services</th>
                <th className="num" style={{ width: '36px' }}>Unit</th>
                <th className="right" style={{ width: '36px' }}>Qty</th>
                <th className="right" style={{ width: '70px' }}>Unit Price</th>
                <th className="right" style={{ width: '70px' }}>Taxable Value</th>
                {isGst && <th className="right" style={{ width: '42px' }}>GST%</th>}
                {isGst && <th className="right" style={{ width: '68px' }}>Tax Amt</th>}
                <th className="right" style={{ width: '72px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const grossAmt = item.quantity * item.price;
                const globalDiscProportion = billCalculations.subtotal > 0 ? (grossAmt / billCalculations.subtotal) * (billCalculations.discount || 0) : 0;
                const taxableValue = grossAmt - globalDiscProportion;
                const taxRate = (item.cgst_rate || 0) + (item.sgst_rate || 0) || item.tax_rate || 0;
                const taxAmt = isGst ? (taxableValue * taxRate / 100) : 0;
                const lineTotal = taxableValue + taxAmt;

                return (
                  <tr key={i}>
                    <td className="num">{i + 1}</td>
                    <td>
                      <div className="item-name">{item.product_name}</div>
                      {item.additional_desc && <div className="item-desc">{item.additional_desc}</div>}
                      {isGst && item.hsn_sac && (
                        <span className="hsn-badge">{item.hsn_sac_type || 'HSN'}: {item.hsn_sac}</span>
                      )}
                    </td>
                    <td className="center">{item.unit || 'pcs'}</td>
                    <td className="right">{item.quantity}</td>
                    <td className="right">₹{fmt(item.price)}</td>
                    <td className="right">₹{fmt(taxableValue)}</td>
                    {isGst && <td className="right">{taxRate}%</td>}
                    {isGst && <td className="right">₹{fmt(taxAmt)}</td>}
                    <td className="right" style={{ fontWeight: 800 }}>₹{fmt(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div className="inv-financials">
            <div className="inv-tax-breakdown">
              {isGst && (
                <>
                  <div className="inv-tax-breakdown__title">Tax Breakdown</div>
                  <table className="inv-tax-table">
                    <thead>
                      <tr>
                        <th>GST Rate</th><th className="right">Taxable</th><th className="right">CGST %</th><th className="right">CGST Amt</th><th className="right">SGST %</th><th className="right">SGST Amt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxBreakdown.map((row, idx) => {
                        return (
                          <tr key={idx}>
                            <td>{row.rate}%</td>
                            <td className="right">₹{fmt(row.taxable)}</td>
                            <td className="right">{row.rate / 2}%</td>
                            <td className="right">₹{fmt(row.tax / 2)}</td>
                            <td className="right">{row.rate / 2}%</td>
                            <td className="right">₹{fmt(row.tax / 2)}</td>
                          </tr>
                        );
                      })}
                      {taxBreakdown.length > 0 && (
                        <tr>
                          <td style={{ fontWeight: 600 }}>Total</td>
                          <td className="right">₹{fmt(billCalculations.taxableValue)}</td>
                          <td></td><td className="right">₹{fmt(billCalculations.cgst)}</td>
                          <td></td><td className="right">₹{fmt(billCalculations.sgst)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>
              )}
              <div style={{ fontSize: '7.5px', color: 'var(--text-muted)', marginTop: '8px' }}>
                {isGst && 'Tax computed on taxable value after discount.'}
              </div>
            </div>
            <div className="inv-totals">
              <div className="inv-totals__row">
                <label>Gross Amount</label>
                <span>₹{fmt(billCalculations.subtotal)}</span>
              </div>
              {billCalculations.discount > 0 && (
                <div className="inv-totals__row discount">
                  <label>Total Discount</label>
                  <span>₹{fmt(billCalculations.discount)}</span>
                </div>
              )}
              {isGst && (
                <div className="inv-totals__row subtotal">
                  <label>Total Taxable Value</label>
                  <span>₹{fmt(billCalculations.taxableValue)}</span>
                </div>
              )}
              {isGst && (
                <>
                  <div className="inv-totals__row">
                    <label>CGST</label>
                    <span>₹{fmt(billCalculations.cgst)}</span>
                  </div>
                  <div className="inv-totals__row">
                    <label>SGST</label>
                    <span>₹{fmt(billCalculations.sgst)}</span>
                  </div>
                </>
              )}
              {isGst && billCalculations.cess > 0 && (
                <div className="inv-totals__row">
                  <label>Cess</label>
                  <span>₹{fmt(billCalculations.cess)}</span>
                </div>
              )}
              {billCalculations.roundOff !== undefined && billCalculations.roundOff !== 0 && (
                <div className="inv-totals__row" style={{ fontStyle: 'italic', opacity: 0.8 }}>
                  <label>Round Off</label>
                  <span>{(billCalculations.roundOff > 0 ? '+' : '') + fmt(billCalculations.roundOff)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="inv-grand-total">
            <div className="inv-grand-total__label">
              <small>Total Amount</small>
              Grand Total
            </div>
            <div className="inv-grand-total__amount">
              <span className="currency">₹</span>
              <span className="figure">{fmt(billCalculations.roundedTotal ?? billCalculations.grandTotal)}</span>
            </div>
          </div>

          <div className="inv-amount-words">
            <strong>Amount in Words:</strong> {numberToWords(billCalculations.roundedTotal ?? billCalculations.grandTotal)}
          </div>

          {!isQuotation && (
            <div className="inv-footer">
              {(sellerInfo?.account_no || sellerInfo?.bank_account_number) && (
                <div className="inv-footer__bank">
                  <div className="inv-footer__section-label">Bank Details</div>
                  <div className="inv-bank-grid">
                    <div className="inv-bank-row"><label>Bank Name</label><span>{sellerInfo.branch?.split(',')[0] || sellerInfo.account_no || sellerInfo.bank_account_number ? 'Bank' : ''}</span></div>
                    {sellerInfo.account_holder_name && <div className="inv-bank-row"><label>Account Name</label><span>{sellerInfo.account_holder_name}</span></div>}
                    <div className="inv-bank-row"><label>Account No.</label><span className="mono">{sellerInfo.account_no || sellerInfo.bank_account_number}</span></div>
                    <div className="inv-bank-row"><label>IFSC Code</label><span className="mono">{sellerInfo.ifsc_code}</span></div>
                    <div className="inv-bank-row"><label>Branch</label><span>{sellerInfo.branch}</span></div>
                    <div className="inv-bank-row"><label>Account Type</label><span>Current</span></div>
                  </div>
                  {sellerInfo.upi_id && (
                    <div className="inv-upi">
                      <span className="inv-upi__label">UPI</span>
                      <span className="inv-upi__id">{sellerInfo.upi_id}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {(sellerInfo?.payment_terms || sellerInfo?.terms_and_conditions) && (
            <div className="inv-notes-strip">
              {sellerInfo?.payment_terms && (
                <div><strong>Payment Terms:</strong> {sellerInfo.payment_terms}</div>
              )}
              {sellerInfo?.terms_and_conditions && (
                <div style={{ marginTop: sellerInfo?.payment_terms ? '4px' : '0' }}><strong>Terms & Conditions:</strong> {sellerInfo.terms_and_conditions}</div>
              )}
            </div>
          )}

          <div className="inv-compliance-bar">
            <span>This is a computer-generated document. No signature required unless noted above.</span>
            {isGst && <span className="powered">GST Rule 46 Compliant</span>}
          </div>
        </div>
      </div>
    </>
  );
};

export default InvoiceTemplate;