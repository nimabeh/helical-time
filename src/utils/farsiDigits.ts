/**
 * Utilities for Persian / Farsi digits (۰-۹) conversion and formatting
 */

const FARSI_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

/**
 * Converts English/Latin digits (0-9) to standard Persian / Farsi digits (۰-۹).
 * e.g. "12:45" -> "۱۲:۴۵", 2026 -> "۲۰۲۶", "15x" -> "۱۵x"
 */
export function toFarsiDigits(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[0-9]/g, (char) => FARSI_DIGITS[Number(char)] ?? char);
}

/**
 * Pads a number with leading zeros and converts it into Farsi numerals.
 * e.g. (7, 2) -> "۰۷", (12, 2) -> "۱۲"
 */
export function formatFarsiNumber(num: number, padLength = 2): string {
  const padded = Math.floor(Math.abs(num)).toString().padStart(padLength, '0');
  return toFarsiDigits(padded);
}
