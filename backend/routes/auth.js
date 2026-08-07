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
    check('tetherWalletId', 'USDT Wallet Address is required').not().isEmpty().isLength({ min: 20 }),
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

router.put(
  '/update-wallet',
  protect,
  [
    check('tetherWalletId', 'USDT Wallet Address is required').not().isEmpty().isLength({ min: 20 }),
  ],
  async (req, res) => {
    const { validationResult } = require('express-validator');
    const User = require('../models/User');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ msg: 'User not found' });
      
      user.tetherWalletId = req.body.tetherWalletId;
      await user.save();
      
      res.json({ msg: 'Wallet address updated successfully', tetherWalletId: user.tetherWalletId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ msg: 'Server Error' });
    }
  }
);

module.exports = router;
