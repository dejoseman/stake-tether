/* eslint-disable no-console */
/**
 * One-off migration to bring existing production data in line with the
 * hardened schema. Safe to run more than once — every step is idempotent.
 *
 *   node backend/scripts/migrate.js          # report only, changes nothing
 *   node backend/scripts/migrate.js --apply  # write the changes
 *
 * Run the report first, read it, then apply. Take a database snapshot before
 * applying.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('../models/User');
const Staking = require('../models/Staking');
const Transaction = require('../models/Transaction');
const { round2 } = require('../utils/money');

const APPLY = process.argv.includes('--apply');

const steps = [];
const step = (name, fn) => steps.push({ name, fn });

// ---------------------------------------------------------------------------

step('Backfill User.tokenVersion', async () => {
  // The auth middleware defaults a missing value to 0, so this is belt and
  // braces — but an explicit field keeps future reasoning simple.
  const filter = { tokenVersion: { $exists: false } };
  const count = await User.countDocuments(filter);
  if (APPLY && count) await User.updateMany(filter, { $set: { tokenVersion: 0 } });
  return `${count} user(s)`;
});

step('Normalise KYC document paths', async () => {
  // Old records stored '/uploads/<name>' — a live public URL under the static
  // mount that has now been removed. Only the bare filename is kept.
  const users = await User.find({ kycDocument: /^\/uploads\// }).select('kycDocument');
  if (APPLY) {
    for (const u of users) {
      const bare = u.kycDocument.replace(/^\/uploads\//, '');
      // eslint-disable-next-line no-await-in-loop
      await User.updateOne({ _id: u._id }, { $set: { kycDocument: bare } });
    }
  }
  return `${users.length} document path(s)`;
});

step('Retire the unused "matured" and "cancelled" stake statuses', async () => {
  // Neither was ever written by application code, but check rather than assume.
  const filter = { status: { $in: ['matured', 'cancelled'] } };
  const count = await Staking.countDocuments(filter);
  if (APPLY && count) {
    // 'matured' meant "finished but not yet paid". The cron pays anything
    // active and past completesAt, so putting these back to active lets it
    // settle them properly.
    await Staking.updateMany(
      { status: 'matured' },
      { $set: { status: 'active' } }
    );
    await Staking.updateMany(
      { status: 'cancelled' },
      { $set: { status: 'failed' } }
    );
  }
  return `${count} stake(s)`;
});

step('Backfill Staking.principal', async () => {
  const filter = { principal: { $exists: false } };
  const count = await Staking.countDocuments(filter);
  if (APPLY && count) {
    // For compounding stakes that have already grown, `amount` is the best
    // available approximation of the original principal.
    await Staking.updateMany(filter, [{ $set: { principal: '$amount' } }], { updatePipeline: true });
  }
  return `${count} stake(s)`;
});

step('Repair active stakes with null completesAt / lastProcessedAt', async () => {
  // These were the two null-guard bugs in the cron: a null completesAt made a
  // stake mature instantly, and a null lastProcessedAt produced a payout
  // calculated from the epoch.
  const broken = await Staking.find({
    status: 'active',
    $or: [{ completesAt: null }, { lastProcessedAt: null }],
  });

  if (APPLY) {
    for (const s of broken) {
      const startedAt = s.startedAt || s.createdAt || new Date();
      // eslint-disable-next-line no-await-in-loop
      await Staking.updateOne({ _id: s._id }, {
        $set: {
          startedAt,
          lastProcessedAt: s.lastProcessedAt || startedAt,
          completesAt: s.completesAt
            || new Date(startedAt.getTime() + s.durationHours * 60 * 60 * 1000),
        },
      });
    }
  }
  return `${broken.length} stake(s)`;
});

step('Release stakes stuck in "completing"', async () => {
  const filter = { status: 'completing', paidOutAt: null };
  const count = await Staking.countDocuments(filter);
  if (APPLY && count) await Staking.updateMany(filter, { $set: { status: 'active' } });
  return `${count} stake(s)`;
});

step('Round balances to whole cents', async () => {
  // Float drift from the per-minute accrual loop.
  const users = await User.find({}).select('balance');
  const drifted = users.filter((u) => round2(u.balance) !== u.balance);
  if (APPLY) {
    for (const u of drifted) {
      // eslint-disable-next-line no-await-in-loop
      await User.updateOne({ _id: u._id }, { $set: { balance: round2(u.balance) } });
    }
  }
  return `${drifted.length} balance(s) with sub-cent drift`;
});

step('Flag negative balances', async () => {
  // Should be impossible now that debits are atomic and conditional. If any
  // exist, they predate the fix and need looking at by hand — the migration
  // deliberately does not "correct" them.
  const negative = await User.find({ balance: { $lt: 0 } }).select('username email balance');
  for (const u of negative) {
    console.warn(`  !! NEGATIVE BALANCE: ${u.username} (${u.email}) = ${u.balance}`);
  }
  return `${negative.length} negative balance(s)`;
});

step('Report transfers missing their incoming ledger row', async () => {
  // Transfers used to write only the sender's row, so recipients have money
  // with no matching history entry. Reported, not invented — reconstructing
  // them would require guessing the recipient.
  const outgoing = await Transaction.countDocuments({ type: 'transfer' });
  const incoming = await Transaction.countDocuments({ type: 'transfer_in' });
  return `${outgoing} outgoing vs ${incoming} incoming (difference predates the fix)`;
});

step('Build indexes', async () => {
  if (APPLY) {
    await Promise.all([
      User.syncIndexes(),
      Staking.syncIndexes(),
      Transaction.syncIndexes(),
    ]);
  }
  return 'user, staking, transaction';
});

step('Migrate monetary fields to Decimal128', async () => {
  if (APPLY) {
    await User.updateMany({}, [
      { $set: { 
          balance: { $toDecimal: { $ifNull: ["$balance", 0] } },
          totalDeposit: { $toDecimal: { $ifNull: ["$totalDeposit", 0] } },
          dailyWithdrawalLimit: { $toDecimal: { $ifNull: ["$dailyWithdrawalLimit", 1000] } },
          referralRewards: { $toDecimal: { $ifNull: ["$referralRewards", 0] } }
      } }
    ], { updatePipeline: true });
    await Transaction.updateMany({}, [
      { $set: { amount: { $toDecimal: "$amount" } } }
    ], { updatePipeline: true });
    await Staking.updateMany({}, [
      { $set: { 
          amount: { $toDecimal: "$amount" },
          principal: { $cond: { if: { $eq: ["$principal", null] }, then: null, else: { $toDecimal: "$principal" } } },
          accruedRewards: { $toDecimal: { $ifNull: ["$accruedRewards", 0] } },
          payoutAmount: { $cond: { if: { $eq: ["$payoutAmount", null] }, then: null, else: { $toDecimal: "$payoutAmount" } } }
      } }
    ], { updatePipeline: true });
    const StakingPlan = require('../models/StakingPlan');
    await StakingPlan.updateMany({}, [
      { $set: { min: { $toDecimal: "$min" }, max: { $toDecimal: "$max" } } }
    ], { updatePipeline: true });
  }
  return 'User, Transaction, Staking, StakingPlan fields converted';
});

// ---------------------------------------------------------------------------

const run = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
  console.log(APPLY ? '\nMODE: APPLY — writing changes\n' : '\nMODE: DRY RUN — nothing will be written\n');

  for (const { name, fn } of steps) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await fn();
      console.log(`  ${APPLY ? '✓' : '·'} ${name}: ${result}`);
    } catch (error) {
      console.error(`  ✗ ${name}: ${error.message}`);
    }
  }

  console.log(APPLY ? '\nMigration complete.' : '\nDry run complete. Re-run with --apply to write.');
  await mongoose.connection.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
