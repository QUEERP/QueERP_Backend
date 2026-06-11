module.exports = (payment, invoice, settings) => {

  //////////////////////////////////////////////////////
  // CURRENCY
  //////////////////////////////////////////////////////
  const symbol = settings?.currencySymbol || "$";

  //////////////////////////////////////////////////////
  // CALCULATIONS
  //////////////////////////////////////////////////////
  const payments = invoice.payments || [];

  const totalPaid = payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  const remaining = Number(invoice.grandTotal) - totalPaid;
  const roundedRemaining = Math.round(remaining * 100) / 100;

  let label = "Amount Remaining";
  let displayAmount = Math.abs(roundedRemaining);
  let cssClass = "danger";

  if (roundedRemaining < 0) {
    label = "Amount Credited";
    cssClass = "credit";
  } else if (roundedRemaining === 0) {
    label = "Settled";
    cssClass = "settled";
    displayAmount = 0;
  }

  //////////////////////////////////////////////////////
  // SAFE DATE FORMAT
  //////////////////////////////////////////////////////
  const paymentDate = payment.paymentDate
    ? new Date(payment.paymentDate).toISOString().split("T")[0]
    : "";

  const invoiceDate = invoice.invoiceDate
    ? new Date(invoice.invoiceDate).toISOString().split("T")[0]
    : "";

  //////////////////////////////////////////////////////
  // TEMPLATE
  //////////////////////////////////////////////////////
  return `
  <html>
  <head>
    <style>
      * {
        box-sizing: border-box;
      }

      body {
        font-family: Arial, Helvetica, sans-serif;
        padding: 40px;
        color: #333;
        font-size: 13px;
        background: #fff;
      }

      /* ====== HEADER ====== */
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid #2f3b4c;
        padding-bottom: 16px;
        margin-bottom: 20px;
      }

      .logo img {
        max-width: 140px;
        max-height: 60px;
        object-fit: contain;
      }

      .company-info {
        text-align: right;
        line-height: 1.7;
      }

      .company-info .name {
        font-size: 16px;
        font-weight: bold;
        color: #2f3b4c;
      }

      /* ====== TITLE ====== */
      .title {
        text-align: center;
        font-size: 22px;
        font-weight: bold;
        color: #2f3b4c;
        margin: 20px 0;
        letter-spacing: 1px;
      }

      /* ====== META ROW ====== */
      .meta-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px;
        gap: 20px;
      }

      .meta-box {
        flex: 1;
        background: #f5f5f5;
        border: 1px solid #ddd;
        padding: 12px;
        line-height: 1.7;
      }

      .meta-box strong {
        color: #2f3b4c;
        display: block;
        margin-bottom: 4px;
      }

      /* ====== TOTAL PAID BOX ====== */
      .paid-box {
        background: #4caf50;
        color: white;
        padding: 16px 20px;
        display: inline-block;
        border-radius: 4px;
        margin: 10px 0 24px 0;
      }

      .paid-box .paid-label {
        font-size: 12px;
        opacity: 0.9;
      }

      .paid-box .paid-amount {
        font-size: 22px;
        font-weight: bold;
        margin-top: 4px;
      }

      /* ====== TABLE ====== */
      h3 {
        color: #2f3b4c;
        margin-bottom: 10px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
      }

      thead th {
        background: #2f3b4c;
        color: white;
        padding: 10px;
        font-size: 12px;
        text-align: center;
      }

      tbody td {
        padding: 10px;
        border-bottom: 1px solid #e5e5e5;
        font-size: 12px;
        text-align: center;
      }

      /* ====== STATUS CLASSES ====== */
      .danger  { color: #e53935; font-weight: bold; }
      .credit  { color: #43a047; font-weight: bold; }
      .settled { color: #2f3b4c; font-weight: bold; }

      /* ====== PAYMENT MODE ====== */
      .mode-badge {
        display: inline-block;
        background: #e8f5e9;
        color: #2e7d32;
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: bold;
      }

      /* ====== NOTE ====== */
      .note-box {
        margin-top: 20px;
        background: #f9f9f9;
        border: 1px solid #ddd;
        padding: 12px;
        font-size: 12px;
        line-height: 1.6;
      }

      .note-box strong {
        color: #2f3b4c;
      }

      /* ====== SIGNATURE ====== */
      .signature {
        margin-top: 60px;
        display: flex;
        justify-content: flex-end;
      }

      .signature-box {
        width: 220px;
        text-align: center;
      }

      .signature-img {
        height: 80px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }

      .signature-img img {
        max-width: 200px;
        max-height: 80px;
        object-fit: contain;
      }

      .signature-line {
        border-top: 2px solid #000;
        margin-top: 6px;
      }

      .signature-label {
        font-size: 12px;
        margin-top: 5px;
      }
    </style>
  </head>

  <body>

    <!-- ====== HEADER ====== -->
    <div class="header">

      <div class="logo">
        ${settings?.companyLogo
          ? `<img src="${settings.companyLogo}" />`
          : ""}
      </div>

      <div class="company-info">
        <div class="name">${settings?.companyName || ""}</div>
        <div>${settings?.address || ""}</div>
        <div>${settings?.phone || ""}</div>
        ${settings?.trn ? `<div>TRN: ${settings.trn}</div>` : ""}
      </div>

    </div>

    <!-- ====== TITLE ====== -->
    <div class="title">PAYMENT RECEIPT</div>

    <!-- ====== META ROW ====== -->
    <div class="meta-row">

      <div class="meta-box">
        <strong>Bill To</strong>
        ${invoice.customer?.company || ""}<br/>
        ${invoice.customer?.billingStreet || ""}<br/>
        ${invoice.customer?.billingCity || ""}<br/>
        ${invoice.customer?.vatNumber
          ? `TRN: ${invoice.customer.vatNumber}`
          : ""}
      </div>

      <div class="meta-box">
        <strong>Payment Info</strong>
        Receipt No: ${payment.paymentNumber || "-"}<br/>
        Payment Date: ${paymentDate}<br/>
        Mode:
        <span class="mode-badge">
          ${payment.paymentMode || "-"}
        </span><br/>
        ${payment.transactionId
          ? `Ref: ${payment.transactionId}`
          : ""}
      </div>

    </div>

    <!-- ====== TOTAL PAID BOX ====== -->
    <div class="paid-box">
      <div class="paid-label">Total Paid</div>
      <div class="paid-amount">
        ${symbol} ${Number(payment.amount).toFixed(2)}
      </div>
    </div>

    <!-- ====== TABLE ====== -->
    <h3>Payment Details</h3>

    <table>
      <thead>
        <tr>
          <th>Invoice Number</th>
          <th>Invoice Date</th>
          <th>Invoice Amount (${symbol})</th>
          <th>Payment Amount (${symbol})</th>
          <th>${label}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${invoice.invoiceNumber}</td>
          <td>${invoiceDate}</td>
          <td>${symbol} ${Number(invoice.grandTotal).toFixed(2)}</td>
          <td>${symbol} ${Number(payment.amount).toFixed(2)}</td>
          <td class="${cssClass}">
            ${label === "Settled"
              ? "✔ Settled"
              : `${symbol} ${displayAmount.toFixed(2)}`}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- ====== NOTE ====== -->
    ${payment.note ? `
    <div class="note-box">
      <strong>Note:</strong> ${payment.note}
    </div>
    ` : ""}

    <!-- ====== SIGNATURE ====== -->
    <div class="signature">
      <div class="signature-box">
        <div class="signature-img">
          ${settings?.signatureUrl
            ? `<img src="${settings.signatureUrl}" />`
            : ""}
        </div>
        <div class="signature-line"></div>
        <div class="signature-label">Authorized Signature</div>
      </div>
    </div>

  </body>
  </html>
  `;
};