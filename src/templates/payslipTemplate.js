module.exports = (payslip, settings) => {

  const getCurrencyName = (symbol) => {
  const map = {
    "₹": "Rupees",
    "$": "Dollars",
    "د.إ": "Dirhams",
    "€": "Euros",
    "£": "Pounds",
  };
  return map[symbol] || "Amount";
};

const allowances = payslip.allowanceList || [];
const deductions = payslip.deductionList || [];
const leaveSummary = payslip.leaveSummary || {};
const unpaidLeaves = payslip.unpaidLeaves || 0;

// 🔥 OVERTIME
const overtimePay = payslip.overtimePay || 0;
const totalOvertimeHours = payslip.totalOvertimeHours || 0;

// 🔥 CURRENCY (NEW)
const symbol = settings?.currencySymbol || "₹";

const totalAllowance = allowances.reduce(
  (sum,a)=>sum + Number(a.amount || 0),0
);

const totalDeduction = deductions.reduce(
  (sum,d)=>sum + Number(d.amount || 0),0
);

// 🔥 TOTALS
const totalEarnings =
  payslip.basicSalary +
  totalAllowance +
  overtimePay;

const finalTotalDeduction = totalDeduction;

return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">

<style>

body{
font-family:Arial;
padding:40px;
}

.header{
display:flex;
justify-content:space-between;
align-items:center;
}

.logo img{
width:150px;
}

.company{
font-weight:bold;
color:#666;
}

.title{
text-align:center;
font-size:30px;
font-weight:bold;
color:#2f5d8c;
margin:20px 0;
}

.meta{
display:flex;
justify-content:space-between;
margin-bottom:25px;
}

.meta div{
line-height:1.7;
}

table{
width:100%;
border-collapse:collapse;
margin-top:10px;
}

th,td{
border:1px solid #7ea6d9;
padding:8px;
}

th{
background:#5b9bd5;
color:white;
}

.amount{
text-align:right;
}

.total{
font-weight:bold;
}

.section-title{
margin-top:25px;
font-size:18px;
font-weight:bold;
color:#2f5d8c;
}

.footer{
text-align:center;
margin-top:30px;
}

</style>

</head>

<body>

<div class="header">

<div class="company">
${settings?.companyName || ""} – Private & Confidential
</div>

<div class="logo">
${settings?.companyLogo 
  ? `<img src="${settings.companyLogo}" style="width:200px;height:auto;" alt="Company Logo" />`
  : ""}
</div>

</div>

<div class="title">Payslip</div>

<div class="meta">

<div>
<strong>Date :</strong> ${new Date().toLocaleDateString()}<br>
<strong>Pay Period :</strong> ${payslip.month}/${payslip.year}<br>
<strong>Date of Joining :</strong> ${
  payslip.employee?.joinDate 
  ? new Date(payslip.employee.joinDate).toLocaleDateString() 
  : ""
}
</div>

<div>
<strong>Employee ID :</strong> ${payslip.employeeId}<br>
<strong>Employee Name :</strong> ${payslip.employeeName}<br>
<strong>Designation :</strong> ${payslip.employee?.designation || ""}
</div>

</div>

<table>

<tr>
<th>Earnings</th>
<th>Amount (${symbol})</th>
<th>Deductions</th>
<th>Amount (${symbol})</th>
</tr>

<tr>
<td>Basic Pay</td>
<td class="amount">${symbol} ${Number(payslip.basicSalary).toLocaleString()}</td>
<td></td>
<td></td>
</tr>

${allowances.map(a=>`
<tr>
<td>${a.name}</td>
<td class="amount">${symbol} ${Number(a.amount).toLocaleString()}</td>
<td></td>
<td></td>
</tr>
`).join("")}

<!-- 🔥 OVERTIME -->
${overtimePay > 0 ? `
<tr>
<td>
Overtime ${totalOvertimeHours ? `(${totalOvertimeHours} hrs)` : ""}
</td>
<td class="amount">${symbol} ${Number(overtimePay).toLocaleString()}</td>
<td></td>
<td></td>
</tr>
` : ""}

<!-- 🔥 DEDUCTIONS -->
${deductions
  .filter(d => Number(d.amount) > 0)
  .map(d=>`
<tr>
<td></td>
<td></td>
<td>${d.name}</td>
<td class="amount">${symbol} ${Number(d.amount).toLocaleString()}</td>
</tr>
`).join("")}

<tr class="total">
<td>Total Earnings</td>
<td class="amount">${symbol} ${Number(totalEarnings).toLocaleString()}</td>
<td>Total Deductions</td>
<td class="amount">${symbol} ${Number(finalTotalDeduction).toLocaleString()}</td>
</tr>

<tr class="total">
<td colspan="3">Net Pay</td>
<td class="amount">${symbol} ${Number(payslip.netSalary).toLocaleString()}</td>
</tr>

</table>

<div class="section-title">Leave Summary</div>

<table>

<tr>
<th>Leave Type</th>
<th>Days Taken</th>
</tr>

${Object.entries(leaveSummary)
.filter(([code,days]) => code !== "LWP" && days > 0)
.map(([code,days])=>`
<tr>
<td>${code}</td>
<td class="amount">${days}</td>
</tr>
`).join("")}

${unpaidLeaves > 0 ? `
<tr>
<td><strong>Unpaid Leaves</strong></td>
<td class="amount"><strong>${unpaidLeaves}</strong></td>
</tr>
` : ""}

</table>

<div class="footer">

<strong>${symbol} ${Number(payslip.netSalary).toLocaleString()}</strong><br>
${getCurrencyName(symbol)} ${Number(payslip.netSalary).toLocaleString()} Only

<br><br>

<em>
This is a system generated statement and does not require any signature or stamp
</em>

</div>

</body>
</html>
`;
};