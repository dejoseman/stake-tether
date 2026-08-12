const Transaction = require('../models/Transaction');
const sendEmail = require('../utils/sendEmail');
const { sendAdminAlert } = require('../utils/sendEmail');
const { parseAmount, formatAmount } = require('../utils/money');
const { debit, credit } = require('../utils/balance');

// @desc    Get user transactions
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

  const [transactions, total] = await Promise.all([
    Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Transaction.countDocuments({ user: req.user._id }),
  ]);

  // The client renders this array directly, so keep the response shape a plain
  // array and expose paging through headers.
  res.set('X-Total-Count', String(total));
  res.set('X-Page', String(page));
  return res.json(transactions);
};

// @desc    Create a deposit
// @route   POST /api/transactions/deposit
// @access  Private
const createDeposit = async (req, res) => {
  // parseAmount rejects strings that aren't numeric, NaN, Infinity, negatives
  // and non-primitives, and rounds to cents.
  const amount = parseAmount(req.body.amount);
  if (amount === null) {
    return res.status(400).json({ msg: 'Please provide a valid amount' });
  }

  const network = typeof req.body.network === 'string' ? req.body.network.trim() : '';
  if (!network) {
    return res.status(400).json({ msg: 'Please provide a valid network' });
  }

  const transaction = await Transaction.create({
    user: req.user._id,
    type: 'deposit',
    amount,
    network,
    status: 'pending',
  });

  const user = req.user;

  sendEmail({
    email: user.email,
    subject: 'Deposit Request Received — GeneratingPro',
    message: `Hi ${user.username},\n\nWe have received your deposit request for $${formatAmount(amount)} via ${network}.\n\nPlease complete the transfer to the deposit address shown on your dashboard. Your balance will be updated once the admin verifies your transaction on-chain.\n\nIf you did not initiate this request, please contact our support team immediately.`,
  });

  sendAdminAlert(
    `New Deposit Request — $${formatAmount(amount)} from ${user.username}`,
    `A new deposit request has been initiated.\n\n<strong>User:</strong> ${user.username}\n<strong>Email:</strong> ${user.email}\n<strong>Country:</strong> ${user.country || 'Not set'}\n<strong>Wallet ID:</strong> ${user.tetherWalletId || 'Not set'}\n<strong>Amount:</strong> $${formatAmount(amount)}\n<strong>Network:</strong> ${network}\n<strong>Status:</strong> Pending\n\nPlease review this deposit in the Admin Panel.`
  );

  return res.status(201).json(transaction);
};

// @desc    Create a withdrawal
// @route   POST /api/transactions/withdraw
// @access  Private
const createWithdrawal = async (req, res) => {
  const amount = parseAmount(req.body.amount);
  if (amount === null) {
    return res.status(400).json({ msg: 'Please provide a valid amount' });
  }

  const address = typeof req.body.address === 'string' ? req.body.address.trim() : '';
  const network = typeof req.body.network === 'string' ? req.body.network.trim() : '';

  if (!address || !network) {
    return res.status(400).json({ msg: 'Please provide destination address and network' });
  }
  if (address.length < 20 || address.length > 120) {
    return res.status(400).json({ msg: 'That destination address does not look valid' });
  }

  const user = req.user;

  // --- Daily limit ---------------------------------------------------------
  // Previously this summed *all* withdrawals since midnight regardless of
  // status, so a rejected-and-refunded withdrawal still consumed the user's
  // daily quota. Only pending and completed withdrawals should count.
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const [{ total = 0 } = {}] = await Transaction.aggregate([
    {
      $match: {
        user: user._id,
        type: 'withdrawal',
        status: { $in: ['pending', 'completed'] },
        createdAt: { $gte: since },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  if (total + amount > user.dailyWithdrawalLimit) {
    return res.status(400).json({
      msg: `Daily withdrawal limit of $${formatAmount(user.dailyWithdrawalLimit)} exceeded. You have already withdrawn $${formatAmount(total)} today.`,
    });
  }

  // --- Debit ---------------------------------------------------------------
  // Atomic conditional debit. The balance check and the decrement happen in a
  // single database operation, so two concurrent withdrawals cannot both pass
  // the check against the same starting balance.
  const debited = await debit(user._id, amount);
  if (!debited) {
    return res.status(400).json({ msg: 'Insufficient balance' });
  }

  let transaction;
  try {
    transaction = await Transaction.create({
      user: user._id,
      type: 'withdrawal',
      amount,
      network,
      address,
      status: 'pending',
    });
  } catch (error) {
    // The money left the balance but no record was written. Put it back
    // rather than leaving the user silently short.
    await credit(user._id, amount);
    throw error;
  }

  sendEmail({
    email: user.email,
    subject: 'Withdrawal Request Received — GeneratingPro',
    message: `Hi ${user.username},\n\nWe have received your withdrawal request for $${formatAmount(amount)} to ${network} address: ${address}.\n\nYour request is currently pending review. You'll be notified once it has been processed.\n\nIf you did not initiate this request, please contact our support team immediately.`,
  });

  sendAdminAlert(
    `New Withdrawal Request — $${formatAmount(amount)} from ${user.username}`,
    `A new withdrawal request has been submitted.\n\n<strong>User:</strong> ${user.username}\n<strong>Email:</strong> ${user.email}\n<strong>Country:</strong> ${user.country || 'Not set'}\n<strong>Amount:</strong> $${formatAmount(amount)}\n<strong>Network:</strong> ${network}\n<strong>Destination Address:</strong> ${address}\n<strong>Status:</strong> Pending\n\nPlease review and approve/reject this withdrawal in the Admin Panel.`
  );

  return res.status(201).json(transaction);
};

module.exports = {
  getTransactions,
  createDeposit,
  createWithdrawal,
};
