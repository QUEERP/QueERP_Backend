const GSTEngine = require('./compliance/india/GSTEngine');
const VATEngine = require('./compliance/uae/VATEngine');
const GenericEngine = require('./compliance/generic/GenericEngine');

class TaxEngine {
  /**
   * Computes dynamic tax based on country, state, and tax parameters
   */
  static calculateTax(params) {
    const { companyCountry = 'UAE' } = params;
    const country = companyCountry.toUpperCase();
    
    if (country === 'INDIA') {
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

    if (country === 'UAE' || country === 'UNITED ARAB EMIRATES') {
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

    // Default to Generic rules for Canada and other countries
    return GenericEngine.calculateTax({
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
