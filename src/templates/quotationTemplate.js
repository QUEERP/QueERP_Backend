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

  const taxBreakdownHtml = quotation.tax > 0 ? `
    <div style="background:#f8f9fa; border:1px solid #eee; padding:10px; font-size: 9px;">
      <div style="font-weight:bold; border-bottom:1px solid #ddd; padding-bottom:5px; margin-bottom:10px; text-transform:uppercase;">Tax Breakdown</div>
      <div style="margin-bottom:3px;">Overall Tax: ${quotation.currency || 'INR'} ${fmt(quotation.tax)}</div>
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

  .info-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background:#ddd; border:1px solid #ddd; margin-bottom:15px; }
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
  .signature-box img { max-width: 150px; max-height: 70px; margin-bottom: 5px; object-fit: contain; object-position: center; }
  .signature-line { border-top: 2.5px solid #000; display: inline-block; width: 220px; padding-top: 8px; text-align: center; }
</style>
</head>
<body>
<div class="page-wrapper" style="position:relative;">
  ${quotation.status === 'APPROVED' || quotation.status === 'ACCEPTED' ? `
  <div style="position:absolute; top:40%; left:50%; transform:translate(-50%, -50%) rotate(-15deg); font-size:120px; font-weight:900; color:rgba(16, 185, 129, 0.08); border: 8px solid rgba(16, 185, 129, 0.08); padding: 20px 40px; border-radius: 30px; text-transform: uppercase; z-index: -1; pointer-events: none;">
    APPROVED
  </div>
  ` : ''}
  <div class="content-padding">
    <div class="invoice-header">
      <div>
        ${settings.companyLogo ? '<img src="' + settings.companyLogo + '" style="max-height:80px; max-width:100%; object-fit:contain; object-position:left;" />' : ''}
      </div>
      <div class="text-center">
        <div class="bold" style="font-size:16px;">${settings.companyName || ''}</div>
        <div style="color:#444; margin-top:3px; font-size:10px; line-height:1.4;">
          ${settings.address || ''}<br/>
          ${settings.phone ? settings.phone : ''}<br/>
          ${settings.trn ? 'TRN: ' + settings.trn : ''}
        </div>
      </div>
      <div class="text-right">
        <div class="invoice-title">QUOTATION</div>
        <div class="invoice-number">${quotation.quoteNumber}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box"><label>Date</label>${new Date(quotation.issueDate).toDateString()}</div>
      <div class="info-box"><label>Expiry</label>${quotation.expiryDate ? new Date(quotation.expiryDate).toDateString() : '-'}</div>
      <div class="info-box"><label>Deal</label>${quotation.deal?.name || '-'}</div>
      <div class="info-box"><label>Status</label><div style="font-size:8px;">${quotation.status}</div></div>
    </div>

    <div class="address-grid">
      <div class="address-box">
        <label>QUOTATION TO</label>
        <div class="address-content">
          <div class="bold">${quotation.customer?.company || quotation.customer?.name || ''}</div>
          <div style="margin-top:5px; line-height:1.4; color:#444;">
            ${quotation.customer?.billingStreet || quotation.customer?.address || ''}<br/>
            ${quotation.customer?.billingCity || ''}, ${quotation.customer?.billingCountry || ''}<br/>
            ${quotation.customer?.vatNumber ? 'TRN: ' + quotation.customer.vatNumber : ''}
          </div>
        </div>
      </div>
      <div class="address-box">
        <label>SHIP TO</label>
        <div class="address-content">
          <div class="bold">${quotation.customer?.company || quotation.customer?.name || ''}</div>
          <div style="margin-top:5px; line-height:1.4; color:#444;">
            ${quotation.customer?.shippingStreet || quotation.customer?.billingStreet || ''}<br/>
            ${quotation.customer?.shippingCity || ''}, ${quotation.customer?.billingCountry || ''}<br/>
            ${quotation.customer?.vatNumber ? 'TRN: ' + quotation.customer.vatNumber : ''}
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
          <th width="80" class="text-center">TAX %</th>
          <th width="100" class="text-right">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${(quotation.items || []).map((i, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>
            <div style="font-weight:600; color:#111;">${i.itemName || ''}</div>
            <div style="${i.itemName ? 'color:#555; margin-top:2px; font-size:9px;' : ''}">${i.description}</div>
          </td>
          <td class="text-center">${i.hsnSacCode || '-'}</td>
          <td class="text-center">${i.quantity || 0}</td>
          <td class="text-center">${fmt(i.price)}</td>
          <td class="text-center">${i.taxPercent || 0}%</td>
          <td class="text-right">${fmt(i.total)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap: 40px;">
      <div>
        ${taxBreakdownHtml}
        <div style="margin-top:20px; font-size:9px; color:#666; line-height: 1.5;">
          ${(quotation.notes || settings.defaultTerms) ? `
          <strong>Notes:</strong> ${(quotation.notes || settings.defaultTerms || '').split('\\n').join('<br/>')}
          ` : ''}
        </div>
      </div>
      <div>
        <table class="summary-table">
          <tr><td>Subtotal</td><td class="text-right">${quotation.currency || 'INR'} ${fmt(quotation.subtotal)}</td></tr>
          <tr><td>Overall Tax</td><td class="text-right">${quotation.currency || 'INR'} ${fmt(quotation.tax)}</td></tr>
          ${quotation.discount > 0 ? `<tr><td>Discount</td><td class="text-right">-${quotation.currency || 'INR'} ${fmt(quotation.discount)}</td></tr>` : ''}
          <tr class="total-row" style="background:#1f4e79; color:#fff; font-weight:bold;">
            <td style="padding:10px;">Total</td>
            <td class="text-right" style="padding:10px;">${quotation.currency || 'INR'} ${fmt(quotation.totalAmount)}</td>
          </tr>
        </table>
        
        <div class="spacer" style="height:40px;"></div>
        
        <div class="signature-box">
          ${settings.signatureUrl ? '<img src="' + settings.signatureUrl + '" style="max-height:70px; max-width:150px; object-fit:contain; object-position:center;" />' : '<div style="height:60px;"></div>'}
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
