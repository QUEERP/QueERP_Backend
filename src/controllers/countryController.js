const { countriesData, getTaxType, getCurrencySymbol } = require('../utils/countryHelper');

exports.getCountries = (req, res) => {
  try {
    const formattedCountries = countriesData
      .filter(c => c.cca2 && c.name && c.currencies && Object.keys(c.currencies).length > 0)
      .map(c => {
        const currencyKey = Object.keys(c.currencies)[0];
        const currencyData = c.currencies[currencyKey];
        const currencyCode = currencyKey;
        const currencySymbol = currencyData.symbol || getCurrencySymbol(currencyCode);
        
        return {
          code: c.cca2,
          name: c.name.common,
          currency_code: currencyCode,
          currency_symbol: currencySymbol,
          tax_type: getTaxType(c.cca2)
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({ success: true, data: formattedCountries });
  } catch (error) {
    console.error("Error fetching countries:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
