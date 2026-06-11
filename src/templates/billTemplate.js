module.exports = (payment, bill, settings = {}) => {
  return `
  <html>
  <body style="font-family: Arial; padding:40px;">

  <!-- HEADER -->
  <div style="text-align:center;">
    <h3>${settings.companyName || ""}</h3>
    <p>VAT: ${settings.vatNumber || "-"}</p>
    <h2>PAYMENT RECEIPT</h2>
  </div>

  <br/>

  <!-- VENDOR -->
  <p><b>Paid To:</b> ${bill.vendor?.name || "-"}</p>

  <p><b>Payment Date:</b> ${new Date(payment.paymentDate).toDateString()}</p>

  <!-- TOTAL BOX -->
  <div style="background:#8bc34a; padding:20px; width:250px; color:white; margin-top:10px;">
    <p>Total Paid</p>
    <h2>${payment.amount}</h2>
  </div>

  <br/>

  <!-- DETAILS -->
  <h3>Payment Details</h3>

  <table width="100%" border="1" cellspacing="0" cellpadding="8" style="border-collapse:collapse;">
    
    <thead style="background:#2c3e50; color:white;">
      <tr>
        <th>Bill Number</th>
        <th>Bill Date</th>
        <th>Bill Amount</th>
        <th>Payment Amount</th>
        <th>Status</th>
      </tr>
    </thead>

    <tbody>
      <tr>
        <td>${bill.billNumber}</td>
        <td>${new Date(bill.billDate).toDateString()}</td>
        <td>${bill.totalAmount}</td>
        <td>${payment.amount}</td>
        <td>Paid</td>
      </tr>
    </tbody>

  </table>

  </body>
  </html>
  `;
};