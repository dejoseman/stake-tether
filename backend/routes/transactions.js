const express = require('express');
const router = express.Router();

const {
  getTransactions,
  createDeposit,
  createWithdrawal,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { parseAmount, formatAmount } = require('../utils/money');
const { debit, credit } = require('../utils/balance');

router.route('/').get(protect, getTransactions);
router.post('/deposit', protect, createDeposit);
router.post('/withdraw', protect, createWithdrawal);

// @desc    Transfer funds to another user
// @route   POST /api/transactions/transfer
// @access  Private
router.post('/transfer', protect, async (req, res) => {
  /*
   * This endpoint previously used `amount` straight from the JSON body:
   *
   *     sender.balance   -= amount;   // 100 - "1"  = 99   (numeric coercion)
   *     receiver.balance += amount;   //  50 + "1"  = "501" (string concat!)
   *
   * Because `+` concatenates when either operand is a string, posting
   * {"amount": "1"} turned a recipient's $50 balance into $501 while only
   * debiting the sender $1. Repeatable and unbounded — a money printer.
   *
   * parseAmount() now rejects anything that isn't a finite positive number and
   * returns a real Number, and the balance mutations go through atomic $inc
   * operations rather than read-modify-write.
   */
  const amount = parseAmount(req.body.amount);
  if (amount === null) {
    return res.status(400).json({ msg: 'Please provide a valid amount' });
  }

  const recipient = typeof req.body.recipient === 'string' ? req.body.recipient.trim() : '';
  if (!recipient) {
    return res.status(400).json({ msg: 'Please provide a valid recipient' });
  }

  const receiver = await User.findOne({ username: recipient });
  if (!receiver) {
    return res.status(404).json({ msg: 'Recipient not found' });
  }

  if (receiver._id.equals(req.user._id)) {
    return res.status(400).json({ msg: 'You cannot transfer to yourself' });
  }

  if (receiver.isLocked) {
    return res.status(400).json({ msg: 'That account cannot receive transfers at this time' });
  }

  // Atomic conditional debit — fails cleanly if funds are insufficient or if a
  // concurrent request got there first.
  const debited = await debit(req.user._id, amount);
  if (!debited) {
    return res.status(400).json({ msg: 'Insufficient balance' });
  }

  /*
   * From here the sender's money is already gone, so every failure path must
   * put it back. A MongoDB multi-document transaction would be cleaner, but it
   * requires a replica set — this compensating approach works on standalone
   * deployments too, and the debit itself is the only step that can race.
   */
  try {
    const credited = await credit(receiver._id, amount);
    if (!credited) {
      throw new Error('Recipient disappeared mid-transfer');
    }

    // Two ledger rows: the sender's outgoing and the recipient's incoming.
    // Previously only the sender's was written, so money appeared in the
    // recipient's balance with nothing in their transaction history.
    await Transaction.create([
      {
        user: req.user._id,
        type: 'transfer',
        amount,
        status: 'completed',
        counterparty: receiver.username,
      },
      {
        user: receiver._id,
        type: 'transfer_in',
        amount,
        status: 'completed',
        counterparty: req.user.username,
      },
    ]);
  } catch (error) {
    await credit(req.user._id, amount);
    console.error('Transfer failed, sender refunded', {
      sender: req.user._id.toString(),
      recipient: receiver._id.toString(),
      amount,
      error: error.message,
    });
    return res.status(500).json({ msg: 'Transfer failed. Your balance has not been changed.' });
  }

  return res.json({
    msg: `Successfully transferred ${formatAmount(amount)} USDt to ${receiver.username}`,
    newBalance: debited.balance,
  });
});

module.exports = router;
