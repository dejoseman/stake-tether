const Transaction = require('../models/Transaction');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

const ADMIN_EMAIL = 'tethered.supportdesk@gmail.com';

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
      // Notify user
      sendEmail({
        email: user.email,
        subject: 'Deposit Request Received — Tether Staking',
        message: `Hi ${user.username},\n\nWe have received your deposit request for $${amount} via ${network}.\n\nPlease complete the transfer to the deposit address shown on your dashboard. Your balance will be updated once the admin verifies your transaction on-chain.\n\nIf you did not initiate this request, please contact our support team immediately.`
      });

      // Notify admin
      sendEmail({
        email: ADMIN_EMAIL,
        subject: `New Deposit Request — $${amount} from ${user.username}`,
        message: `A new deposit request has been initiated.\n\n<strong>User:</strong> ${user.username}\n<strong>Email:</strong> ${user.email}\n<strong>Country:</strong> ${user.country || 'Not set'}\n<strong>Wallet ID:</strong> ${user.tetherWalletId || 'Not set'}\n<strong>Amount:</strong> $${amount}\n<strong>Network:</strong> ${network}\n<strong>Status:</strong> Pending\n\nPlease review this deposit in the Admin Panel.`
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
  const { amount, address, network } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ msg: 'Please provide a valid amount' });
  }
  if (!address || !network) {
    return res.status(400).json({ msg: 'Please provide destination address and network' });
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
      network,
      address,
      status: 'pending',
    });

    user.balance -= amount;
    await user.save();

    // Notify user
    sendEmail({
      email: user.email,
      subject: 'Withdrawal Request Received — Tether Staking',
      message: `Hi ${user.username},\n\nWe have received your withdrawal request for $${amount} to ${network} address: ${address}.\n\nYour request is currently pending admin approval. You will receive another email once it has been processed.\n\nIf you did not initiate this request, please contact our support team immediately.`
    });

    // Notify admin
    sendEmail({
      email: ADMIN_EMAIL,
      subject: `New Withdrawal Request — $${amount} from ${user.username}`,
      message: `A new withdrawal request has been submitted.\n\n<strong>User:</strong> ${user.username}\n<strong>Email:</strong> ${user.email}\n<strong>Country:</strong> ${user.country || 'Not set'}\n<strong>Amount:</strong> $${amount}\n<strong>Network:</strong> ${network}\n<strong>Destination Address:</strong> ${address}\n<strong>Status:</strong> Pending\n\nPlease review and approve/reject this withdrawal in the Admin Panel.`
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
