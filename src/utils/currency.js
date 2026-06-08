/**
 * Currency Utilities for BuildGuard
 */

/**
 * Format a number into Indian Rupees (₹) with en-IN numbering format (lakhs/crores)
 * @param {number|string} amount - The numeric amount
 * @param {boolean} [showDecimal=true] - Whether to show decimal digits (.00)
 * @returns {string}
 */
export function formatRupees(amount, showDecimal = true) {
  const numericAmount = parseFloat(amount) || 0;
  
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimal ? 2 : 0,
    maximumFractionDigits: showDecimal ? 2 : 0
  });
  
  // Format and ensure it uses ₹ symbol
  return formatter.format(numericAmount);
}

/**
 * Parses a string value back into a clean float value for calculations
 * @param {string|number} value 
 * @returns {number}
 */
export function parseAmount(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const cleaned = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}
