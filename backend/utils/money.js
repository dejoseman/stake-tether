/**
 * Monetary helpers.
 *
 * Two problems these solve:
 *
 * 1. Type confusion. `amount` arrives from JSON and was previously used raw.
 *    `balance += "1"` string-concatenates ("50" + "1" -> "501"), which was an
 *    exploitable money-minting bug in the transfer endpoint. Every monetary
 *    input must now go through parseAmount().
 *
 * 2. Float drift. Balances are IEEE-754 doubles, and the staking cron adds a
 *    fractional reward every minute. round2() clamps each write back to cents
 *    so ledgers reconcile.
 *
 * NOTE: storing money as integer cents (or Decimal128) remains the correct
 * long-term fix. That is a data migration, not a code change, so it is tracked
 * separately. round2() keeps drift bounded in the meantime.
 */

// Above this, doubles start losing cent-level precision and the number is
// far outside any legitimate transaction for this platform.
const MAX_AMOUNT = 1e12;

/**
 * Coerce an untrusted value into a positive monetary amount.
 * Returns null if the value is not a usable amount — callers must check.
 *
 * Rejects: strings that aren't numeric, NaN, Infinity, negatives, zero,
 * booleans, arrays, objects, and absurdly large values.
 */
const parseAmount = (value) => {
  if (value === null || value === undefined || value === '') return null;
  // Number([]) === 0 and Number(true) === 1, so reject non-primitives outright.
  if (typeof value !== 'number' && typeof value !== 'string') return null;

  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;
  if (n > MAX_AMOUNT) return null;

  return round2(n);
};

/**
 * Round to 2 decimal places, avoiding the classic (0.1 + 0.2) artefacts.
 */
const round2 = (n) => {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

/**
 * Format for display in emails and API messages.
 */
const formatAmount = (n) => round2(Number(n) || 0).toFixed(2);

module.exports = { parseAmount, round2, formatAmount, MAX_AMOUNT };
