const mongoose = require('mongoose');

const getDecimal = (v) => (v !== null && typeof v !== 'undefined' ? parseFloat(v.toString()) : v);

const stakingPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  min: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    get: getDecimal,
  },
  max: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    get: getDecimal,
  },
  durationHours: {
    type: Number,
    required: true,
  },
  returnPercent: {
    type: Number,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true },
});

const StakingPlan = mongoose.model('StakingPlan', stakingPlanSchema);

module.exports = StakingPlan;
