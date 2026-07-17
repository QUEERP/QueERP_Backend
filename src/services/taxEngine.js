const GSTEngine = require('./compliance/india/GSTEngine');
const VATEngine = require('./compliance/uae/VATEngine');

class TaxEngine {
  /**
   * Computes dynamic tax based on country, state, and tax parameters
   */
  static calculateTax(params) {
    const { companyCountry = 'UAE' } = params;
    
    if (companyCountry.toUpperCase() === 'INDIA') {
      return GSTEngine.calculateTax({
        businessCountry: params.companyCountry || params.businessCountry,
        businessState: params.companyState || params.businessState,
        customerCountry: params.customerCountry,
        customerState: params.customerState,
        lineSubtotal: params.lineSubtotal,
        taxPercent: params.taxPercent,
        manualTax: params.manualTax,
        vatType: params.vatType
      });
    }

    // Default to UAE / VAT rules
    return VATEngine.calculateTax({
        businessCountry: params.companyCountry || params.businessCountry,
        businessState: params.companyState || params.businessState,
        customerCountry: params.customerCountry,
        customerState: params.customerState,
        lineSubtotal: params.lineSubtotal,
        taxPercent: params.taxPercent,
        manualTax: params.manualTax,
        vatType: params.vatType
    });
  }
}

module.exports = TaxEngine;
