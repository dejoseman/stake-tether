const mongoose = require('mongoose');

const getDecimal = (v) => (v !== null && typeof v !== 'undefined' ? parseFloat(v.toString()) : v);

const stakingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true,
  },
  planName: {
    type: String,
    required: true,
  },
  // Current principal. Grows over time when autoCompound is on.
  amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    min: 0,
    get: getDecimal,
  },
  // The original stake, never mutated. Without this there was no way to tell
  // how much a user actually committed once compounding had inflated `amount`.
  principal: {
    type: mongoose.Schema.Types.Decimal128,
    min: 0,
    get: getDecimal,
  },
  returnPercent: {
    type: Number,
    required: true,
  },
  durationHours: {
    type: Number,
    required: true,
    min: 1,
  },
  status: {
    type: String,
    /*
     * State machine:
     *   pending    -> active     (admin approves)
     *   pending    -> failed     (admin rejects, principal refunded)
     *   active     -> completing (cron claims it for payout — transient)
     *   completing -> completed  (payout credited)
     *
     * 'matured' and 'cancelled' were in the enum but never written. 'matured'
     * in particular was required by a cash-out route that could therefore
     * never run. Removed rather than left as a trap.
     */
    enum: ['pending', 'active', 'completing', 'completed', 'failed'],
    default: 'pending',
    index: true,
  },
  accruedRewards: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: 0,
    get: getDecimal,
  },
  autoCompound: {
    type: Boolean,
    default: false,
  },
  lastProcessedAt: {
    type: Date,
    default: null,
  },
  startedAt: {
    type: Date,
    default: null,
  },
  completesAt: {
    type: Date,
    default: null,
  },
  // Set once, when the balance credit succeeds. Doubles as an idempotency
  // marker: a stake with this set has already been paid.
  paidOutAt: {
    type: Date,
    default: null,
  },
  payoutAmount: {
    type: mongoose.Schema.Types.Decimal128,
    default: null,
    get: getDecimal,
  },
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true },
});

// Drives the cron's per-minute sweep.
stakingSchema.index({ status: 1, completesAt: 1 });
stakingSchema.index({ user: 1, createdAt: -1 });

const Staking = mongoose.model('Staking', stakingSchema);

module.exports = Staking;
