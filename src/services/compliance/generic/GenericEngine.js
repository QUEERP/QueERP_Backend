class GenericEngine {
  static calculateTax(params) {
    const { taxPercent, lineSubtotal } = params;
    const rate = Number(taxPercent || 0);
    const baseSubtotal = Number(lineSubtotal || 0);
    const amount = Number(((baseSubtotal * rate) / 100).toFixed(2));
    
    const breakdown = [];
    if (rate > 0) {
      breakdown.push({ name: 'Tax', rate: rate, amount: amount });
    }
    
    return {
      taxTreatment: 'DOMESTIC',
      taxType: 'TAX',
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      vatRate: rate,
      totalTaxAmount: amount,
      effectiveSubtotal: baseSubtotal,
      breakdown
    };
  }
}

module.exports = GenericEngine;
