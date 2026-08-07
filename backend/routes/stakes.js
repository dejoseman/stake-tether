const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Staking = require('../models/Staking');

const StakingPlan = require('../models/StakingPlan');

// @desc    Get all active staking plans
// @route   GET /api/stakes/plans
// @access  Public
router.get('/plans', async (req, res) => {
  try {
    const plans = await StakingPlan.find({ isActive: true }).sort({ min: 1 });
    res.json(plans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @desc    Get logged-in user's stakes
// @route   GET /api/stakes/my-stakes
// @access  Private
router.get('/my-stakes', protect, async (req, res) => {
  try {
    const stakes = await Staking.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(stakes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @desc    Purchase a new stake
// @route   POST /api/stakes/purchase
// @access  Private
router.post('/purchase', protect, async (req, res) => {
  const { planName, amount } = req.body;

  try {
    // Validate inputs
    if (!planName || !amount || amount <= 0) {
      return res.status(400).json({ msg: 'Invalid plan or amount' });
    }

    const plan = await StakingPlan.findOne({ name: planName, isActive: true });
    if (!plan) {
      return res.status(400).json({ msg: 'Invalid staking plan selected' });
    }

    if (amount < plan.min || amount > plan.max) {
      return res.status(400).json({ msg: `Amount must be between $${plan.min} and $${plan.max} for the ${planName} plan.` });
    }

    // Check user balance
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (user.balance < amount) {
      return res.status(400).json({ msg: 'Insufficient balance to purchase this stake' });
    }

    // Deduct balance
    user.balance -= amount;
    await user.save();

    // Calculate completion time
    const completesAt = new Date();
    completesAt.setHours(completesAt.getHours() + plan.durationHours);

    // Create stake
    const stake = await Staking.create({
      user: req.user._id,
      planName,
      amount,
      returnPercent: plan.returnPercent,
      durationHours: plan.durationHours,
      autoCompound: req.body.autoCompound || false,
      status: 'pending',
    });

    res.status(201).json({ msg: 'Stake purchased successfully', stake });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @desc    Cash out a matured stake
// @route   POST /api/stakes/:id/cashout
// @access  Private
router.post('/:id/cashout', protect, async (req, res) => {
  try {
    const stake = await Staking.findOne({ _id: req.params.id, user: req.user._id });
    if (!stake) {
      return res.status(404).json({ msg: 'Stake not found' });
    }

    if (stake.status !== 'matured') {
      return res.status(400).json({ msg: 'Stake is not ready to be cashed out' });
    }

    const payoutAmount = stake.amount + stake.accruedRewards;
    
    // Credit user
    const user = await User.findById(req.user._id);
    user.balance += payoutAmount;
    await user.save();

    // Mark stake as completed
    stake.status = 'completed';
    await stake.save();

    res.json({ msg: 'Stake cashed out successfully', payoutAmount, newBalance: user.balance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
