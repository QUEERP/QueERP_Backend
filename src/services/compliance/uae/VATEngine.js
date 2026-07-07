class UaeVATEngine {
  static calculateTax(params) {
    const { 
      customerCountry, 
      lineSubtotal, 
      taxPercent, 
      vatType 
    } = params;

    const breakdown = [];
    const baseSubtotal = Number(lineSubtotal || 0);
    const cuCountry = (customerCountry || '').trim().toUpperCase();

    // 1. Export Rules
    if (cuCountry !== 'UAE' && cuCountry !== 'UNITED ARAB EMIRATES') {
      return this.handleExport(baseSubtotal, breakdown);
    }

    // 2. Domestic VAT Rules
    const uaeVatRate = Number(taxPercent || 5);
    let vatAmount = 0;
    let effectiveSubtotal = baseSubtotal;

    if (vatType === 'inclusive') {
      const total = baseSubtotal;
      effectiveSubtotal = Number((total / (1 + uaeVatRate / 100)).toFixed(2));
      vatAmount = Number((total - effectiveSubtotal).toFixed(2));
    } else {
      vatAmount = Number(((baseSubtotal * uaeVatRate) / 100).toFixed(2));
    }

    breakdown.push({ name: 'VAT', rate: uaeVatRate, amount: vatAmount });

    return {
      taxTreatment: 'DOMESTIC',
      taxType: 'VAT',
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      vatRate: uaeVatRate,
      totalTaxAmount: vatAmount,
      effectiveSubtotal,
      breakdown
    };
  }

  static handleExport(baseSubtotal, breakdown) {
    // Treat transaction as Export. Apply Zero Rated VAT / Export VAT according to UAE rules.
    const vatRate = 0;
    const vatAmount = 0;

    breakdown.push({ name: 'VAT (Zero Rated / Export)', rate: vatRate, amount: vatAmount });

    return {
      taxTreatment: 'EXPORT',
      taxType: 'VAT',
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      vatRate: vatRate,
      totalTaxAmount: vatAmount,
      breakdown
    };
  }
}

module.exports = UaeVATEngine;
