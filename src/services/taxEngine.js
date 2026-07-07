const ComplianceEngine = require('./compliance/ComplianceEngine');

class TaxEngine {
  /**
   * Computes dynamic tax by delegating to ComplianceEngine
   */
  static calculateTax(params) {
    return ComplianceEngine.calculateTax({
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
