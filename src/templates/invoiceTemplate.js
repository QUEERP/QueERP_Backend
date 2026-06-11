module.exports = (invoice, settings = {}) => {
  const template = invoice.designTemplate || "modern";
  
  // Helper to format currency
  const fmt = (val) => (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  // Determine dynamic headers based on item types
  const hasGoods = (invoice.items || []).some(i => i.itemType === 'GOODS');
  const hasServices = (invoice.items || []).some(i => i.itemType === 'SERVICE');
  
  let qtyHeader = "QTY/HRS";
  if (hasGoods && !hasServices) qtyHeader = "QTY";
  else if (!hasGoods && hasServices) qtyHeader = "HRS";

  // Collect all unique taxes across items for the breakdown (used in modern)
  const taxSummary = {};
  const itemizedTaxes = [];

  (invoice.items || []).forEach((item, idx) => {
    const taxes = item.taxDetails || [];
    const itemTaxes = [];
    
    taxes.forEach(t => {
      if (!taxSummary[t.name]) taxSummary[t.name] = 0;
      taxSummary[t.name] += Number(t.amount);
      
      itemTaxes.push({
        name: t.name,
        rate: t.rate,
        amount: t.amount,
        base: Number(item.quantity || item.hours || 0) * Number(item.rate)
      });
    });

    itemizedTaxes.push({
      index: idx + 1,
      description: item.description,
      taxes: itemTaxes
    });
  });

  const taxBreakdownHtml = `
    <div style="background:#f8f9fa; border:1px solid #eee; padding:10px; font-size: 9px;">
      <div style="font-weight:bold; border-bottom:1px solid #ddd; padding-bottom:5px; margin-bottom:10px; text-transform:uppercase;">Tax Breakdown</div>
      ${Object.entries(taxSummary).map(([name, amt]) => `
        <div style="margin-bottom:3px;">${name}: ${invoice.currency || 'INR'} ${fmt(amt)}</div>
      `).join('')}
      <div style="margin-top:10px; font-weight:bold; border-top:1px solid #ddd; padding-top:5px;">ITEMIZED TAX DETAILS:</div>
      ${itemizedTaxes.map(item => `
        <div style="margin-top:5px; font-size:8px; border-bottom:1px dashed #eee; padding-bottom:3px;">
          <strong>Item ${item.index}: ${item.description}</strong><br/>
          ${item.taxes.map(t => `• ${t.name} (${t.rate}%): ${invoice.currency || 'INR'} ${fmt(t.amount)} (on ${fmt(t.base)})`).join('<br/>')}
        </div>
      `).join('')}
    </div>
  `;

  const bankDetailsHtml = `
    <div style="background:#f8f9fa; border:1px solid #eee; padding:12px; margin-top:15px; width: 100%;">
      <div style="color:#1f4e79; font-weight:bold; border-bottom:1px solid #ddd; padding-bottom:4px; margin-bottom:8px; text-transform:uppercase;">Bank Details</div>
      <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:10px;">
        <div>
          <strong>Bank Name:</strong> ${settings.bankName || '-'}<br/>
          <strong>Account Name:</strong> ${settings.accountName || '-'}
        </div>
        <div>
          <strong>IBAN:</strong> ${settings.accountNumber || settings.iban || '-'}<br/>
          <strong>Swift:</strong> ${settings.swiftCode || '-'}
        </div>
      </div>
    </div>
  `;

  if (template === 'classic') {
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4; margin: 0; }
  *{ box-sizing:border-box; -webkit-print-color-adjust: exact; }
  html, body { height: 100%; margin: 0; padding: 0; }
  body{ font-family: 'Helvetica', 'Arial', sans-serif; font-size:10px; color:#222; background:#fff; width: 794px; min-height: 1123px; display: flex; flex-direction: column; position: relative; overflow: hidden; }
  .content-padding { padding: 40px; flex: 1; display: flex; flex-direction: column; position: relative; z-index: 10; }
  
  .yellow-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
  .yellow-title { font-size: 48px; font-weight: 900; letter-spacing: 1px; color: #111; }
  
  .yellow-billto { display: grid; grid-template-columns: 1fr 1fr; margin-bottom: 30px; }
  .yellow-billto-label { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #111; }
  .yellow-billto-details div { margin-bottom: 3px; font-size: 11px; }
  
  .yellow-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 30px; }
  .yellow-table th { background: #f2c94c; color: #111; font-weight: bold; padding: 12px 10px; text-align: left; font-size: 11px; }
  .yellow-table td { padding: 12px 10px; font-size: 11px; border-bottom: 1px solid #eee; }
  .yellow-table tr:nth-child(even) { background-color: #fcfcfc; }
  
  .summary-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 40px; margin-bottom: 30px; }
  .terms-box ul { margin: 0; padding-left: 20px; font-size: 11px; color: #444; line-height: 1.5; }
  
  .summary-table { width: 100%; border-collapse: collapse; }
  .summary-table td { padding: 8px 0; font-size: 11px; }
  .summary-table .total-row td { border-top: 1px solid #111; border-bottom: 1px solid #111; font-weight: bold; font-size: 13px; padding: 12px 0; }
  
  .payment-header { background: #192b45; color: #fff; padding: 12px 15px; font-weight: bold; font-size: 14px; margin-bottom: 15px; }
  .payment-grid { display: grid; grid-template-columns: 1fr 1fr; font-size: 11px; margin-bottom: 30px; padding: 0 15px; }
  .payment-grid div { margin-bottom: 4px; }
  
  .questions-section { padding: 0 15px; }
  .questions-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
  
  /* Corner triangles */
  .corner-tl { position: absolute; top: 0; left: 0; width: 0; height: 0; border-top: 120px solid #5ed1c9; border-right: 120px solid transparent; z-index: 1; }
  .corner-bl { position: absolute; bottom: 0; left: 0; width: 0; height: 0; border-bottom: 120px solid #192b45; border-right: 120px solid transparent; z-index: 1; }
  .corner-br { position: absolute; bottom: 0; right: 0; width: 0; height: 0; border-bottom: 120px solid #5ed1c9; border-left: 120px solid transparent; z-index: 1; }
</style>
</head>
<body>
  <div class="corner-tl"></div>
  <div class="corner-bl"></div>
  <div class="corner-br"></div>
  
  <div class="content-padding">
    <div class="yellow-header" style="display:grid; grid-template-columns: 1fr 1.2fr 1fr; align-items:start;">
       <div style="text-align: left;">
         ${settings.companyLogo ? `<img src="${settings.companyLogo}" style="max-height:80px;" />` : `<div style="font-size:32px; font-weight:bold; color:#f2c94c;">${settings.companyName || 'LOGO'}</div>`}
       </div>
       <div style="text-align: center;">
         <div style="font-size:16px; font-weight:bold;">${settings.companyName || ''}</div>
         <div style="margin-top:3px; font-size:10px; line-height:1.4; color:#444;">
           ${settings.address || ''}<br/>
           ${settings.phone ? settings.phone : ''}<br/>
           TRN: ${settings.trn || ''}
         </div>
       </div>
       <div style="text-align: right;">
         <div class="yellow-title" style="font-size: 24px;">TAX INVOICE</div>
         <div style="font-weight: bold; font-size: 11px; margin-top: 5px;">${invoice.invoiceNumber}</div>
       </div>
    </div>
    
    <div class="yellow-billto">
      <div class="yellow-billto-details">
        <div class="yellow-billto-label">Bill To:</div>
        <div><strong>Client Name:</strong> ${invoice.customer?.name || '-'}</div>
        <div><strong>Company Name:</strong> ${invoice.customer?.company || '-'}</div>
        <div><strong>Billing Address:</strong> ${invoice.customer?.billingStreet || ''} ${invoice.customer?.billingCity || ''}</div>
        <div><strong>Phone:</strong> ${invoice.customer?.phone || '-'}</div>
        <div><strong>Email:</strong> ${invoice.customer?.email || '-'}</div>
      </div>
      <div style="text-align: right; display: flex; flex-direction: column; justify-content: flex-end;">
        <table style="width: auto; margin-left: auto; font-size: 11px;">
          <tr><td style="font-weight: bold; padding-right: 15px; text-align: left;">Invoice Date:</td><td style="text-align: left;">${new Date(invoice.invoiceDate).toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'})}</td></tr>
          <tr><td style="font-weight: bold; padding-right: 15px; text-align: left;">Due Date:</td><td style="text-align: left;">${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'}) : '-'}</td></tr>
        </table>
      </div>
    </div>

    <div class="yellow-billto-label" style="font-size: 16px;">Service Details:</div>
    
    <table class="yellow-table">
      <thead>
        <tr>
          <th width="40" style="text-align:center;">No</th>
          <th>Description of Service</th>
          <th width="80" style="text-align:center;">Quantity</th>
          <th width="120" style="text-align:right;">Rate (${invoice.currency || '$'})</th>
          <th width="120" style="text-align:right;">Total (${invoice.currency || '$'})</th>
        </tr>
      </thead>
      <tbody>
        ${(invoice.items || []).map((i, idx) => `
        <tr>
          <td style="text-align:center; font-weight:bold;">${idx + 1}</td>
          <td>${i.description}</td>
          <td style="text-align:center;">${i.quantity || i.hours || 0}</td>
          <td style="text-align:right;">${fmt(i.rate)}</td>
          <td style="text-align:right;">${fmt(i.totalAmount)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="summary-grid">
      <div class="terms-box">
        <div class="yellow-billto-label" style="font-size: 16px;">Terms and Conditions:</div>
        <ul style="margin-bottom: 15px;">
          ${(invoice.terms || settings.defaultTerms || 'Payment is due upon receipt of this invoice.\\nLate payments may incur additional charges.').split('\\n').map(t => `<li>${t}</li>`).join('')}
        </ul>
        ${(invoice.adminNote || invoice.notes || settings.defaultFooterNote) ? `
        <div class="yellow-billto-label" style="font-size: 14px; margin-top:10px;">Notes:</div>
        <div style="font-size: 11px; color: #444; line-height: 1.5;">
          ${(invoice.adminNote || invoice.notes || settings.defaultFooterNote).split('\\n').join('<br/>')}
        </div>
        ` : ''}
      </div>
      <div>
        <table class="summary-table">
          <tr><td>Subtotal</td><td style="text-align:right;">${invoice.currency || '$'} ${fmt(invoice.subtotal)}</td></tr>
          <tr><td>Tax</td><td style="text-align:right;">${invoice.currency || '$'} ${fmt(invoice.totalTax)}</td></tr>
          <tr class="total-row">
            <td>Total Amount Due</td><td style="text-align:right;">${invoice.currency || '$'} ${fmt(invoice.grandTotal)}</td>
          </tr>
        </table>
      </div>
    </div>

    <div class="payment-header">Payment Information:</div>
    
    <div class="payment-grid">
       <div>
         <div><strong>Payment Method:</strong> Bank Transfer</div>
         <div><strong>Due Date:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'}) : '-'}</div>
         <div><strong>Bank Account:</strong> ${settings.accountNumber || settings.iban || '-'}</div>
       </div>
       <div style="text-align: right;">
         <div style="margin-bottom: 20px;">Date : ${new Date(invoice.invoiceDate).toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'})}</div>
         <div style="display: inline-block; text-align: center;">
           ${settings.signatureUrl ? `<img src="${settings.signatureUrl}" style="max-height:50px; margin-bottom:5px;"/>` : '<div style="height:55px;"></div>'}
           <div style="border-top:1px solid #111; width:150px; padding-top:5px;">${settings.companyName || 'Authorized Signature'}</div>
         </div>
       </div>
    </div>
    
    <div class="questions-section">
      <div class="questions-title">Questions</div>
      <div style="font-size: 11px;">
        <div><strong>Email US:</strong> ${settings.email || '-'}</div>
        <div><strong>Call US:</strong> ${settings.phone || '-'}</div>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  if (template === 'minimal') {
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4; margin: 0; }
  *{ box-sizing:border-box; -webkit-print-color-adjust: exact; }
  html, body { height: 100%; margin: 0; padding: 0; }
  body{ font-family: 'Helvetica', 'Arial', sans-serif; font-size:10px; color:#222; background:#fff; width: 794px; min-height: 1123px; display: flex; flex-direction: column; position: relative; }
  
  .orange-header-bg { background-color: #1f2937; position: relative; padding: 40px; color: #fff; display: grid; grid-template-columns: 1fr 1.2fr 1fr; align-items: center; overflow: hidden; }
  .orange-header-bg::before { content: ''; position: absolute; top: 0; right: 25%; width: 300px; height: 100%; background-color: #f97316; transform: skewX(30deg); z-index: 1; }
  .orange-header-bg > div { position: relative; z-index: 2; }
  
  .orange-title { color: #f97316; font-size: 24px; font-weight: 900; letter-spacing: 1px; margin-bottom: 5px; }
  
  .content-padding { padding: 30px 40px; flex: 1; }
  
  .address-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
  .dark-label { background-color: #1f2937; color: #fff; padding: 4px 8px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 10px; }
  .address-box { font-size: 11px; line-height: 1.5; color: #333; }
  .address-box strong { font-size: 14px; color: #111; display: block; margin-bottom: 5px; }
  
  .orange-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  .orange-table th { background: #f97316; color: #fff; font-weight: bold; padding: 12px 10px; text-transform: uppercase; font-size: 11px; text-align: left; }
  .orange-table td { padding: 12px 10px; font-size: 11px; border-bottom: 1px solid #ddd; }
  
  .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .info-block { display: grid; grid-template-columns: 90px 1fr; gap: 5px; font-size: 11px; margin-bottom: 15px; }
  .info-block strong { color: #111; }
  
  .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  .summary-table td { padding: 5px 0; font-size: 12px; }
  .total-box { background: #f97316; color: #fff; font-weight: bold; padding: 12px 15px; display: flex; justify-content: space-between; font-size: 14px; }
  
  .footer-decor { position: absolute; bottom: 0; left: 0; width: 100%; height: 40px; display: flex; }
  .footer-decor-orange { background: #f97316; width: 55%; height: 100%; }
  .footer-decor-blue { background: #1f2937; width: 45%; height: 100%; transform: skewX(-45deg); transform-origin: bottom left; margin-left: -20px; }
</style>
</head>
<body>
  <div class="orange-header-bg">
    <div style="text-align: left;">
      ${settings.companyLogo ? `<img src="${settings.companyLogo}" style="max-height:80px; filter: brightness(0) invert(1);" />` : `<div style="font-size:32px; font-weight:bold;">${settings.companyName || 'LOGO'}</div>`}
    </div>
    <div style="text-align: center;">
      <div style="font-size:16px; font-weight:bold;">${settings.companyName || ''}</div>
      <div style="margin-top:3px; font-size:10px; line-height:1.4; opacity: 0.9;">
        ${settings.address || ''}<br/>
        ${settings.phone ? settings.phone : ''}<br/>
        TRN: ${settings.trn || ''}
      </div>
    </div>
    <div style="text-align: right;">
      <div class="orange-title">TAX INVOICE</div>
      <div style="font-size: 12px; font-weight: bold; color: #fff;">${invoice.invoiceNumber}</div>
    </div>
  </div>
  
  <div class="content-padding">
    <div class="address-grid" style="grid-template-columns: 1fr;">
      <div class="address-box">
        <div class="dark-label">Bill To :</div>
        <strong>${invoice.customer?.name || invoice.customer?.company || 'Client Name'}</strong>
        ${invoice.customer?.company ? `<div>${invoice.customer.company}</div>` : ''}
        <div>Phone : ${invoice.customer?.phone || '-'}</div>
        <div>${invoice.customer?.billingStreet || ''}</div>
        <div>${invoice.customer?.billingCity || ''}</div>
      </div>
    </div>
    
    <table class="orange-table">
      <thead>
        <tr>
          <th>DESCRIPTION</th>
          <th width="100" style="text-align:center;">PRICE</th>
          <th width="80" style="text-align:center;">${qtyHeader}</th>
          <th width="120" style="text-align:right;">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${(invoice.items || []).map((i) => `
        <tr>
          <td style="font-weight:bold; color:#333;">${i.description}</td>
          <td style="text-align:center;">${fmt(i.rate)}</td>
          <td style="text-align:center;">${i.quantity || i.hours || 0}</td>
          <td style="text-align:right;">${fmt(i.totalAmount)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="bottom-grid">
      <div>
        <div class="dark-label">Payment Method :</div>
        <div class="info-block">
          <strong>Account No :</strong> <div>${settings.accountNumber || '-'}</div>
          <strong>Account Name :</strong> <div>${settings.accountName || '-'}</div>
          <strong>Bank :</strong> <div>${settings.bankName || '-'}</div>
        </div>
        
        <div style="margin-top: 30px;">
          <strong style="font-size: 14px; display: block; margin-bottom: 5px;">Terms & Conditions</strong>
          <div style="color: #666; font-size: 10px; line-height: 1.5; margin-bottom: 15px;">
            ${(invoice.terms || settings.defaultTerms || 'Payment is due within 30 days.').split('\\n').join('<br/>')}
          </div>
          ${(invoice.adminNote || invoice.notes || settings.defaultFooterNote) ? `
          <strong style="font-size: 14px; display: block; margin-bottom: 5px;">Notes</strong>
          <div style="color: #666; font-size: 10px; line-height: 1.5;">
            ${(invoice.adminNote || invoice.notes || settings.defaultFooterNote).split('\\n').join('<br/>')}
          </div>
          ` : ''}
        </div>
      </div>
      
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <div class="dark-label">Contact Info :</div>
            <div class="info-block" style="grid-template-columns: 50px 1fr;">
              <strong>Phone :</strong> <div>${settings.phone || '-'}</div>
              <strong>Email :</strong> <div>${settings.email || '-'}</div>
            </div>
          </div>
          <div>
             <table class="summary-table">
               <tr><td>Subtotal :</td><td style="text-align:right; padding-left: 20px;">${invoice.currency || '$'} ${fmt(invoice.subtotal)}</td></tr>
               <tr><td>Tax :</td><td style="text-align:right;">${invoice.currency || '$'} ${fmt(invoice.totalTax)}</td></tr>
               <tr><td>Discount :</td><td style="text-align:right;">${invoice.currency || '$'} ${fmt(invoice.discount || 0)}</td></tr>
             </table>
             <div class="total-box">
               <span>TOTAL</span>
               <span>${invoice.currency || '$'} ${fmt(invoice.grandTotal)}</span>
             </div>
          </div>
        </div>
        
        <div style="text-align: right; margin-top: 40px; padding-right: 20px;">
          <div style="display: inline-block; text-align: center;">
            <div style="font-weight: bold; font-size: 12px; margin-bottom: 5px;">${settings.companyName || 'Signature'}</div>
            ${settings.signatureUrl ? `<img src="${settings.signatureUrl}" style="max-height:40px; margin-bottom:5px;"/>` : '<div style="height:45px;"></div>'}
            <div style="border-top:1px solid #111; width:150px; padding-top:5px; font-weight: bold; font-size: 10px; text-transform: uppercase;">SIGNATURE</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="footer-decor">
    <div class="footer-decor-orange"></div>
    <div class="footer-decor-blue"></div>
  </div>
</body>
</html>
    `;
  }

  // Fallback to modern
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4; margin: 0; }
  *{ box-sizing:border-box; -webkit-print-color-adjust: exact; }
  html, body { height: 100%; margin: 0; padding: 0; }
  body{ font-family: 'Helvetica', 'Arial', sans-serif; font-size:10px; color:#222; background:#fff; width: 794px; min-height: 1123px; display: flex; flex-direction: column; }
  .page-wrapper { flex: 1; display: flex; flex-direction: column; width: 100%; }
  .content-padding { padding: 30px; flex: 1; display: flex; flex-direction: column; }
  
  table { width:100%; border-collapse:collapse; margin-bottom:15px; }
  th { padding:8px; background:#f4f4f4; border:1px solid #ddd; text-align:left; font-size:9px; text-transform:uppercase; color: #444; }
  td { padding:8px; border:1px solid #ddd; vertical-align:top; }
  .text-right { text-align:right; }
  .text-center { text-align:center; }
  .bold { font-weight:bold; }
  
  .invoice-header { display:grid; grid-template-columns: 1fr 1.2fr 1fr; align-items:start; border-bottom:1px solid #eee; padding-bottom:15px; margin-bottom:15px; }
  .invoice-title { color:#1f4e79; font-size:24px; font-weight:900; text-transform: uppercase; }
  .invoice-number { font-weight: bold; font-size: 11px; margin-top: 5px; color: #1f4e79; }

  .info-grid { display:grid; grid-template-columns: repeat(5, 1fr); gap: 1px; background:#ddd; border:1px solid #ddd; margin-bottom:15px; }
  .info-box { background:#fff; padding:8px; }
  .info-box label { display:block; color:#666; font-weight:bold; margin-bottom:4px; font-size:9px; }
  .address-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom:15px; }
  .address-box { background:#fff; border:1px solid #eee; padding:0; }
  .address-box label { background: #f0f7ff; color:#1f4e79; font-weight:bold; display:block; padding:8px; margin-bottom:8px; text-transform:uppercase; }
  .address-content { padding: 0 8px 8px 8px; }
  th { background:#1f4e79; color:#fff; border:1px solid #1f4e79; }
  
  .summary-table { width: 100%; border:none; }
  .summary-table td { border: none; border-bottom: 1px solid #eee; padding: 8px 10px; font-size: 11px; }
  .summary-table .total-row { background:#1f4e79; color:#fff; font-size: 14px; }
  
  .spacer { flex: 1; min-height: 20px; }
  .signature-box { text-align: right; margin-top: 30px; }
  .signature-box img { max-width: 150px; max-height: 70px; margin-bottom: 5px; }
  .signature-line { border-top: 2.5px solid #000; display: inline-block; width: 220px; padding-top: 8px; text-align: center; }
</style>
</head>
<body>
<div class="page-wrapper">
  <div class="content-padding">
    <div class="invoice-header">
      <div>
        ${settings.companyLogo ? `<img src="${settings.companyLogo}" style="max-height:80px;" />` : ''}
      </div>
      <div class="text-center">
        <div class="bold" style="font-size:16px;">${settings.companyName || ''}</div>
        <div style="color:#444; margin-top:3px; font-size:10px; line-height:1.4;">
          ${settings.address || ''}<br/>
          ${settings.phone ? settings.phone : ''}<br/>
          TRN: ${settings.trn || ''}
        </div>
      </div>
      <div class="text-right">
        <div class="invoice-title">TAX INVOICE</div>
        <div class="invoice-number">${invoice.invoiceNumber}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box"><label>Date</label>${new Date(invoice.invoiceDate).toDateString()}</div>
      <div class="info-box"><label>Due</label>${invoice.dueDate ? new Date(invoice.dueDate).toDateString() : '-'}</div>
      <div class="info-box"><label>SO</label>${invoice.soNumber || '-'}</div>
      <div class="info-box"><label>PO</label>${invoice.poNumber || '-'}</div>
      <div class="info-box"><label>Terms</label><div style="font-size:8px;">${invoice.terms || 'Due in 30 days.'}</div></div>
    </div>

    <div class="address-grid">
      <div class="address-box">
        <label>BILL TO</label>
        <div class="address-content">
          <div class="bold">${invoice.customer?.company || invoice.customer?.name || ''}</div>
          <div style="margin-top:5px; line-height:1.4; color:#444;">
            ${invoice.customer?.billingStreet || invoice.customer?.address || ''}<br/>
            ${invoice.customer?.billingCity || ''}, ${invoice.customer?.billingCountry || ''}<br/>
            TRN: ${invoice.customer?.vatNumber || '-'}
          </div>
        </div>
      </div>
      <div class="address-box">
        <label>SHIP TO</label>
        <div class="address-content">
          <div class="bold">${invoice.customer?.company || invoice.customer?.name || ''}</div>
          <div style="margin-top:5px; line-height:1.4; color:#444;">
            ${invoice.customer?.shippingStreet || invoice.customer?.billingStreet || ''}<br/>
            ${invoice.customer?.shippingCity || ''}, ${invoice.customer?.billingCountry || ''}<br/>
            TRN: ${invoice.customer?.vatNumber || '-'}
          </div>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th width="30" class="text-center">#</th>
          <th>DESCRIPTION</th>
          <th width="80" class="text-center">HSN/SAC</th>
          <th width="60" class="text-center">${qtyHeader}</th>
          <th width="80" class="text-center">RATE</th>
          <th width="100" class="text-center">TAXES</th>
          <th width="90" class="text-center">TAX AMOUNT</th>
          <th width="100" class="text-right">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${(invoice.items || []).map((i, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${i.description}</td>
          <td class="text-center">${i.hsnSacCode || '-'}</td>
          <td class="text-center">${i.quantity || i.hours || 0}</td>
          <td class="text-center">${fmt(i.rate)}</td>
          <td class="text-center" style="font-size:8px;">${(i.taxDetails || []).map(t => `${t.name} (${t.rate}%)`).join('<br/>')}</td>
          <td class="text-center">${fmt(i.totalTax)}</td>
          <td class="text-right">${fmt(i.totalAmount)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap: 40px;">
      <div>
        ${taxBreakdownHtml}
        ${bankDetailsHtml}
        <div style="margin-top:20px; font-size:9px; color:#666; line-height: 1.5;">
          <strong>Terms:</strong> ${(invoice.terms || settings.defaultTerms || 'Thank you for your business!').split('\\n').join('<br/>')}
          ${(invoice.adminNote || invoice.notes || settings.defaultFooterNote) ? `
          <br/><br/>
          <strong>Notes:</strong> ${(invoice.adminNote || invoice.notes || settings.defaultFooterNote).split('\\n').join('<br/>')}
          ` : ''}
        </div>
      </div>
      <div>
        <table class="summary-table">
          <tr><td>Subtotal</td><td class="text-right">${invoice.currency || 'INR'} ${fmt(invoice.subtotal)}</td></tr>
          <tr><td>Total Tax</td><td class="text-right">${invoice.currency || 'INR'} ${fmt(invoice.totalTax)}</td></tr>
          <tr class="total-row" style="background:#1f4e79; color:#fff; font-weight:bold;">
            <td style="padding:10px;">Total</td>
            <td class="text-right" style="padding:10px;">${invoice.currency || 'INR'} ${fmt(invoice.grandTotal)}</td>
          </tr>
        </table>
        
        <div class="spacer" style="height:40px;"></div>
        
        <div class="signature-box">
          ${settings.signatureUrl ? `<img src="${settings.signatureUrl}" />` : '<div style="height:60px;"></div>'}
          <div class="signature-line">
            <div class="bold">Authorized Signature</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>
  `;
};
