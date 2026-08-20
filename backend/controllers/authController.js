const { validationResult } = require('express-validator');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { sendAdminAlert } = require('../utils/sendEmail');

// Lock an account for 15 minutes after this many consecutive failures.
const MAX_FAILED_ATTEMPTS = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

/**
 * Mint a JWT.
 *
 * The `tv` (token version) claim lets us revoke every outstanding session for
 * a user by incrementing User.tokenVersion — used on password reset.
 *
 * No `|| 'supersecretjwtkey123'` fallback: validateEnv() guarantees the secret
 * exists, and a fallback that ships in source control is a master key.
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, tv: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, referralCode, country, tetherWalletId } = req.body;

  const userExists = await User.findOne({
    $or: [{ email: String(email).toLowerCase() }, { username }],
  });

  if (userExists) {
    return res.status(400).json({ msg: 'User already exists' });
  }

  // Retry on the (unlikely) chance of a referral code collision rather than
  // surfacing a duplicate-key 500 to the user.
  let newReferralCode;
  for (let i = 0; i < 5; i += 1) {
    const candidate = crypto.randomBytes(4).toString('hex').toUpperCase();
    // eslint-disable-next-line no-await-in-loop
    if (!(await User.exists({ referralCode: candidate }))) {
      newReferralCode = candidate;
      break;
    }
  }
  if (!newReferralCode) {
    return res.status(500).json({ msg: 'Could not allocate a referral code, please try again' });
  }

  let referredBy;
  if (referralCode) {
    const parentUser = await User.findOne({ referralCode: String(referralCode).toUpperCase() });
    if (parentUser) {
      referredBy = parentUser._id;
    }
  }

  const user = await User.create({
    username,
    email,
    password,
    country,
    tetherWalletId,
    referralCode: newReferralCode,
    referredBy,
  });

  // Fire-and-forget; sendEmail swallows its own errors so a mail outage cannot
  // fail a registration that has already been committed.
  sendEmail({
    email: user.email,
    subject: 'Welcome to GeneratingPro!',
    message: `Hi ${user.username},\n\nWelcome to GeneratingPro! Your account has been successfully created.\n\nYou can now log in and start staking your USDt for guaranteed daily returns.\n\nBest regards,\nThe GeneratingPro Team`,
  });

  sendEmail({
    email: process.env.ADMIN_EMAIL || 'support@generatingpro.com',
    subject: `New User Signup: ${user.username}`,
    message: `A new user has registered on GeneratingPro.\n\n<strong>Username:</strong> ${user.username}\n<strong>Email:</strong> ${user.email}\n<strong>Country:</strong> ${user.country || 'Not provided'}\n<strong>Wallet ID:</strong> ${user.tetherWalletId || 'Not provided'}\n\nPlease review their account in the Admin Panel.`,
  });

  return res.status(201).json({
    _id: user._id,
    username: user.username,
    email: user.email,
    token: generateToken(user),
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  // The password and lockout fields are select:false, so ask for them.
  const user = await User.findOne({
    $or: [{ email: String(email).toLowerCase() }, { username: email }],
  }).select('+password +failedLoginAttempts +lockUntil');

  // Uniform response for "no such user" and "wrong password" so the endpoint
  // cannot be used to enumerate registered accounts.
  const invalid = () => res.status(401).json({ msg: 'Invalid email or password' });

  if (!user) return invalid();

  if (user.isTemporarilyLocked()) {
    const minutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
    return res.status(429).json({
      msg: `Too many failed login attempts. Try again in ${minutes} minute(s).`,
    });
  }

  const matches = await user.matchPassword(password);

  if (!matches) {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const update = { failedLoginAttempts: attempts };

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      update.lockUntil = new Date(Date.now() + LOCKOUT_MS);
      update.failedLoginAttempts = 0;
      // A burst of failures against one account is worth knowing about.
      sendAdminAlert(
        `Account temporarily locked: ${user.username}`,
        `${MAX_FAILED_ATTEMPTS} consecutive failed login attempts for <strong>${user.username}</strong> (${user.email}).\n\n<strong>IP:</strong> ${req.ip}\n<strong>Time:</strong> ${new Date().toISOString()}\n\nThe account is locked for 15 minutes.`
      );
    }

    await User.updateOne({ _id: user._id }, { $set: update });
    return invalid();
  }

  if (user.isLocked) {
    return res.status(403).json({ msg: 'Your account has been locked. Please contact support.' });
  }

  // Successful login clears the failure counter.
  if (user.failedLoginAttempts || user.lockUntil) {
    await User.updateOne(
      { _id: user._id },
      { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } }
    );
  }

  // NOTE: the original emailed the admin on every single successful login.
  // At any real volume that is self-inflicted spam and damages sender
  // reputation, so routine logins are no longer alerted on — only lockouts
  // (above) and admin logins (below), which are genuinely worth knowing about.
  if (user.role === 'admin') {
    sendAdminAlert(
      `Admin login: ${user.username}`,
      `An administrator account signed in.\n\n<strong>Username:</strong> ${user.username}\n<strong>Email:</strong> ${user.email}\n<strong>IP Address:</strong> ${req.ip}\n<strong>Time:</strong> ${new Date().toISOString()}`
    );
  }

  return res.json({
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    token: generateToken(user),
  });
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  // protect() already loaded and validated the user.
  const user = req.user;

  return res.json({
    _id: user._id,
    username: user.username,
    email: user.email,
    balance: user.balance,
    country: user.country,
    tetherWalletId: user.tetherWalletId,
    kycStatus: user.kycStatus,
    kycFullName: user.kycFullName,
    kycRejectionNote: user.kycRejectionNote,
    role: user.role,
    dailyWithdrawalLimit: user.dailyWithdrawalLimit,
    totalDeposit: user.totalDeposit || 0,
  });
};

// @desc    Get user referral stats
// @route   GET /api/auth/referrals
// @access  Private
const getReferralStats = async (req, res) => {
  const referredUsers = await User.countDocuments({ referredBy: req.user._id });

  return res.json({
    referralCode: req.user.referralCode,
    totalReferred: referredUsers,
    totalEarned: req.user.referralRewards,
  });
};

// @desc    Request a password reset link
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() });

  // Always return the same response whether or not the address is registered,
  // so this endpoint cannot be used to enumerate accounts.
  const genericResponse = () => res.json({
    msg: 'If an account exists for that email address, a reset link has been sent.',
  });

  if (!user) return genericResponse();

  const resetToken = user.createPasswordResetToken();
  await user.save();

  const baseUrl = process.env.APP_URL || 'https://generatingpro.com';
  const resetUrl = `${baseUrl}/reset-password/${resetToken}`;

  await sendEmail({
    email: user.email,
    subject: 'Reset your GeneratingPro password',
    message: `Hi ${user.username},\n\nWe received a request to reset your password. Click the link below to choose a new one. This link expires in 1 hour and can only be used once.\n\n<a href="${resetUrl}" style="color:#009393;">${resetUrl}</a>\n\nIf you did not request this, you can safely ignore this email — your password will not change.\n\nBest regards,\nThe GeneratingPro Team`,
  });

  return genericResponse();
};

// @desc    Complete a password reset
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Only the hash is stored, so hash the presented token to look it up.
  const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpires');

  if (!user) {
    return res.status(400).json({ msg: 'That reset link is invalid or has expired.' });
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  // Invalidate every session issued before this reset.
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  sendEmail({
    email: user.email,
    subject: 'Your GeneratingPro password was changed',
    message: `Hi ${user.username},\n\nYour password was just changed. You have been signed out on all devices.\n\nIf this wasn't you, contact our support team immediately.\n\nBest regards,\nThe GeneratingPro Team`,
  });

  return res.json({ msg: 'Password reset successfully. Please log in with your new password.' });
};

// @desc    Change password while logged in
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!user || !(await user.matchPassword(currentPassword))) {
    // 403, not 401: this is a re-auth failure inside an authenticated
    // session. A 401 would log the user out for a single typo.
    return res.status(403).json({ msg: 'Current password is incorrect' });
  }

  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  sendEmail({
    email: user.email,
    subject: 'Your GeneratingPro password was changed',
    message: `Hi ${user.username},\n\nYour password was just changed. You have been signed out on all devices.\n\nIf this wasn't you, contact our support team immediately.\n\nBest regards,\nThe GeneratingPro Team`,
  });

  // The caller's own token is now stale too — hand back a fresh one so they
  // are not bounced to the login screen mid-session.
  return res.json({
    msg: 'Password changed successfully',
    token: generateToken(user),
  });
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  getReferralStats,
  forgotPassword,
  resetPassword,
  changePassword,
};
