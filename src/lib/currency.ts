export const CURRENCIES: { code: string; symbol: string; label: string }[] = [
  { code: "EUR", symbol: "€", label: "EUR — Euro" },
  { code: "USD", symbol: "$", label: "USD — US Dollar" },
  { code: "GBP", symbol: "£", label: "GBP — British Pound" },
  { code: "JPY", symbol: "¥", label: "JPY — Japanese Yen" },
  { code: "CHF", symbol: "CHF", label: "CHF — Swiss Franc" },
  { code: "MXN", symbol: "MX$", label: "MXN — Mexican Peso" },
  { code: "CAD", symbol: "CA$", label: "CAD — Canadian Dollar" },
  { code: "AUD", symbol: "AU$", label: "AUD — Australian Dollar" },
];

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export function formatCost(amount: number | null, currency: string): string {
  if (amount === null) return "no cost yet";
  const symbol = currencySymbol(currency);
  const formatted = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${symbol}${formatted}`;
}

export function formatTotal(amount: number, currency: string): string {
  const symbol = currencySymbol(currency);
  const formatted = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${symbol}${formatted}`;
}
