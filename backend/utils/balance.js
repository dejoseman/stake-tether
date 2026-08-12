/**
 * Atomic balance operations.
 *
 * Every balance mutation used to be read-modify-write:
 *
 *     const user = await User.findById(id);
 *     user.balance -= amount;
 *     await user.save();
 *
 * Two concurrent requests both read the same starting balance, both pass the
 * "sufficient funds" check, and both write. The user spends the money twice.
 * This is the standard way custodial wallets get drained.
 *
 * These helpers push the check and the write into a single atomic MongoDB
 * operation, so the database — not the application — arbitrates concurrency.
 */

const User = require('../models/User');
const { round2 } = require('./money');

/**
 * Debit a user, but only if they actually have the funds.
 *
 * The `balance: { $gte: amount }` filter is the critical part: it is evaluated
 * atomically with the $inc, so a concurrent debit cannot slip between them.
 *
 * @returns the updated user document, or null if funds were insufficient
 *          (or the user does not exist).
 */
const debit = async (userId, amount, session = null) => {
  const opts = { new: true };
  if (session) opts.session = session;

  return User.findOneAndUpdate(
    { _id: userId, balance: { $gte: amount } },
    { $inc: { balance: -round2(amount) } },
    opts
  );
};

/**
 * Credit a user. Always succeeds if the user exists.
 *
 * @returns the updated user document, or null if the user does not exist.
 */
const credit = async (userId, amount, session = null) => {
  const opts = { new: true };
  if (session) opts.session = session;

  return User.findOneAndUpdate(
    { _id: userId },
    { $inc: { balance: round2(amount) } },
    opts
  );
};

/**
 * Snap a user's balance to 2dp. Cheap correction for accumulated float drift
 * from the staking cron; safe to call opportunistically.
 */
const normalize = async (userId) => {
  const user = await User.findById(userId).select('balance');
  if (!user) return null;
  const rounded = round2(user.balance);
  if (rounded !== user.balance) {
    await User.updateOne({ _id: userId }, { $set: { balance: rounded } });
  }
  return rounded;
};

module.exports = { debit, credit, normalize };
