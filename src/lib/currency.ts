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

function formatAmount(amount: number): string {
  // Always two decimals: a list of amounts reads as a column, and a round
  // number dropping its ".00" next to ones that don't ragged the column
  // instead of lining it up.
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCost(amount: number | null, currency: string): string {
  if (amount === null) return "no cost yet";
  return `${currencySymbol(currency)}${formatAmount(amount)}`;
}

export function formatTotal(amount: number, currency: string): string {
  return `${currencySymbol(currency)}${formatAmount(amount)}`;
}
