const { validationResult } = require('express-validator');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const sendEmail = require('../utils/sendEmail');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkey123', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, referralCode, country, tetherWalletId } = req.body;

  try {
    const userExists = await User.findOne({ $or: [{ email }, { username }] });

    if (userExists) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const newReferralCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    let referredBy = undefined;
    
    if (referralCode) {
      const parentUser = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (parentUser) {
        referredBy = parentUser._id;
      }
    }

    const user = await User.create({
      username,
      email,
      password,
      country,
      tetherWalletId,
      referralCode: newReferralCode,
      referredBy,
    });

    if (user) {
      // Send welcome email asynchronously
      sendEmail({
        email: user.email,
        subject: 'Welcome to GeneratingPro!',
        message: `Hi ${user.username},\n\nWelcome to GeneratingPro! Your account has been successfully created.\n\nYou can now log in and start staking your USDt for guaranteed daily returns.\n\nBest regards,\nThe GeneratingPro Team`
      });

      // Send admin notification
      sendEmail({
        email: 'generatingpro.support@gmail.com',
        subject: `New User Signup: ${user.username}`,
        message: `A new user has registered on GeneratingPro.\n\n<strong>Username:</strong> ${user.username}\n<strong>Email:</strong> ${user.email}\n<strong>Country:</strong> ${user.country || 'Not provided'}\n<strong>Wallet ID:</strong> ${user.tetherWalletId || 'Not provided'}\n\nPlease review their account in the Admin Panel.`
      });

      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ msg: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // allow login by email or username
    const user = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { username: email }]
    });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ msg: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      balance: user.balance,
      country: user.country,
      tetherWalletId: user.tetherWalletId,
      kycStatus: user.kycStatus,
      kycFullName: user.kycFullName,
      kycRejectionNote: user.kycRejectionNote,
      role: user.role,
      dailyWithdrawalLimit: user.dailyWithdrawalLimit,
    });
  } else {
    res.status(404).json({ msg: 'User not found' });
  }
};

// @desc    Get user referral stats
// @route   GET /api/auth/referrals
// @access  Private
const getReferralStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const referredUsers = await User.countDocuments({ referredBy: req.user._id });

    res.json({
      referralCode: user.referralCode,
      totalReferred: referredUsers,
      totalEarned: user.referralRewards,
    });
  } catch (error) {
    res.status(500).json({ msg: 'Server error fetching referrals' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  getReferralStats,
};
