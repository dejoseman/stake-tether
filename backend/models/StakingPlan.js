const mongoose = require('mongoose');

const stakingPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  min: {
    type: Number,
    required: true,
  },
  max: {
    type: Number,
    required: true,
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
});

const StakingPlan = mongoose.model('StakingPlan', stakingPlanSchema);

module.exports = StakingPlan;
