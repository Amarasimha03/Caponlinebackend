/**
 * Normalize boolean values from backend strings/booleans
 * @param {any} value 
 * @returns {boolean}
 */
export const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return !!value;
};

/**
 * Format timestamps with proper locale handling
 * @param {string|number|Date} timestamp 
 * @param {string} locale 
 * @returns {string}
 */
export const formatTimestamp = (timestamp, locale = 'en-IN') => {
  try {
    return new Date(timestamp).toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return 'Invalid date';
  }
};
