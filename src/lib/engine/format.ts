/**
 * Pure functions for currency and numerical formatting in Indian numbering format (Lakhs / Crores).
 * Rule: All maths and formatting lives ONLY in src/lib/engine/ as pure functions with unit tests.
 */

/**
 * Formats an amount in INR with the Indian comma system (e.g., ₹1,50,000).
 * Always returns a clean formatted string. Negative numbers are prefixed with -₹.
 */
export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) return "₹0";

  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));

  // Convert to Indian grouping (last 3 digits, then groups of 2)
  const str = absAmount.toString();
  let result = "";

  if (str.length <= 3) {
    result = str;
  } else {
    const lastThree = str.substring(str.length - 3);
    const remaining = str.substring(0, str.length - 3);
    const withCommas = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    result = `${withCommas},${lastThree}`;
  }

  return isNegative ? `-₹${result}` : `₹${result}`;
}

/**
 * Formats a large INR amount in Lakhs (L) or Crores (Cr) for compact dashboard metrics.
 */
export function formatCompactINR(amount: number): string {
  if (!Number.isFinite(amount)) return "₹0";

  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  let formatted = "";
  if (abs >= 10000000) {
    // 1 Crore = 10,000,000
    const val = abs / 10000000;
    formatted = `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(2)} Cr`;
  } else if (abs >= 100000) {
    // 1 Lakh = 100,000
    const val = abs / 100000;
    formatted = `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(2)} L`;
  } else if (abs >= 1000) {
    const val = abs / 1000;
    formatted = `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}k`;
  } else {
    formatted = abs.toString();
  }
  return isNegative ? `-₹${formatted}` : `₹${formatted}`;
}

export function formatLakh(amount: number): string {
  if (!Number.isFinite(amount)) return "₹0 lakh";
  const lakhs = Math.abs(amount) / 100000;
  const formatted = Number.isInteger(lakhs)
    ? String(lakhs)
    : lakhs.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${amount < 0 ? "-" : ""}₹${formatted} lakh`;
}
