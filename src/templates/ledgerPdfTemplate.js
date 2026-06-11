module.exports = ({ customer, ledger }) => {

//////////////////////////////////////////////////////
// SUMMARY CALCULATION
//////////////////////////////////////////////////////

let invoicedAmount = 0;
let amountPaid = 0;

ledger.data.forEach(r => {
  invoicedAmount += r.debit || 0;
  amountPaid += r.credit || 0;
});

const beginningBalance = 0;
const balanceDue = ledger.closingBalance || 0;

//////////////////////////////////////////////////////
// HELPER FUNCTION
//////////////////////////////////////////////////////

function parseDetails(details){

  let type = "";
  let refNo = "";

  if(details.startsWith("Invoice")){
    type = "Invoice";
    refNo = details.split(" ")[1];
  }

  else if(details.startsWith("Payment")){
    type = "Payment";
    const match = details.match(/\((.*?)\)/);
    refNo = match ? match[1] : "";
  }

  else if(details.startsWith("Credit Note")){
    type = "Credit Note";
    refNo = details.split(" ")[2];
  }

  else{
    type = details;
  }

  return { type, refNo };
}

//////////////////////////////////////////////////////
// TABLE ROWS
//////////////////////////////////////////////////////

const rows = ledger.data.map(row => {

const parsed = parseDetails(row.details);

return `
<tr>
  <td class="date">${new Date(row.date).toLocaleDateString("en-CA")}</td>
  <td>${parsed.type}</td>
  <td class="ref">${parsed.refNo}</td>
  <td class="num">${row.debit ? Number(row.debit).toFixed(2) : ""}</td>
  <td class="num">${row.credit ? Number(row.credit).toFixed(2) : ""}</td>
  <td class="num">${Number(row.balance).toFixed(2)}</td>
</tr>
`;

}).join("");

//////////////////////////////////////////////////////
// HTML
//////////////////////////////////////////////////////

return `
<html>
<head>

<style>

body{
  font-family: Arial, Helvetica, sans-serif;
  padding:40px;
  color:#333;
}

/* HEADER */

.header{
  display:flex;
  justify-content:space-between;
}

.summary{
  width:320px;
  text-align:right;
}

.summary hr{
  border:none;
  border-top:1px solid #bbb;
  margin:10px 0;
}

.center-text{
  text-align:center;
  margin:25px 0;
}

/* TABLE */

table{
  width:100%;
  border-collapse:collapse;
  table-layout:fixed;
}

thead{
  background:#d9d9d9;
}

th{
  padding:12px;
  text-align:left;
  font-weight:600;
}

td{
  padding:12px;
  border-bottom:1px solid #eee;
}

tbody tr:nth-child(even){
  background:#f5f5f5;
}

/* COLUMN WIDTH */

.date{ width:110px; white-space:nowrap; }
.ref{ word-break:break-word; }
.num{ text-align:right; }

.footer{
  margin-top:20px;
  text-align:right;
  font-weight:bold;
}

</style>

</head>

<body>

<div class="header">

<div>
<strong>To</strong><br/>
${customer.company}
</div>

<div class="summary">
<h3>Account Summary</h3>
${ledger.fromDate} To ${ledger.toDate}

<hr/>

Beginning Balance: $${beginningBalance.toFixed(2)}<br/>
Invoiced Amount: $${invoicedAmount.toFixed(2)}<br/>
Amount Paid: $${amountPaid.toFixed(2)}<br/>

<strong>Balance Due: $${balanceDue.toFixed(2)}</strong>
</div>

</div>

<div class="center-text">
Showing all invoices and payments between ${ledger.fromDate} and ${ledger.toDate}
</div>

<table>

<thead>
<tr>
<th>Date</th>
<th>Type</th>
<th>Ref No</th>
<th>Debit</th>
<th>Credit</th>
<th>Balance</th>
</tr>
</thead>

<tbody>

<tr>
<td>${ledger.fromDate}</td>
<td>Opening Balance</td>
<td></td>
<td class="num">${beginningBalance.toFixed(2)}</td>
<td></td>
<td class="num">${beginningBalance.toFixed(2)}</td>
</tr>

${rows}

</tbody>

</table>

<div class="footer">
Balance Due &nbsp;&nbsp; $${balanceDue.toFixed(2)}
</div>

</body>
</html>
`;
};