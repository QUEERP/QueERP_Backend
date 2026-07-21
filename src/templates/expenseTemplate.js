module.exports = (expense, settings = {}) => {
  const getSymbol = (curr) => {
    if (curr === 'INR') return '₹';
    if (curr === 'USD') return '$';
    if (curr === 'EUR') return '€';
    if (curr === 'GBP') return '£';
    return curr || '$';
  };
  const sym = getSymbol(expense.currency);
  const fmt = (val) => (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4; margin: 40px; }
  *{ box-sizing:border-box; -webkit-print-color-adjust: exact; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size:12px; color:#333; background:#fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
  .title { font-size: 28px; font-weight: 300; letter-spacing: 1px; text-transform: uppercase; color: #0f172a; margin: 0; }
  .meta-data { margin-top: 10px; font-size: 14px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
  .box h3 { font-size: 11px; text-transform: uppercase; color: #64748b; margin: 0 0 5px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
  .box p { margin: 5px 0; font-size: 13px; font-weight: 500; }
  
  table { width:100%; border-collapse:collapse; margin-bottom:30px; margin-top: 20px; }
  th { padding:12px; background:#f8fafc; border-bottom: 2px solid #e2e8f0; text-align:left; font-size:11px; text-transform:uppercase; color: #64748b; }
  td { padding:12px; border-bottom:1px solid #f1f5f9; vertical-align:top; font-size: 13px; }
  .text-right { text-align:right; }
  
  .totals-box { width: 300px; float: right; background: #f8fafc; padding: 20px; border-radius: 8px; margin-top: 20px; }
  .totals-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
  .totals-row.grand { font-size: 18px; font-weight: bold; color: #0f172a; border-top: 2px solid #e2e8f0; padding-top: 10px; margin-top: 10px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      ${settings.companyLogo ? '<img src="' + settings.companyLogo + '" style="max-height:60px; max-width:200px; object-fit:contain; object-position:left; margin-bottom:15px;" />' : ''}
      <div style="font-size: 18px; font-weight: bold;">${settings.companyName || 'Business'}</div>
      <div style="color: #64748b; margin-top: 5px;">Expense Record</div>
    </div>
    <div style="text-align: right;">
      <h1 class="title">EXPENSE</h1>
      <div class="meta-data">
        <div><strong>Date:</strong> ${new Date(expense.date).toLocaleDateString('en-GB')}</div>
        ${expense.referenceType && expense.referenceId ? '<div><strong>' + expense.referenceType + ' Ref:</strong> ' + expense.referenceId + '</div>' : ''}
      </div>
    </div>
  </div>

  <div class="grid-2">
    <div class="box">
      <h3>Expense Details</h3>
      <p><strong>Title:</strong> ${expense.title}</p>
      <p><strong>Category:</strong> ${expense.category || '-'}</p>
      <p><strong>Payment Method:</strong> ${expense.paymentMethod || '-'}</p>
    </div>
    <div class="box">
      <h3>Vendor / Customer</h3>
      <p><strong>Vendor:</strong> ${expense.vendor?.name || 'N/A'}</p>
      <p><strong>Customer:</strong> ${expense.customer?.name || expense.customer?.company || 'N/A'}</p>
    </div>
  </div>

  ${(expense.items && expense.items.length > 0) ? `
  <table>
    <thead>
      <tr>
        <th width="40">#</th>
        <th>ITEM & DESCRIPTION</th>
        <th class="text-right">QTY</th>
        <th class="text-right">RATE</th>
        <th class="text-right">AMOUNT</th>
      </tr>
    </thead>
    <tbody>
      ${expense.items.map((i, idx) => `
      <tr>
        <td style="color:#94a3b8;">${idx + 1}</td>
        <td>
          <div style="font-weight:bold;">${i.itemName || '-'}</div>
          ${i.description ? '<div style="color:#64748b; font-size:11px; margin-top:3px;">' + i.description + '</div>' : ''}
        </td>
        <td class="text-right">${i.quantity}</td>
        <td class="text-right">${fmt(i.rate)}</td>
        <td class="text-right" style="font-weight:bold;">${fmt(i.amount)}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  ` : `
  <div style="margin-top: 40px; padding: 20px; background: #f8fafc; text-align: center; border-radius: 8px; color: #64748b;">
    No line items attached to this expense.
  </div>
  `}

  <div class="totals-box">
    <div class="totals-row grand">
      <span>Total Amount</span>
      <span>${sym} ${fmt(expense.amount)}</span>
    </div>
  </div>
  
  <div style="clear:both;"></div>

  ${expense.notes ? `
  <div style="margin-top: 40px;">
    <h3 style="font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 10px;">Notes / Remarks</h3>
    <div style="font-size: 12px; color: #333; line-height: 1.5;">${expense.notes.replace(/\\n/g, '<br/>')}</div>
  </div>
  ` : ''}

</body>
</html>
  `;
};
