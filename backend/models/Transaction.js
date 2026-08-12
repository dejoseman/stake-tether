const mongoose = require('mongoose');
const crypto = require('crypto');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true,
  },
  type: {
    type: String,
    // 'transfer' is the sender's outgoing row; 'transfer_in' is the
    // recipient's incoming row. Both are written for every transfer so each
    // side has a complete history.
    enum: ['deposit', 'withdrawal', 'transfer', 'transfer_in'],
    required: true,
  },
  amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    min: 0,
    get: (v) => (v !== null && typeof v !== 'undefined' ? parseFloat(v.toString()) : v),
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
    index: true,
  },
  address: {
    type: String,
  },
  network: {
    type: String,
  },
  // Username on the other side of a transfer.
  counterparty: {
    type: String,
  },
  referenceId: {
    type: String,
    unique: true,
    // Was Math.random().toString(36).substring(2, 15): variable length
    // (trailing zeros get dropped), not uniformly distributed, and a collision
    // on this unique index surfaced to the user as a 500.
    default: () => crypto.randomBytes(12).toString('hex'),
  },
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true },
});

// Backs the transaction history list and the daily-withdrawal-limit aggregate.
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ user: 1, type: 1, status: 1, createdAt: -1 });
// Backs the admin transaction feed.
transactionSchema.index({ createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
