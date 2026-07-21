module.exports = (quotation, settings = {}) => {
  const getSymbol = (curr) => {
    if (curr === 'INR') return '₹';
    if (curr === 'USD') return '$';
    if (curr === 'EUR') return '€';
    if (curr === 'GBP') return '£';
    return curr;
  };
  const sym = getSymbol(quotation.currency) || quotation.currency || '$';
  const fmt = (val) => (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const hasGoods = (quotation.items || []).some(i => i.itemType === 'GOODS');
  const hasServices = (quotation.items || []).some(i => i.itemType === 'SERVICE');
  
  let qtyHeader = "QTY";
  if (hasGoods && !hasServices) qtyHeader = "QTY";
  else if (!hasGoods && hasServices) qtyHeader = "HRS";

  const isApproved = quotation.status === 'APPROVED' || quotation.status === 'ACCEPTED';
  const approvedStamp = isApproved ? `
    <div style="position: absolute; top: 10px; right: 10px; border: 4px solid #10b981; color: #10b981; padding: 10px 20px; font-weight: 900; font-size: 24px; text-transform: uppercase; border-radius: 8px; transform: rotate(-10deg); opacity: 0.8;">
      APPROVED
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4; margin: 0; }
  *{ box-sizing:border-box; -webkit-print-color-adjust: exact; }
  html, body { height: 100%; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size:11px; color:#333; background:#fff; width: 794px; min-height: 1123px; position: relative; }
  
  /* Distinct Modern Quotation Layout */
  .proposal-header { background: #0f172a; color: #fff; padding: 40px; display: flex; justify-content: space-between; align-items: center; position: relative; }
  .proposal-header h1 { margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; color: #38bdf8; }
  .proposal-header .meta { text-align: right; font-size: 12px; opacity: 0.8; }
  
  .content { padding: 40px; }
  
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
  .box h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin: 0 0 10px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
  .box p { margin: 0; line-height: 1.6; }
  .bold { font-weight: bold; color: #0f172a; }

  .quote-title { font-size: 20px; font-weight: 600; color: #0f172a; margin-bottom: 20px; border-left: 4px solid #38bdf8; padding-left: 15px; }
  
  table { width:100%; border-collapse:collapse; margin-bottom:30px; }
  th { padding:12px; background:#f8fafc; border-bottom: 2px solid #e2e8f0; text-align:left; font-size:10px; text-transform:uppercase; color: #64748b; font-weight: 600; }
  td { padding:12px; border-bottom:1px solid #f1f5f9; vertical-align:top; }
  .text-right { text-align:right; }
  .text-center { text-align:center; }
  
  .totals-box { width: 300px; float: right; background: #f8fafc; padding: 20px; border-radius: 8px; }
  .totals-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; }
  .totals-row.grand { font-size: 16px; font-weight: bold; color: #0f172a; border-top: 2px solid #e2e8f0; padding-top: 10px; margin-top: 10px; }
  
  .terms-box { clear: both; margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b; }
  .terms-box h4 { margin: 0 0 10px 0; color: #0f172a; font-size: 11px; text-transform: uppercase; }
  
  .signature-area { margin-top: 60px; text-align: right; }
  .signature-line { border-top: 1px solid #94a3b8; width: 200px; display: inline-block; padding-top: 5px; font-size: 10px; color: #64748b; }
</style>
</head>
<body>
  ${approvedStamp}
  <div class="proposal-header">
    <div>
      ${settings.companyLogo ? '<img src="' + settings.companyLogo + '" style="max-height:60px; max-width:200px; object-fit:contain; object-position:left; margin-bottom:15px; filter: brightness(0) invert(1);" />' : ''}
      <div style="font-size: 16px; font-weight: 600;">${settings.companyName || ''}</div>
      <div style="opacity: 0.7; margin-top: 5px; line-height: 1.4;">
        ${settings.address || ''}<br/>
        ${settings.phone || ''} ${settings.email ? ' | ' + settings.email : ''}
      </div>
    </div>
    <div class="meta">
      <h1>QUOTATION</h1>
      <div style="margin-top: 10px; font-size: 14px; font-weight: bold;"># ${quotation.quoteNumber}</div>
      <div style="margin-top: 5px;">Date: ${new Date(quotation.issueDate).toLocaleDateString('en-GB')}</div>
      ${quotation.expiryDate ? '<div>Valid Until: ' + new Date(quotation.expiryDate).toLocaleDateString('en-GB') + '</div>' : ''}
    </div>
  </div>

  <div class="content">
    ${quotation.title ? '<div class="quote-title">' + quotation.title + '</div>' : ''}
    
    <div class="grid-2">
      <div class="box">
        <h3>Prepared For</h3>
        <p class="bold" style="font-size:14px; margin-bottom:5px;">${quotation.customer?.company || quotation.customer?.name || ''}</p>
        <p>
          ${quotation.customer?.billingStreet || quotation.customer?.address || ''}<br/>
          ${quotation.customer?.billingCity || ''} ${quotation.customer?.billingCountry || ''}
        </p>
      </div>
      <div class="box">
        <h3>Prepared By</h3>
        <p class="bold">${quotation.assignedTo?.user?.name || settings.companyName || 'Sales Team'}</p>
        <p>${quotation.assignedTo?.user?.email || settings.email || ''}</p>
        <div style="margin-top:10px;">
          <strong>Status:</strong> ${quotation.status}
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th width="50" class="text-center">#</th>
          <th>ITEM & DESCRIPTION</th>
          <th width="80" class="text-center">${qtyHeader}</th>
          <th width="100" class="text-right">PRICE</th>
          <th width="100" class="text-right">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${(quotation.items || []).map((i, idx) => `
        <tr>
          <td class="text-center" style="color:#94a3b8;">${idx + 1}</td>
          <td>
            <div class="bold">${i.itemName || ''}</div>
            <div style="color:#64748b; margin-top:4px; font-size:10px;">${i.description || ''}</div>
          </td>
          <td class="text-center">${i.quantity || 0}</td>
          <td class="text-right">${fmt(i.price)}</td>
          <td class="text-right bold">${fmt(i.total)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals-box">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${sym} ${fmt(quotation.subtotal)}</span>
      </div>
      ${quotation.discount > 0 ? `
      <div class="totals-row" style="color: #ef4444;">
        <span>Discount</span>
        <span>-${sym} ${fmt(quotation.discount)}</span>
      </div>
      ` : ''}
      <div class="totals-row">
        <span>Tax Amount</span>
        <span>${sym} ${fmt(quotation.tax)}</span>
      </div>
      <div class="totals-row grand">
        <span>Total Estimate</span>
        <span>${sym} ${fmt(quotation.totalAmount)}</span>
      </div>
    </div>
    
    <div style="clear:both;"></div>

    <div class="signature-area">
      ${settings.signatureUrl ? '<img src="' + settings.signatureUrl + '" style="max-height:60px; max-width:150px; object-fit:contain; object-position:right; margin-bottom:10px;" /><br/>' : '<div style="height:50px;"></div>'}
      <div class="signature-line">Authorized Signature</div>
    </div>

    <div class="terms-box">
      ${quotation.notes ? `
      <div style="margin-bottom: 20px;">
        <h4>Notes / Remarks</h4>
        <div>${quotation.notes.replace(/\\n/g, '<br/>')}</div>
      </div>
      ` : ''}
      
      ${quotation.termsConditions || settings.defaultTerms ? `
      <div>
        <h4>Terms & Conditions</h4>
        <div>${(quotation.termsConditions || settings.defaultTerms || '').replace(/\\n/g, '<br/>')}</div>
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
  `;
};
