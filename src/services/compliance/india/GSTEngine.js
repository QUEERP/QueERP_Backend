class IndiaGSTEngine {
  static calculateTax(params) {
    const { 
      businessCountry, 
      businessState, 
      customerCountry, 
      customerState, 
      lineSubtotal, 
      taxPercent, 
      manualTax 
    } = params;

    const breakdown = [];
    const baseSubtotal = Number(lineSubtotal || 0);
    let baseTaxPercent = Number(taxPercent || 0);

    const cuCountry = (customerCountry || '').trim().toUpperCase();
    const buState = (businessState || '').trim().toUpperCase();
    const cuState = (customerState || '').trim().toUpperCase();

    // 1. Export Rules
    if (cuCountry !== 'INDIA') {
      return this.handleExport(baseSubtotal, baseTaxPercent, breakdown);
    }

    // 2. Domestic GST Rules
    if (buState === cuState) {
      // Intra-State: CGST + SGST
      let cgstRate, sgstRate;
      if (manualTax && (manualTax.cgstRate !== undefined || manualTax.sgstRate !== undefined)) {
        const rawRate = manualTax.cgstRate !== undefined ? Number(manualTax.cgstRate) : Number(manualTax.sgstRate);
        const rate = isNaN(rawRate) ? 0 : Math.max(0, rawRate);
        cgstRate = rate;
        sgstRate = rate;
      } else {
        cgstRate = baseTaxPercent / 2;
        sgstRate = baseTaxPercent / 2;
      }
      
      const cgstAmount = Number(((baseSubtotal * cgstRate) / 100).toFixed(2));
      const sgstAmount = Number(((baseSubtotal * sgstRate) / 100).toFixed(2));
      
      breakdown.push({ name: 'CGST', rate: cgstRate, amount: cgstAmount });
      breakdown.push({ name: 'SGST', rate: sgstRate, amount: sgstAmount });
      
      return {
        taxTreatment: 'DOMESTIC',
        taxType: 'CGST_SGST',
        cgstRate,
        sgstRate,
        igstRate: 0,
        vatRate: 0,
        totalTaxAmount: cgstAmount + sgstAmount,
        breakdown
      };
    } else {
      // Inter-State: IGST
      let igstRate;
      if (manualTax && manualTax.igstRate !== undefined) {
        igstRate = Number(manualTax.igstRate);
      } else {
        igstRate = baseTaxPercent;
      }
      
      const igstAmount = Number(((baseSubtotal * igstRate) / 100).toFixed(2));
      breakdown.push({ name: 'IGST', rate: igstRate, amount: igstAmount });

      return {
        taxTreatment: 'INTERSTATE',
        taxType: 'IGST',
        cgstRate: 0,
        sgstRate: 0,
        igstRate: igstRate,
        vatRate: 0,
        totalTaxAmount: igstAmount,
        breakdown
      };
    }
  }

  static handleExport(baseSubtotal, baseTaxPercent, breakdown) {
    const igstRate = baseTaxPercent;
    const igstAmount = Number(((baseSubtotal * igstRate) / 100).toFixed(2));
    
    if (igstRate > 0) {
      breakdown.push({ name: 'IGST (Export)', rate: igstRate, amount: igstAmount });
    }

    return {
      taxTreatment: 'EXPORT',
      taxType: 'IGST',
      cgstRate: 0,
      sgstRate: 0,
      igstRate: igstRate,
      vatRate: 0,
      totalTaxAmount: igstAmount,
      breakdown
    };
  }
}

module.exports = IndiaGSTEngine;
