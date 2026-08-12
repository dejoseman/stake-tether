const express = require('express');
const rateLimit = require('express-rate-limit');
const { check } = require('express-validator');

const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  getReferralStats,
  forgotPassword,
  resetPassword,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * Credential endpoints get their own tight budget.
 *
 * The global /api limiter is 300 requests per 15 minutes, which is far too
 * generous for password guessing. `skipSuccessfulRequests` means a legitimate
 * user who logs in correctly never burns through this.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many attempts from this IP. Please try again in 15 minutes.' },
});

// Password reset emails are an outbound-spam vector, so throttle harder.
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many password reset requests. Please try again later.' },
});

const passwordRules = (field = 'password') => check(
  field,
  'Password must be at least 8 characters and contain a letter and a number'
)
  .isLength({ min: 8 })
  .matches(/[A-Za-z]/)
  .matches(/[0-9]/);

router.post(
  '/register',
  authLimiter,
  [
    check('username', 'Username is required')
      .trim().notEmpty()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_.-]+$/)
      .withMessage('Username may only contain letters, numbers, and _ . -'),
    check('email', 'Please include a valid email').isEmail().normalizeEmail(),
    passwordRules(),
    check('country', 'Country is required').trim().notEmpty(),
    check('tetherWalletId', 'USDT Wallet Address is required')
      .trim().notEmpty().isLength({ min: 20, max: 120 }),
  ],
  registerUser
);

router.post(
  '/login',
  authLimiter,
  [
    check('email', 'Please include a valid email or username').trim().notEmpty(),
    check('password', 'Password is required').exists(),
  ],
  loginUser
);

router.post(
  '/forgot-password',
  resetLimiter,
  [check('email', 'Please include a valid email').isEmail().normalizeEmail()],
  forgotPassword
);

router.post(
  '/reset-password/:token',
  resetLimiter,
  [passwordRules()],
  resetPassword
);

router.put(
  '/change-password',
  protect,
  authLimiter,
  [
    check('currentPassword', 'Current password is required').exists(),
    passwordRules('newPassword'),
  ],
  changePassword
);

router.get('/profile', protect, getUserProfile);
router.get('/referrals', protect, getReferralStats);

router.put(
  '/update-wallet',
  protect,
  [
    check('tetherWalletId', 'USDT Wallet Address is required')
      .trim().notEmpty().isLength({ min: 20, max: 120 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.tetherWalletId = req.body.tetherWalletId;
    await user.save();

    return res.json({
      msg: 'Wallet address updated successfully',
      tetherWalletId: user.tetherWalletId,
    });
  }
);

module.exports = router;
