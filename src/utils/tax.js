function calculateTaxes(amount, taxes) {
  const taxDetails = taxes.map(t => ({
    name: t.name,
    rate: t.rate,
    amount: (amount * t.rate) / 100
  }));

  const totalTax = taxDetails.reduce((sum, t) => sum + t.amount, 0);

  return { taxDetails, totalTax };
}

module.exports = { calculateTaxes };