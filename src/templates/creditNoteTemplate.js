module.exports = (credit, settings) => {

  //////////////////////////////////////////////////////
  // SUPPORT BOTH CUSTOMER + VENDOR
  //////////////////////////////////////////////////////
  const party = credit.customer || credit.vendor;

  const overpaid = Number(credit.amount || 0);

  const symbol = settings?.currencySymbol || "₹";

  const weight = overpaid * 0.05;
  const subTotal = overpaid - weight;

  const date = new Date(credit.createdAt)
    .toISOString()
    .split("T")[0];

  const rows = `
      <tr>
        <td>1</td>
        <td>${credit.type === "BILL" ? "Bill Adjustment" : "Invoice Adjustment"}</td>
        <td>1</td>
        <td>${symbol} ${overpaid.toFixed(2)}</td>
        <td>${symbol} ${overpaid.toFixed(2)}</td>
      </tr>
  `;

  return `
<html>
<body>

<div>
<h2>CREDIT NOTE</h2>
<div># ${credit.creditNumber}</div>
<div>Date: ${date}</div>
</div>

<h3>${credit.type === "BILL" ? "Vendor" : "Customer"}</h3>
${party?.companyName || party?.name || "N/A"}

<table border="1" cellpadding="5" cellspacing="0">
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
${rows}
</tbody>
</table>

<div style="margin-top:20px;">
<div>Total: ${symbol} ${overpaid.toFixed(2)}</div>
<div>Weight (5%): ${symbol} ${weight.toFixed(2)}</div>
<div><b>Sub Total: ${symbol} ${subTotal.toFixed(2)}</b></div>
</div>

</body>
</html>
`;
};