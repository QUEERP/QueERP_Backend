/**
 * Simple JSON-based condition evaluator.
 * Supports checking values inside objects.
 * Example condition: { "country": "INDIA" }
 * If recordData.country === "INDIA", returns true.
 */
exports.evaluateCondition = (condition, recordData) => {
  if (!condition || typeof condition !== 'object') return true;

  for (const [key, expectedValue] of Object.entries(condition)) {
    // Basic dot notation support (e.g. 'business.country')
    const keys = key.split('.');
    let actualValue = recordData;
    for (const k of keys) {
      if (actualValue && typeof actualValue === 'object') {
        actualValue = actualValue[k];
      } else {
        actualValue = undefined;
        break;
      }
    }

    if (actualValue !== expectedValue) {
      return false; // Condition failed
    }
  }

  return true;
};
