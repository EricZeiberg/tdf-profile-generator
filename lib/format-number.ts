/**
 * Formats a number to European style (comma as decimal separator)
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string with comma as decimal separator
 */
export function formatNumberEuropean(
  value: number,
  decimals: number = 0
): string {
  return value.toFixed(decimals).replace(".", ",");
}

/**
 * Formats a number with thousands separators in European style
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string with period as thousands separator and comma as decimal separator
 */
export function formatNumberWithThousands(
  value: number,
  decimals: number = 0
): string {
  const formatted = value.toFixed(decimals);
  const [integerPart, decimalPart] = formatted.split(".");

  // Add thousands separators
  const withThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  // Return with comma as decimal separator
  return decimalPart ? `${withThousands},${decimalPart}` : withThousands;
}
