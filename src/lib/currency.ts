// Hardcoded exchange rates relative to USD (updated 2026)
// In production, you'd fetch these from an API like exchangerate-api.com
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1550, // Nigerian Naira
  GHS: 15.5, // Ghana Cedi
  KES: 156, // Kenya Shilling
  ZAR: 18.5, // South African Rand
  INR: 83,
  CAD: 1.36,
  AUD: 1.52,
};

export const SUPPORTED_CURRENCIES = Object.keys(EXCHANGE_RATES).sort();

/**
 * Convert a price from one currency to another
 * @param amount - the amount to convert (number)
 * @param fromCurrency - currency code (e.g., "USD")
 * @param toCurrency - currency code (e.g., "EUR")
 * @returns converted amount (number, rounded to 2 decimals)
 */
export const convertCurrency = (
  amount: number | null | undefined,
  fromCurrency: string = "USD",
  toCurrency: string = "USD"
): string => {
  if (!amount || amount <= 0) return "";

  const fromRate = EXCHANGE_RATES[fromCurrency] || EXCHANGE_RATES.USD;
  const toRate = EXCHANGE_RATES[toCurrency] || EXCHANGE_RATES.USD;

  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate;
  const converted = usdAmount * toRate;

  // Format with currency symbol
  const symbol = getCurrencySymbol(toCurrency);
  return `${symbol}${converted.toFixed(2)}`;
};

/**
 * Get the currency symbol for a given code
 */
export const getCurrencySymbol = (code: string): string => {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    NGN: "₦",
    GHS: "GH₵",
    KES: "KSh",
    ZAR: "R",
    INR: "₹",
    CAD: "C$",
    AUD: "A$",
  };
  return symbols[code] || code;
};

/**
 * Parse a cost string like "$5" or "₦2000" and extract the numeric value
 * Returns null if parsing fails
 */
export const parseCostAmount = (costStr: string | null | undefined): number | null => {
  if (!costStr) return null;
  const match = costStr.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
};