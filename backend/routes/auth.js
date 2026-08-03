const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { registerUser, loginUser, getUserProfile, getReferralStats } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post(
  '/register',
  [
    check('username', 'Username is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('country', 'Country is required').not().isEmpty(),
    check('tetherWalletId', 'Tether Wallet ID is required').not().isEmpty().isLength({ min: 20 }),
  ],
  registerUser
);

router.post(
  '/login',
  [
    check('email', 'Please include a valid email or username').not().isEmpty(),
    check('password', 'Password is required').exists(),
  ],
  loginUser
);

router.get('/profile', protect, getUserProfile);
router.get('/referrals', protect, getReferralStats);

module.exports = router;
