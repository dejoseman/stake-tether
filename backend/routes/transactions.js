const express = require('express');
const router = express.Router();
const { getTransactions, createDeposit, createWithdrawal } = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

router.route('/').get(protect, getTransactions);
router.post('/deposit', protect, createDeposit);
router.post('/withdraw', protect, createWithdrawal);

// @desc    Transfer funds to another user
// @route   POST /api/transactions/transfer
// @access  Private
router.post('/transfer', protect, async (req, res) => {
  const { recipient, amount } = req.body;

  if (!recipient || !amount || amount <= 0) {
    return res.status(400).json({ msg: 'Please provide a valid recipient and amount' });
  }

  try {
    const sender = await User.findById(req.user._id);
    const receiver = await User.findOne({ username: recipient });

    if (!receiver) {
      return res.status(404).json({ msg: 'Recipient not found' });
    }

    if (receiver._id.toString() === sender._id.toString()) {
      return res.status(400).json({ msg: 'You cannot transfer to yourself' });
    }

    if (sender.balance < amount) {
      return res.status(400).json({ msg: 'Insufficient balance' });
    }

    sender.balance -= amount;
    receiver.balance += amount;

    await sender.save();
    await receiver.save();

    await Transaction.create({
      user: sender._id,
      type: 'transfer',
      amount,
      status: 'completed',
    });

    res.json({ msg: `Successfully transferred ${amount} USDt to ${recipient}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
