const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Staking = require('../models/Staking');

const STAKING_PLANS = {
  Basic: { min: 100, max: 499, durationHours: 24, returnPercent: 10 },
  Silver: { min: 500, max: 4999, durationHours: 48, returnPercent: 20 },
  Gold: { min: 5000, max: 9999, durationHours: 72, returnPercent: 35 },
  Premium: { min: 10000, max: 9999999, durationHours: 120, returnPercent: 50 },
};

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

    const plan = STAKING_PLANS[planName];
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
      completesAt,
      status: 'active',
    });

    res.status(201).json({ msg: 'Stake purchased successfully', stake });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
