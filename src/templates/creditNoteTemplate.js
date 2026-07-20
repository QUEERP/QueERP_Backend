module.exports = (credit, settings) => {
  //////////////////////////////////////////////////////
  // SUPPORT BOTH CUSTOMER + VENDOR
  //////////////////////////////////////////////////////
  const party = credit.customer || credit.vendor;

  const overpaid = Number(credit.amount || 0);
  const symbol = settings?.currencySymbol || "₹";
  const weight = overpaid * 0.05;
  const subTotal = overpaid - weight;

  const date = new Date(credit.createdAt).toISOString().split("T")[0];
  const partyType = credit.type === "BILL" ? "Vendor" : "Customer";
  const adjustmentType = credit.type === "BILL" ? "Bill Adjustment" : "Invoice Adjustment";

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
        background: #1f4e79;
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

      .totals {
        margin-top: 20px;
        width: 100%;
        display: flex;
        justify-content: flex-end;
      }

      .totals-table {
        width: 300px;
      }
      
      .totals-table td {
        text-align: right;
        padding: 6px 10px;
        border: none;
      }

      .totals-table .total-row {
        font-weight: bold;
        border-top: 1px solid #2f3b4c;
        border-bottom: 1px solid #2f3b4c;
        font-size: 14px;
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
    <div class="title">CREDIT NOTE</div>

    <!-- ====== META ROW ====== -->
    <div class="meta-row">

      <div class="meta-box">
        <strong>${partyType}</strong>
        ${party?.companyName || party?.company || party?.name || "N/A"}<br/>
        ${party?.billingStreet || party?.address || ""}<br/>
        ${party?.billingCity || party?.city || ""}<br/>
        ${party?.vatNumber
          ? `TRN: ${party.vatNumber}`
          : ""}
      </div>

      <div class="meta-box">
        <strong>Credit Note Info</strong>
        CN Number: ${credit.creditNumber || "-"}<br/>
        Date: ${date}<br/>
      </div>

    </div>

    <!-- ====== TOTAL PAID BOX ====== -->
    <div class="paid-box">
      <div class="paid-label">Total Amount</div>
      <div class="paid-amount">
        ${symbol} ${overpaid.toFixed(2)}
      </div>
    </div>

    <!-- ====== TABLE ====== -->
    <h3>Adjustment Details</h3>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item</th>
          <th>Qty</th>
          <th>Rate (${symbol})</th>
          <th>Amount (${symbol})</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>${adjustmentType}</td>
          <td>1</td>
          <td>${symbol} ${overpaid.toFixed(2)}</td>
          <td>${symbol} ${overpaid.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <table class="totals-table">
        <tr>
          <td>Total:</td>
          <td>${symbol} ${overpaid.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Weight (5%):</td>
          <td>${symbol} ${weight.toFixed(2)}</td>
        </tr>
        <tr class="total-row">
          <td>Sub Total:</td>
          <td>${symbol} ${subTotal.toFixed(2)}</td>
        </tr>
      </table>
    </div>

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