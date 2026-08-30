/**
 * Normalizes phone numbers to a consistent clean format.
 * Handles Bangladesh local numbers (01XXXXXXXXX) and international prefix (+880 / 880),
 * as well as general international numbers.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';

  // Remove spaces, dashes, parentheses, dots
  let cleaned = phone.replace(/[\s\-().]/g, '');

  // If starts with +880, convert to 0
  if (cleaned.startsWith('+880')) {
    cleaned = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('880') && cleaned.length === 13) {
    cleaned = '0' + cleaned.substring(3);
  }

  return cleaned;
}

/**
 * Returns phone variations for flexible MongoDB regex query matching
 */
export function getPhoneSearchVariations(phone: string): string[] {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return [];

  const variations = [normalized];

  if (normalized.startsWith('01') && normalized.length === 11) {
    variations.push('+88' + normalized);
    variations.push('88' + normalized);
  }

  return variations;
}
