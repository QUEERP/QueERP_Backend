module.exports = (payment, bill, settings) => {

  //////////////////////////////////////////////////////
  // CURRENCY
  //////////////////////////////////////////////////////
  const symbol = settings?.currencySymbol || "₹";

  //////////////////////////////////////////////////////
  // SAFE DATA
  //////////////////////////////////////////////////////
  const vendor = bill?.vendor || {};

  const paymentDate = payment.paymentDate
    ? new Date(payment.paymentDate).toISOString().split("T")[0]
    : "";

  const billDate = bill?.billDate
    ? new Date(bill.billDate).toISOString().split("T")[0]
    : "";

  //////////////////////////////////////////////////////
  // CALCULATIONS
  //////////////////////////////////////////////////////
  const totalAmount = Number(bill?.totalAmount || 0);
  const paidAmount = Number(payment?.amount || 0);

  //////////////////////////////////////////////////////
  // TEMPLATE
  //////////////////////////////////////////////////////
  return `
  <html>
  <head>
    <style>
      body {
        font-family: Arial;
        padding: 40px;
        color: #333;
      }

      .header {
        display: flex;
        justify-content: space-between;
        border-bottom: 2px solid #333;
        padding-bottom: 10px;
      }

      .title {
        text-align: center;
        font-size: 22px;
        margin: 20px 0;
      }

      .box {
        background: #f5f5f5;
        padding: 12px;
        margin-bottom: 20px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th {
        background: #333;
        color: #fff;
        padding: 10px;
      }

      td {
        padding: 10px;
        border-bottom: 1px solid #ddd;
        text-align: center;
      }

      .total {
        margin-top: 20px;
        text-align: right;
        font-weight: bold;
      }
    </style>
  </head>

  <body>

    <div class="header">
      <div>
        <h2>${settings?.companyName || ""}</h2>
        <div>${settings?.address || ""}</div>
      </div>

      <div>
        <strong>Payment Receipt</strong><br/>
        Receipt No: ${payment.paymentNumber}<br/>
        Date: ${paymentDate}
      </div>
    </div>

    <div class="title">BILL PAYMENT RECEIPT</div>

    <div class="box">
      <strong>Vendor Details</strong><br/>
      ${vendor?.name || ""}<br/>
      ${vendor?.email || ""}
    </div>

    <div class="box">
      <strong>Bill Details</strong><br/>
      Bill No: ${bill?.billNumber || "-"}<br/>
      Bill Date: ${billDate}
    </div>

    <table>
      <thead>
        <tr>
          <th>Bill Amount (${symbol})</th>
          <th>Paid Amount (${symbol})</th>
          <th>Payment Mode</th>
        </tr>
      </thead>

      <tbody>
        <tr>
          <td>${symbol} ${totalAmount.toFixed(2)}</td>
          <td>${symbol} ${paidAmount.toFixed(2)}</td>
          <td>${payment.paymentMode}</td>
        </tr>
      </tbody>
    </table>

    <div class="total">
      Remaining: ${symbol} ${(totalAmount - paidAmount).toFixed(2)}
    </div>

    ${payment.note ? `
      <div class="box">
        <strong>Note:</strong> ${payment.note}
      </div>
    ` : ""}

  </body>
  </html>
  `;
};