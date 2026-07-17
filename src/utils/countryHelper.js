const countriesData = require('world-countries');

const getTaxType = (countryCode) => {
  if (countryCode === 'IN') return 'INDIA_GST';
  if (countryCode === 'AE') return 'UAE_VAT';
  return 'GENERIC';
};

const getCurrencySymbol = (currencyCode) => {
  const symbolMap = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'INR': '₹',
    'AED': 'د.إ',
    'AUD': 'A$',
    'CAD': 'C$',
    'JPY': '¥',
    'CNY': '¥'
  };
  
  if (symbolMap[currencyCode]) return symbolMap[currencyCode];
  
  try {
    const parts = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0
    }).formatToParts(0);
    const currencyPart = parts.find(p => p.type === 'currency');
    return currencyPart ? currencyPart.value : currencyCode;
  } catch(e) {
    return currencyCode;
  }
};

const getCountryData = (countryCode) => {
  // Try exact match for cca2
  const country = countriesData.find(c => c.cca2 === countryCode);
  if (!country) return null;

  const currencyKey = country.currencies ? Object.keys(country.currencies)[0] : 'USD';
  const currencyData = country.currencies ? country.currencies[currencyKey] : null;
  const currencyCode = currencyKey;
  const currencySymbol = (currencyData && currencyData.symbol) ? currencyData.symbol : getCurrencySymbol(currencyCode);

  return {
    code: country.cca2,
    name: country.name.common,
    currencyCode,
    currencySymbol,
    taxType: getTaxType(country.cca2)
  };
};

module.exports = {
  getTaxType,
  getCurrencySymbol,
  getCountryData,
  countriesData
};
