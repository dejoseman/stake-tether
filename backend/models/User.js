const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
  tetherWalletId: {
    type: String,
    required: true,
    trim: true,
  },
  balance: {
    type: Number,
    default: 0.00,
  },
  kycStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified', 'rejected'],
    default: 'unverified',
  },
  kycDocument: {
    type: String, // Path to the uploaded document
  },
  kycFullName: {
    type: String,
    trim: true,
  },
  kycSubmittedAt: {
    type: Date,
  },
  kycRejectionNote: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
  dailyWithdrawalLimit: {
    type: Number,
    default: 1000,
  },
  adminPin: {
    type: String,
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  referralRewards: {
    type: Number,
    default: 0.00,
  },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
