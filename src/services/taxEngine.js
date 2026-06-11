class TaxEngine {
  /**
   * Computes dynamic tax based on Region, State matching, and Product base tax percent.
   */
  static calculateTax(params) {
    const { 
      companyCountry = '', 
      companyState = '', 
      customerCountry = '', 
      customerState = '', 
      taxPercent = 0, 
      lineSubtotal = 0,
      vatType = 'exclusive',
      manualTax = null 
    } = params;

    // Normalization
    const coCountry = companyCountry.trim().toUpperCase();
    const cuCountry = customerCountry.trim().toUpperCase();
    const coState = companyState.trim().toUpperCase();
    const cuState = customerState.trim().toUpperCase();

    const breakdown = [];
    const baseSubtotal = Number(lineSubtotal || 0);
    let baseTaxPercent = Number(taxPercent || 0);

    // 1. India GST System
    if (coCountry === 'INDIA' && cuCountry === 'INDIA') {
      if (coState === cuState) {
        // Intra-State: CGST + SGST
        let cgstRate, sgstRate;
        if (manualTax && manualTax.cgstRate !== undefined && manualTax.sgstRate !== undefined) {
          cgstRate = Number(manualTax.cgstRate);
          sgstRate = Number(manualTax.sgstRate);
        } else {
          cgstRate = baseTaxPercent / 2;
          sgstRate = baseTaxPercent / 2;
        }
        
        const cgstAmount = Number(((baseSubtotal * cgstRate) / 100).toFixed(2));
        const sgstAmount = Number(((baseSubtotal * sgstRate) / 100).toFixed(2));
        
        breakdown.push({ name: 'CGST', rate: cgstRate, amount: cgstAmount });
        breakdown.push({ name: 'SGST', rate: sgstRate, amount: sgstAmount });
        
        return {
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

    // 2. UAE VAT System
    if (coCountry === 'UAE' || coCountry === 'UNITED ARAB EMIRATES') {
      const uaeVatRate = baseTaxPercent || 5;
      let vatAmount = 0;
      let effectiveSubtotal = baseSubtotal;

      if (vatType === 'inclusive') {
        // VAT extracted from total: Total / (1 + Rate) * Rate
        // Total = Subtotal + VAT
        // Subtotal = Total / (1 + Rate/100)
        // VAT = Total - Subtotal
        const total = baseSubtotal;
        effectiveSubtotal = Number((total / (1 + uaeVatRate / 100)).toFixed(2));
        vatAmount = Number((total - effectiveSubtotal).toFixed(2));
      } else {
        // VAT added on top
        vatAmount = Number(((baseSubtotal * uaeVatRate) / 100).toFixed(2));
      }

      breakdown.push({ name: 'VAT', rate: uaeVatRate, amount: vatAmount });

      return {
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

    // 3. Fallback/Standard Country tax mapping
    if (baseTaxPercent > 0) {
      const standardTaxAmount = Number(((baseSubtotal * baseTaxPercent) / 100).toFixed(2));
      breakdown.push({ name: 'Standard Tax', rate: baseTaxPercent, amount: standardTaxAmount });

      return {
        taxType: 'VAT',
        cgstRate: 0,
        sgstRate: 0,
        igstRate: 0,
        vatRate: baseTaxPercent,
        totalTaxAmount: standardTaxAmount,
        breakdown
      };
    }

    return {
      taxType: 'ZERO_TAX',
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      vatRate: 0,
      totalTaxAmount: 0,
      breakdown: []
    };
  }
}

module.exports = TaxEngine;
