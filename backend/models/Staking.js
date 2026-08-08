const mongoose = require('mongoose');

const stakingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  planName: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  returnPercent: {
    type: Number,
    required: true,
  },
  durationHours: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled', 'matured', 'failed'],
    default: 'pending',
  },
  accruedRewards: {
    type: Number,
    default: 0,
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
}, {
  timestamps: true,
});

const Staking = mongoose.model('Staking', stakingSchema);

module.exports = Staking;
