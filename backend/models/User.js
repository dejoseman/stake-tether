const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const getDecimal = (v) => (v !== null && typeof v !== 'undefined' ? parseFloat(v.toString()) : v);

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
    // Never load the hash unless a query explicitly asks for it.
    select: false,
  },
  country: {
    type: String,
    required: false,
    trim: true,
  },
  tetherWalletId: {
    type: String,
    required: false,
    trim: true,
  },
  balance: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0.00,
    min: 0,
    get: getDecimal,
  },
  totalDeposit: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0.00,
    get: getDecimal,
  },
  kycStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified', 'rejected'],
    default: 'unverified',
  },
  kycDocument: {
    type: String, // Stored filename only. Served exclusively via the admin route.
  },
  kycDocumentMime: {
    type: String, // Detected from the file's magic bytes, not the client's claim.
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
    type: mongoose.Schema.Types.Decimal128,
    default: 1000,
    get: getDecimal,
  },
  adminPin: {
    type: String,
    select: false,
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
    type: mongoose.Schema.Types.Decimal128,
    default: 0.00,
    get: getDecimal,
  },

  // --- Brute-force protection -------------------------------------------
  failedLoginAttempts: {
    type: Number,
    default: 0,
    select: false,
  },
  lockUntil: {
    type: Date,
    select: false,
  },

  // --- Session revocation -----------------------------------------------
  // Bumped on password reset. Tokens carry this value; the auth middleware
  // rejects any token whose version is stale, so a reset invalidates every
  // existing session immediately.
  tokenVersion: {
    type: Number,
    default: 0,
  },

  // --- Password reset ---------------------------------------------------
  // Only the SHA-256 hash of the reset token is stored, so a database leak
  // does not hand out working reset links.
  resetPasswordToken: {
    type: String,
    select: false,
  },
  resetPasswordExpires: {
    type: Date,
    select: false,
  },
}, {
  timestamps: true,
});

/**
 * Defence in depth against credential leaks.
 *
 * Several routes returned the raw Mongoose document (`res.json({ user })`),
 * which serialised the bcrypt password and admin PIN hashes straight to the
 * client. `select: false` above stops them being loaded; this transform makes
 * sure they can never be serialised even if a query explicitly selects them.
 */
const stripSensitive = (doc, ret) => {
  delete ret.password;
  delete ret.adminPin;
  delete ret.resetPasswordToken;
  delete ret.resetPasswordExpires;
  delete ret.failedLoginAttempts;
  delete ret.lockUntil;
  delete ret.__v;
  return ret;
};

userSchema.set('toJSON', { transform: stripSensitive, getters: true });
userSchema.set('toObject', { transform: stripSensitive, getters: true });

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method. Requires the document to have been loaded with
// .select('+password').
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) {
    throw new Error('matchPassword called on a document loaded without +password');
  }
  return bcrypt.compare(enteredPassword, this.password);
};

/**
 * Is this account temporarily locked out after repeated failed logins?
 */
userSchema.methods.isTemporarilyLocked = function () {
  return Boolean(this.lockUntil && this.lockUntil > Date.now());
};

/**
 * Generate a password reset token. Returns the plaintext token (emailed to the
 * user); only its hash is persisted.
 */
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
