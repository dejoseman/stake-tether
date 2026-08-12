const { parseAmount, round2, formatAmount } = require('../../utils/money');

/*
 * These guard the fix for the money-minting bug in POST /transactions/transfer.
 *
 * `receiver.balance += amount` string-concatenated when `amount` arrived as a
 * string — 50 + "1" === "501" — which Mongoose then cast back to the number
 * 501. Posting {"amount": "1"} turned a $50 balance into $501 while debiting
 * the sender a single dollar.
 *
 * Every monetary input now passes through parseAmount(), so the coercion rules
 * below are the whole defence. They are unit-testable with no database.
 */

describe('parseAmount', () => {
  it('accepts numbers', () => {
    expect(parseAmount(10)).toBe(10);
    expect(parseAmount(10.5)).toBe(10.5);
    expect(parseAmount(0.01)).toBe(0.01);
  });

  it('accepts numeric strings and returns a real Number', () => {
    expect(parseAmount('10')).toBe(10);
    expect(parseAmount('10.5')).toBe(10.5);
    expect(typeof parseAmount('10')).toBe('number');
  });

  it('rounds to cents', () => {
    expect(parseAmount('10.005')).toBe(10.01);
    expect(parseAmount('10.004')).toBe(10);
    expect(parseAmount(0.1 + 0.2)).toBe(0.3);
  });

  it('rejects zero and negatives', () => {
    expect(parseAmount(0)).toBeNull();
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount(-1)).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('-0.01')).toBeNull();
  });

  it('rejects non-numeric strings', () => {
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('10abc')).toBeNull();
    expect(parseAmount('1,000')).toBeNull();
  });

  it('rejects nullish and non-finite values', () => {
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
    expect(parseAmount(NaN)).toBeNull();
    expect(parseAmount(Infinity)).toBeNull();
    expect(parseAmount(-Infinity)).toBeNull();
    expect(parseAmount('1e400')).toBeNull(); // overflows to Infinity
  });

  it('rejects non-primitives', () => {
    // Number([]) === 0 and Number([10]) === 10, so these must be blocked
    // before coercion rather than after it.
    expect(parseAmount([])).toBeNull();
    expect(parseAmount([10])).toBeNull();
    expect(parseAmount({})).toBeNull();
    expect(parseAmount({ amount: 10 })).toBeNull();
    expect(parseAmount(true)).toBeNull();
    expect(parseAmount(false)).toBeNull();
  });

  it('rejects absurdly large amounts', () => {
    expect(parseAmount(1e13)).toBeNull();
    expect(parseAmount('999999999999999')).toBeNull();
  });

  it('never returns a string, whatever the input', () => {
    const inputs = [10, '10', '10.00', 0.1, '0.01', 1e11];
    for (const input of inputs) {
      const result = parseAmount(input);
      if (result !== null) expect(typeof result).toBe('number');
    }
  });
});

describe('round2', () => {
  it('eliminates float artefacts', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
  });

  it('leaves clean values alone', () => {
    expect(round2(10)).toBe(10);
    expect(round2(0)).toBe(0);
  });

  it('is stable when applied repeatedly', () => {
    // The staking cron rounds on every accrual tick, so this must not drift.
    let n = 100;
    for (let i = 0; i < 1000; i += 1) n = round2(n + 0.01);
    expect(n).toBe(110);
  });

  it('handles junk without throwing', () => {
    expect(round2(NaN)).toBe(0);
    expect(round2(Infinity)).toBe(0);
  });
});

describe('formatAmount', () => {
  it('always renders two decimal places', () => {
    expect(formatAmount(10)).toBe('10.00');
    expect(formatAmount(10.5)).toBe('10.50');
    expect(formatAmount(0.1 + 0.2)).toBe('0.30');
    expect(formatAmount(undefined)).toBe('0.00');
  });
});
