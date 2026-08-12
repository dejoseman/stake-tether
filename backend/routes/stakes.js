const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const Staking = require('../models/Staking');
const StakingPlan = require('../models/StakingPlan');
const { parseAmount } = require('../utils/money');
const { debit, credit } = require('../utils/balance');

// @desc    Get all active staking plans
// @route   GET /api/stakes/plans
// @access  Public
router.get('/plans', async (req, res) => {
  const plans = await StakingPlan.find({ isActive: true }).sort({ min: 1 });
  return res.json(plans);
});

// @desc    Get logged-in user's stakes
// @route   GET /api/stakes/my-stakes
// @access  Private
router.get('/my-stakes', protect, async (req, res) => {
  const stakes = await Staking.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(200);
  return res.json(stakes);
});

// @desc    Purchase a new stake
// @route   POST /api/stakes/purchase
// @access  Private
router.post('/purchase', protect, async (req, res) => {
  const amount = parseAmount(req.body.amount);
  if (amount === null) {
    return res.status(400).json({ msg: 'Invalid amount' });
  }

  const planName = typeof req.body.planName === 'string' ? req.body.planName.trim() : '';
  if (!planName) {
    return res.status(400).json({ msg: 'Invalid plan' });
  }

  const plan = await StakingPlan.findOne({ name: planName, isActive: true });
  if (!plan) {
    return res.status(400).json({ msg: 'Invalid staking plan selected' });
  }

  if (amount < plan.min || amount > plan.max) {
    return res.status(400).json({
      msg: `Amount must be between $${plan.min} and $${plan.max} for the ${planName} plan.`,
    });
  }

  // Atomic conditional debit rather than read-check-write.
  const debited = await debit(req.user._id, amount);
  if (!debited) {
    return res.status(400).json({ msg: 'Insufficient balance to purchase this stake' });
  }

  let stake;
  try {
    // Terms are copied from the plan at purchase time, so a later admin edit to
    // the plan cannot retroactively change an existing contract.
    stake = await Staking.create({
      user: req.user._id,
      planName: plan.name,
      amount,
      principal: amount,
      returnPercent: plan.returnPercent,
      durationHours: plan.durationHours,
      autoCompound: req.body.autoCompound === true,
      status: 'pending',
    });
  } catch (error) {
    // Refund rather than silently pocketing the debit.
    await credit(req.user._id, amount);
    throw error;
  }

  return res.status(201).json({ msg: 'Stake purchased successfully', stake });
});

/*
 * The former POST /:id/cashout route has been removed.
 *
 * It required `status === 'matured'`, but nothing in the codebase ever wrote
 * that status — the cron sets 'completed' and credits the balance directly.
 * The route was unreachable dead code, and leaving two competing payout paths
 * around a balance is exactly how double-credits happen. Payout is now solely
 * the cron's responsibility (see backend/cron/stakingProcessor.js), which
 * claims each stake atomically before crediting.
 */

module.exports = router;
