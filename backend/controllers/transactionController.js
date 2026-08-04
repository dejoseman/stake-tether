const Transaction = require('../models/Transaction');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// @desc    Get user transactions
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// @desc    Create a deposit
// @route   POST /api/transactions/deposit
// @access  Private
const createDeposit = async (req, res) => {
  const { amount, network } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ msg: 'Please provide a valid amount' });
  }
  
  if (!network) {
    return res.status(400).json({ msg: 'Please provide a valid network' });
  }

  try {
    const transaction = await Transaction.create({
      user: req.user._id,
      type: 'deposit',
      amount,
      network,
      status: 'pending',
    });

    const user = await User.findById(req.user._id);
    if (user) {
      sendEmail({
        email: 'tethered.supportdesk@gmail.com',
        subject: 'New Deposit Request Initiated',
        message: `Hi Admin,\n\nUser ${user.username} (${user.email}) has initiated a new deposit request for $${amount} via ${network}.\n\nPlease review this in the Admin Panel once the user has completed the transfer.\n\nBest regards,\nThe Tether Staking System`
      });
    }

    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// @desc    Create a withdrawal
// @route   POST /api/transactions/withdraw
// @access  Private
const createWithdrawal = async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ msg: 'Please provide a valid amount' });
  }

  try {
    const user = await User.findById(req.user._id);

    if (user.balance < amount) {
      return res.status(400).json({ msg: 'Insufficient balance' });
    }

    // Check daily withdrawal limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysWithdrawals = await Transaction.find({
      user: req.user._id,
      type: 'withdrawal',
      createdAt: { $gte: today }
    });

    const totalWithdrawnToday = todaysWithdrawals.reduce((acc, curr) => acc + curr.amount, 0);

    if (totalWithdrawnToday + amount > user.dailyWithdrawalLimit) {
      return res.status(400).json({ 
        msg: `Daily withdrawal limit of $${user.dailyWithdrawalLimit} exceeded. You have already withdrawn $${totalWithdrawnToday} today.`
      });
    }

    const transaction = await Transaction.create({
      user: req.user._id,
      type: 'withdrawal',
      amount,
      status: 'pending',
    });

    user.balance -= amount;
    await user.save();

    sendEmail({
      email: user.email,
      subject: 'Withdrawal Request Received',
      message: `Hi ${user.username},\n\nWe have received your withdrawal request for $${amount} to ${network} address: ${address}.\n\nYour request is currently pending admin approval. You will receive another email once it has been processed.\n\nBest regards,\nThe Tether Staking Team`
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  getTransactions,
  createDeposit,
  createWithdrawal,
};
