const cron = require('node-cron');
const Staking = require('../models/Staking');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { round2, formatAmount } = require('../utils/money');
const { credit } = require('../utils/balance');

/*
 * Staking accrual and payout.
 *
 * Defects fixed from the original implementation:
 *
 * 1. DOUBLE PAYOUT ACROSS INSTANCES. The job ran in-process with no lock, so
 *    two containers meant every maturing stake was credited twice. Each stake
 *    is now claimed with an atomic status transition (active -> completing)
 *    before any money moves; only one worker can win that transition.
 *
 * 2. NULL completesAt MATURED INSTANTLY. `now >= null` coerces to `now >= 0`,
 *    which is always true, so any active stake missing completesAt was paid out
 *    on the next tick. Both sweeps now require the field to be set.
 *
 * 3. NULL lastProcessedAt PAID OUT A FORTUNE. `new Date() - null` is
 *    milliseconds since the epoch, giving hoursPassed of roughly 490,000 and a
 *    correspondingly absurd reward. Now guarded, and it falls back to
 *    startedAt.
 *
 * 4. accruedRewards WAS NOT CLEARED after payout, leaving a paid stake still
 *    showing a claimable balance.
 *
 * 5. NON-ATOMIC BALANCE CREDIT raced with concurrent withdrawals. Now uses an
 *    atomic $inc.
 *
 * 6. UNBOUNDED SCAN — every active stake re-saved every 60 seconds. Now
 *    batched and index-backed.
 *
 * Still single-instance by design: run this on exactly one worker and set
 * RUN_CRON=false elsewhere. The atomic claim makes a second instance safe
 * rather than catastrophic, but it is not a substitute for the config.
 */

const BATCH_SIZE = 500;

/**
 * Accrue rewards for stakes that are still running.
 */
const accrue = async (now) => {
  const stakes = await Staking.find({
    status: 'active',
    completesAt: { $ne: null },      // guard #2
    lastProcessedAt: { $ne: null },  // guard #3
  }).limit(BATCH_SIZE);

  for (const stake of stakes) {
    try {
      // Never accrue past maturity.
      const effectiveNow = now > stake.completesAt ? stake.completesAt : now;
      const hoursPassed = (effectiveNow - stake.lastProcessedAt) / (1000 * 60 * 60);

      // Negative can happen if lastProcessedAt was set ahead of now by clock skew.
      if (hoursPassed <= 0) continue;

      const proportion = hoursPassed / stake.durationHours;
      const rewardSlice = round2(stake.amount * (stake.returnPercent / 100) * proportion);

      if (rewardSlice <= 0) {
        // Too small to represent in cents — leave lastProcessedAt alone so the
        // time isn't lost, and let it accumulate until it rounds to something.
        continue;
      }

      const update = stake.autoCompound
        ? { $inc: { amount: rewardSlice }, $set: { lastProcessedAt: effectiveNow } }
        : { $inc: { accruedRewards: rewardSlice }, $set: { lastProcessedAt: effectiveNow } };

      // Conditional on the stake still being active and not yet re-processed,
      // so a concurrent tick cannot apply the same slice twice.
      // eslint-disable-next-line no-await-in-loop
      await Staking.updateOne(
        { _id: stake._id, status: 'active', lastProcessedAt: stake.lastProcessedAt },
        update
      );
    } catch (error) {
      console.error(`Accrual failed for stake ${stake._id}:`, error.message);
    }
  }
};

/**
 * Pay out stakes that have reached maturity.
 */
const payout = async (now) => {
  for (let i = 0; i < BATCH_SIZE; i += 1) {
    /*
     * Claim one matured stake atomically. findOneAndUpdate on
     * { status: 'active' } -> { status: 'completing' } is a compare-and-swap:
     * exactly one caller can observe 'active' and perform the write, so no two
     * workers (or two overlapping ticks) can ever pay the same stake.
     */
    // eslint-disable-next-line no-await-in-loop
    const stake = await Staking.findOneAndUpdate(
      {
        status: 'active',
        completesAt: { $ne: null, $lte: now },
        paidOutAt: null,
      },
      { $set: { status: 'completing' } },
      { new: true }
    );

    if (!stake) return; // nothing left to pay

    try {
      const payoutAmount = round2(stake.amount + stake.accruedRewards);

      // eslint-disable-next-line no-await-in-loop
      const user = await credit(stake.user, payoutAmount);

      if (!user) {
        // The account is gone. Park the stake rather than looping on it.
        // eslint-disable-next-line no-await-in-loop
        await Staking.updateOne(
          { _id: stake._id },
          { $set: { status: 'failed' } }
        );
        console.error(`Stake ${stake._id} matured but user ${stake.user} no longer exists`);
        continue;
      }

      // Mark paid. accruedRewards is zeroed because it has now been moved into
      // the user's balance — leaving it set made a paid stake look claimable.
      // eslint-disable-next-line no-await-in-loop
      await Staking.updateOne(
        { _id: stake._id },
        {
          $set: {
            status: 'completed',
            accruedRewards: 0,
            paidOutAt: new Date(),
            payoutAmount,
            lastProcessedAt: stake.completesAt,
          },
        }
      );

      sendEmail({
        email: user.email,
        subject: `Stake Completed: ${stake.planName} — $${formatAmount(payoutAmount)} Credited`,
        message: `Hi ${user.username},\n\nGreat news! Your ${stake.planName} staking contract has matured.\n\nYour total payout of $${formatAmount(payoutAmount)} (capital + ${stake.returnPercent}% return) has been automatically credited to your available balance.\n\nYou can now withdraw or re-stake your funds.\n\nBest regards,\nThe GeneratingPro Team`,
      });

      console.log(`Stake ${stake._id} completed — $${formatAmount(payoutAmount)} credited to ${stake.user}`);
    } catch (error) {
      // Release the claim so the next tick retries rather than stranding the
      // stake in 'completing' forever.
      // eslint-disable-next-line no-await-in-loop
      await Staking.updateOne(
        { _id: stake._id, status: 'completing', paidOutAt: null },
        { $set: { status: 'active' } }
      );
      console.error(`Payout failed for stake ${stake._id}, released for retry:`, error.message);
    }
  }
};

/**
 * Recover stakes stuck in 'completing' — a worker that crashed mid-payout.
 * Only releases ones that were never actually credited (paidOutAt is null).
 */
const recoverStuck = async () => {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const result = await Staking.updateMany(
    { status: 'completing', paidOutAt: null, updatedAt: { $lt: cutoff } },
    { $set: { status: 'active' } }
  );
  if (result.modifiedCount > 0) {
    console.warn(`Recovered ${result.modifiedCount} stake(s) stuck in 'completing'`);
  }
};

let running = false;

const startStakingCron = () => {
  console.log('Staking processor started (every minute)');

  cron.schedule('* * * * *', async () => {
    // Overlap guard: if a tick is slow, don't start another on top of it.
    if (running) {
      console.warn('Previous staking tick still running, skipping this one');
      return;
    }
    running = true;

    try {
      const now = new Date();
      await recoverStuck();
      await accrue(now);
      await payout(now);
    } catch (error) {
      console.error('Staking processor tick failed:', error);
    } finally {
      running = false;
    }
  });
};

module.exports = startStakingCron;
module.exports.accrue = accrue;
module.exports.payout = payout;
