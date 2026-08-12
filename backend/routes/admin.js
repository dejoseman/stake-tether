const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const { requireAdminPin } = require('../middleware/adminPin');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Staking = require('../models/Staking');
const StakingPlan = require('../models/StakingPlan');
const AdminAction = require('../models/AdminAction');
const sendEmail = require('../utils/sendEmail');
const { parseAmount, round2, formatAmount } = require('../utils/money');
const { credit } = require('../utils/balance');
const { resolveStoredFile } = require('../utils/kycStorage');

// Every route in this file is admin-only.
router.use(protect, admin);

/**
 * Pagination helper. The admin list endpoints previously did find({}) with a
 * populate and no limit — fine at 200 users, a timeout at 20,000.
 */
const paginate = (req, defaultLimit = 50) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', async (req, res) => {
  const { page, limit, skip } = paginate(req);

  const filter = {};
  if (req.query.search) {
    const term = String(req.query.search).trim().slice(0, 60);
    // Escape regex metacharacters so a search string can't become a pattern.
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { username: new RegExp(safe, 'i') },
      { email: new RegExp(safe, 'i') },
    ];
  }
  if (req.query.kycStatus) {
    filter.kycStatus = req.query.kycStatus;
  }

  const [users, total] = await Promise.all([
    // password and adminPin are select:false at the schema level and stripped
    // again by the toJSON transform, so neither can leak here.
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.set('X-Total-Count', String(total));
  return res.json(users);
});

// @desc    Get all transactions
// @route   GET /api/admin/transactions
// @access  Private/Admin
router.get('/transactions', async (req, res) => {
  const { page, limit, skip } = paginate(req);

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  res.set('X-Total-Count', String(total));
  return res.json(transactions);
});

// @desc    Get all stakes
// @route   GET /api/admin/stakes
// @access  Private/Admin
router.get('/stakes', async (req, res) => {
  const { page, limit, skip } = paginate(req);

  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [stakes, total] = await Promise.all([
    Staking.find(filter)
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Staking.countDocuments(filter),
  ]);

  res.set('X-Total-Count', String(total));
  return res.json(stakes);
});

// @desc    Read the admin audit trail
// @route   GET /api/admin/audit-log
// @access  Private/Admin
router.get('/audit-log', async (req, res) => {
  const { limit, skip } = paginate(req);
  const [entries, total] = await Promise.all([
    AdminAction.find({})
      .populate('targetUser', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AdminAction.countDocuments({}),
  ]);
  res.set('X-Total-Count', String(total));
  return res.json(entries);
});

// @desc    Set Admin Action PIN
// @route   POST /api/admin/pin
// @access  Private/Admin
router.post('/pin', async (req, res) => {
  const { pin, currentPassword } = req.body;

  if (!pin || String(pin).length < 6) {
    return res.status(400).json({ msg: 'PIN must be at least 6 characters' });
  }

  /*
   * Changing the PIN now requires the account password.
   *
   * Without this, a stolen admin session token was enough to set a fresh PIN
   * and then satisfy every requireAdminPin check with it — which made the PIN
   * no barrier at all against exactly the threat it exists to stop.
   */
  const adminUser = await User.findById(req.user._id).select('+password +adminPin');
  if (!currentPassword || !(await adminUser.matchPassword(currentPassword))) {
    return res.status(401).json({ msg: 'Your account password is required to change the admin PIN' });
  }

  const salt = await bcrypt.genSalt(12);
  adminUser.adminPin = await bcrypt.hash(String(pin), salt);
  await adminUser.save();

  await AdminAction.record(req, {
    action: 'admin_pin_changed',
    targetUser: req.user._id,
  });

  return res.json({ msg: 'Admin PIN set successfully' });
});

// ---------------------------------------------------------------------------
// KYC
// ---------------------------------------------------------------------------

// @desc    List KYC submissions
// @route   GET /api/admin/kyc
// @access  Private/Admin
router.get('/kyc', async (req, res) => {
  const { limit, skip } = paginate(req);
  const filter = { kycStatus: req.query.status || 'pending' };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('username email country kycStatus kycFullName kycSubmittedAt kycRejectionNote kycDocument kycDocumentMime')
      .sort({ kycSubmittedAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.set('X-Total-Count', String(total));
  return res.json(users.map((u) => ({
    _id: u._id,
    username: u.username,
    email: u.email,
    country: u.country,
    kycStatus: u.kycStatus,
    kycFullName: u.kycFullName,
    kycSubmittedAt: u.kycSubmittedAt,
    kycRejectionNote: u.kycRejectionNote,
    hasDocument: Boolean(u.kycDocument),
    documentMime: u.kycDocumentMime,
    // Path to fetch the file, not the file location on disk.
    documentUrl: u.kycDocument ? `/api/admin/kyc/${u._id}/document` : null,
  })));
});

/**
 * @desc    View a user's KYC document
 * @route   GET /api/admin/kyc/:userId/document
 * @access  Private/Admin ONLY
 *
 * This replaces the public `/uploads` static mount, which served every
 * identity document — passports, driving licences, proof of address — to
 * anyone who had or could guess the URL, with no authentication at all.
 *
 * Access is restricted to administrators. Users cannot retrieve their own
 * documents through this or any other route.
 *
 * The file is streamed rather than redirected to, so the bytes never become
 * reachable by an unauthenticated URL, and every view is written to the audit
 * log.
 */
router.get('/kyc/:userId/document', async (req, res) => {
  const user = await User.findById(req.params.userId)
    .select('username kycDocument kycDocumentMime kycStatus');

  if (!user) {
    return res.status(404).json({ msg: 'User not found' });
  }
  if (!user.kycDocument) {
    return res.status(404).json({ msg: 'This user has not submitted a KYC document' });
  }

  // Guards against path traversal and confirms the file is still on disk.
  const filePath = resolveStoredFile(user.kycDocument);
  if (!filePath) {
    console.error(`KYC file missing on disk for user ${user._id}: ${user.kycDocument}`);
    return res.status(410).json({
      msg: 'The stored document is no longer available. It may have been lost in a redeploy — ask the user to re-submit.',
    });
  }

  // Viewing someone's identity documents is a privileged act; record it.
  await AdminAction.record(req, {
    action: 'kyc_document_viewed',
    targetUser: user._id,
    targetId: user._id.toString(),
    note: `Viewed KYC document for ${user.username}`,
  });

  res.setHeader('Content-Type', user.kycDocumentMime || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="kyc-${user.username}"`);
  // Identity documents must never be cached by a proxy or the browser disk.
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  return fs.createReadStream(filePath).pipe(res);
});

// @desc    Approve KYC
// @route   PUT /api/admin/kyc/:id/approve
// @access  Private/Admin
router.put('/kyc/:id/approve', requireAdminPin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ msg: 'User not found' });

  // An admin could previously verify a user who had never uploaded anything.
  if (!user.kycDocument) {
    return res.status(400).json({ msg: 'This user has not submitted a document to verify' });
  }
  if (user.kycStatus === 'verified') {
    return res.status(400).json({ msg: 'This user is already verified' });
  }

  const before = user.kycStatus;
  user.kycStatus = 'verified';
  user.kycRejectionNote = '';
  await user.save();

  await AdminAction.record(req, {
    action: 'kyc_approved',
    targetUser: user._id,
    before: { kycStatus: before },
    after: { kycStatus: 'verified' },
  });

  sendEmail({
    email: user.email,
    subject: 'KYC Verification Approved',
    message: `Hi ${user.username},\n\nYour Identity Verification (KYC) has been successfully approved!\n\nBest regards,\nThe GeneratingPro Team`,
  });

  return res.json({ msg: 'KYC approved successfully', kycStatus: user.kycStatus });
});

// @desc    Reject KYC
// @route   PUT /api/admin/kyc/:id/reject
// @access  Private/Admin
router.put('/kyc/:id/reject', requireAdminPin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ msg: 'User not found' });

  const before = user.kycStatus;
  user.kycStatus = 'rejected';
  user.kycRejectionNote = typeof req.body.rejectionNote === 'string' && req.body.rejectionNote.trim()
    ? req.body.rejectionNote.trim().slice(0, 500)
    : 'Your document did not meet our verification requirements.';
  await user.save();

  await AdminAction.record(req, {
    action: 'kyc_rejected',
    targetUser: user._id,
    before: { kycStatus: before },
    after: { kycStatus: 'rejected' },
    note: user.kycRejectionNote,
  });

  sendEmail({
    email: user.email,
    subject: 'KYC Verification Rejected',
    message: `Hi ${user.username},\n\nUnfortunately, your Identity Verification (KYC) was rejected.\n\nReason: ${user.kycRejectionNote}\n\nPlease ensure the document is clear, valid, and matches your account details, then try again.\n\nBest regards,\nThe GeneratingPro Team`,
  });

  return res.json({ msg: 'KYC rejected successfully', kycStatus: user.kycStatus });
});

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

// @desc    Lock or unlock a user account
// @route   PUT /api/admin/users/:id/lock
// @access  Private/Admin
router.put('/users/:id/lock', requireAdminPin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ msg: 'User not found' });

  if (user._id.equals(req.user._id)) {
    return res.status(400).json({ msg: 'You cannot lock your own account' });
  }

  const before = user.isLocked;
  user.isLocked = !user.isLocked;
  await user.save();

  await AdminAction.record(req, {
    action: user.isLocked ? 'user_locked' : 'user_unlocked',
    targetUser: user._id,
    before: { isLocked: before },
    after: { isLocked: user.isLocked },
  });

  return res.json({
    msg: `User ${user.isLocked ? 'locked' : 'unlocked'} successfully`,
    user,
  });
});

// @desc    Manually adjust a user's balance and limits
// @route   PUT /api/admin/users/:id/balance
// @access  Private/Admin
router.put('/users/:id/balance', requireAdminPin, async (req, res) => {
  const { balance, dailyWithdrawalLimit, reason } = req.body;

  // Coerce properly — this endpoint writes directly to a money field.
  const newBalance = balance === 0 || balance === '0' ? 0 : parseAmount(balance);
  if (newBalance === null) {
    return res.status(400).json({ msg: 'Please provide a valid balance' });
  }

  // A manual balance edit on a custodial platform is the single most sensitive
  // action available. Require a written justification for the audit trail.
  if (typeof reason !== 'string' || reason.trim().length < 5) {
    return res.status(400).json({ msg: 'A reason (min 5 characters) is required for a manual balance adjustment' });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ msg: 'User not found' });

  const before = { balance: user.balance, dailyWithdrawalLimit: user.dailyWithdrawalLimit };

  user.balance = round2(newBalance);
  if (dailyWithdrawalLimit !== undefined) {
    const limit = Number(dailyWithdrawalLimit);
    if (!Number.isFinite(limit) || limit < 0) {
      return res.status(400).json({ msg: 'Please provide a valid daily withdrawal limit' });
    }
    user.dailyWithdrawalLimit = round2(limit);
  }
  await user.save();

  await AdminAction.record(req, {
    action: 'balance_adjusted',
    targetUser: user._id,
    before,
    after: { balance: user.balance, dailyWithdrawalLimit: user.dailyWithdrawalLimit },
    note: reason.trim().slice(0, 500),
  });

  console.warn(
    `BALANCE ADJUSTED by ${req.user.username}: ${user.username} ` +
    `$${formatAmount(before.balance)} -> $${formatAmount(user.balance)} (${reason.trim()})`
  );

  return res.json({ msg: 'Updated successfully', user });
});

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

// @desc    Approve a pending transaction
// @route   PUT /api/admin/transactions/:id/approve
// @access  Private/Admin
router.put('/transactions/:id/approve', requireAdminPin, async (req, res) => {
  /*
   * Claim the transaction atomically. Two admins clicking Approve at the same
   * moment would otherwise both read status 'pending' and both credit the
   * deposit.
   */
  const transaction = await Transaction.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { $set: { status: 'completed' } },
    { new: true }
  );

  if (!transaction) {
    const exists = await Transaction.exists({ _id: req.params.id });
    return res.status(exists ? 400 : 404).json({
      msg: exists ? 'Transaction is not pending' : 'Transaction not found',
    });
  }

  let user;
  try {
    if (transaction.type === 'deposit') {
      // Atomic credit, plus the running deposit total.
      user = await User.findOneAndUpdate(
        { _id: transaction.user },
        { $inc: { balance: transaction.amount, totalDeposit: transaction.amount } },
        { new: true }
      );
    } else {
      // Withdrawals were already debited when the request was created, so
      // approval only records the outcome.
      user = await User.findById(transaction.user);
    }

    if (!user) {
      throw new Error(`User ${transaction.user} not found`);
    }
  } catch (error) {
    // Release the claim so the approval can be retried.
    await Transaction.updateOne({ _id: transaction._id }, { $set: { status: 'pending' } });
    throw error;
  }

  await AdminAction.record(req, {
    action: `${transaction.type}_approved`,
    targetUser: transaction.user,
    targetId: transaction._id.toString(),
    after: { amount: transaction.amount, status: 'completed' },
  });

  sendEmail({
    email: user.email,
    subject: `Transaction Approved: $${formatAmount(transaction.amount)}`,
    message: `Hi ${user.username},\n\nGood news! Your ${transaction.type} request for $${formatAmount(transaction.amount)} has been approved and processed.\n\nBest regards,\nThe GeneratingPro Team`,
  });

  return res.json({ msg: 'Transaction approved successfully', transaction });
});

// @desc    Reject a pending transaction
// @route   PUT /api/admin/transactions/:id/reject
// @access  Private/Admin
router.put('/transactions/:id/reject', requireAdminPin, async (req, res) => {
  const transaction = await Transaction.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { $set: { status: 'failed' } },
    { new: true }
  );

  if (!transaction) {
    const exists = await Transaction.exists({ _id: req.params.id });
    return res.status(exists ? 400 : 404).json({
      msg: exists ? 'Transaction is not pending' : 'Transaction not found',
    });
  }

  // Refund a rejected withdrawal — the balance was debited at request time.
  let user;
  if (transaction.type === 'withdrawal') {
    user = await credit(transaction.user, transaction.amount);
  } else {
    user = await User.findById(transaction.user);
  }

  await AdminAction.record(req, {
    action: `${transaction.type}_rejected`,
    targetUser: transaction.user,
    targetId: transaction._id.toString(),
    after: { amount: transaction.amount, status: 'failed', refunded: transaction.type === 'withdrawal' },
    note: typeof req.body.reason === 'string' ? req.body.reason.slice(0, 500) : undefined,
  });

  if (user) {
    sendEmail({
      email: user.email,
      subject: `Transaction Rejected: $${formatAmount(transaction.amount)}`,
      message: `Hi ${user.username},\n\nUnfortunately, your ${transaction.type} request for $${formatAmount(transaction.amount)} was rejected.\nIf this was a withdrawal, the funds have been returned to your balance.\n\nPlease contact support for more details.\n\nBest regards,\nThe GeneratingPro Team`,
    });
  }

  return res.json({ msg: 'Transaction rejected', transaction });
});

// ---------------------------------------------------------------------------
// Stakes
// ---------------------------------------------------------------------------

// @desc    Approve a pending stake
// @route   PUT /api/admin/stakes/:id/approve
// @access  Private/Admin
router.put('/stakes/:id/approve', requireAdminPin, async (req, res) => {
  const now = new Date();

  // Claim and start in one atomic operation.
  const stake = await Staking.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    [{
      $set: {
        status: 'active',
        startedAt: now,
        lastProcessedAt: now,
        // completesAt must never be left null — the cron's maturity check
        // treats a null as "already matured" if not guarded.
        completesAt: {
          $add: [now, { $multiply: ['$durationHours', 60 * 60 * 1000] }],
        },
      },
    }],
    { new: true }
  );

  if (!stake) {
    const exists = await Staking.exists({ _id: req.params.id });
    return res.status(exists ? 400 : 404).json({
      msg: exists ? 'Stake is not pending' : 'Stake not found',
    });
  }

  await AdminAction.record(req, {
    action: 'stake_approved',
    targetUser: stake.user,
    targetId: stake._id.toString(),
    after: { amount: stake.amount, planName: stake.planName, completesAt: stake.completesAt },
  });

  const user = await User.findById(stake.user);
  if (user) {
    sendEmail({
      email: user.email,
      subject: `Staking Plan Approved: ${stake.planName}`,
      message: `Hi ${user.username},\n\nGood news! Your staking request for $${formatAmount(stake.amount)} on the ${stake.planName} has been approved.\n\nYour countdown has started and your payout will be credited automatically on maturity.\n\nBest regards,\nThe GeneratingPro Team`,
    });
  }

  return res.json({ msg: 'Stake approved successfully', stake });
});

// @desc    Reject a pending stake
// @route   PUT /api/admin/stakes/:id/reject
// @access  Private/Admin
router.put('/stakes/:id/reject', requireAdminPin, async (req, res) => {
  const stake = await Staking.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { $set: { status: 'failed' } },
    { new: true }
  );

  if (!stake) {
    const exists = await Staking.exists({ _id: req.params.id });
    return res.status(exists ? 400 : 404).json({
      msg: exists ? 'Stake is not pending' : 'Stake not found',
    });
  }

  // Refund the principal that was debited at purchase time.
  const user = await credit(stake.user, stake.amount);

  await AdminAction.record(req, {
    action: 'stake_rejected',
    targetUser: stake.user,
    targetId: stake._id.toString(),
    after: { amount: stake.amount, refunded: true },
    note: typeof req.body.reason === 'string' ? req.body.reason.slice(0, 500) : undefined,
  });

  if (user) {
    sendEmail({
      email: user.email,
      subject: `Staking Plan Rejected: ${stake.planName}`,
      message: `Hi ${user.username},\n\nUnfortunately, your staking request for $${formatAmount(stake.amount)} on the ${stake.planName} was rejected.\nNo payment deposit was found. Your funds have been returned to your balance.\n\nPlease contact support if you have any questions.\n\nBest regards,\nThe GeneratingPro Team`,
    });
  }

  return res.json({ msg: 'Stake rejected', stake });
});

// ---------------------------------------------------------------------------
// Staking plans
// ---------------------------------------------------------------------------

// Only these fields may be written. `create(req.body)` and
// `findByIdAndUpdate(id, req.body)` were mass-assignment holes.
const PLAN_FIELDS = ['name', 'min', 'max', 'durationHours', 'returnPercent', 'isActive'];

const pickPlanFields = (body) => {
  const out = {};
  for (const key of PLAN_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
};

const validatePlan = (data) => {
  const errors = [];
  const num = (v) => (v === undefined ? undefined : Number(v));

  if (data.min !== undefined && (!Number.isFinite(num(data.min)) || num(data.min) < 0)) {
    errors.push('min must be a non-negative number');
  }
  if (data.max !== undefined && (!Number.isFinite(num(data.max)) || num(data.max) <= 0)) {
    errors.push('max must be a positive number');
  }
  if (data.min !== undefined && data.max !== undefined && num(data.min) > num(data.max)) {
    errors.push('min cannot be greater than max');
  }
  if (data.durationHours !== undefined
      && (!Number.isFinite(num(data.durationHours)) || num(data.durationHours) < 1)) {
    errors.push('durationHours must be at least 1');
  }
  // An unbounded returnPercent was writable before; a typo could have promised
  // a 100,000% return that the cron would then dutifully accrue.
  if (data.returnPercent !== undefined
      && (!Number.isFinite(num(data.returnPercent))
        || num(data.returnPercent) < 0
        || num(data.returnPercent) > 1000)) {
    errors.push('returnPercent must be between 0 and 1000');
  }
  return errors;
};

// @desc    Get all staking plans
// @route   GET /api/admin/staking-plans
// @access  Private/Admin
router.get('/staking-plans', async (req, res) => {
  const plans = await StakingPlan.find({}).sort({ min: 1 });
  return res.json(plans);
});

// @desc    Create a new staking plan
// @route   POST /api/admin/staking-plans
// @access  Private/Admin
router.post('/staking-plans', requireAdminPin, async (req, res) => {
  const data = pickPlanFields(req.body);
  const errors = validatePlan(data);
  if (errors.length) return res.status(400).json({ msg: 'Validation failed', errors });

  const plan = await StakingPlan.create(data);

  await AdminAction.record(req, {
    action: 'staking_plan_created',
    targetId: plan._id.toString(),
    after: plan.toObject(),
  });

  return res.status(201).json(plan);
});

// @desc    Update a staking plan
// @route   PUT /api/admin/staking-plans/:id
// @access  Private/Admin
router.put('/staking-plans/:id', requireAdminPin, async (req, res) => {
  const existing = await StakingPlan.findById(req.params.id);
  if (!existing) return res.status(404).json({ msg: 'Staking plan not found' });

  const data = pickPlanFields(req.body);
  const merged = { ...existing.toObject(), ...data };
  const errors = validatePlan(merged);
  if (errors.length) return res.status(400).json({ msg: 'Validation failed', errors });

  const plan = await StakingPlan.findByIdAndUpdate(
    req.params.id,
    data,
    // runValidators was missing, so schema rules were skipped entirely.
    { new: true, runValidators: true }
  );

  await AdminAction.record(req, {
    action: 'staking_plan_updated',
    targetId: plan._id.toString(),
    before: existing.toObject(),
    after: plan.toObject(),
  });

  // Existing stakes copied their terms at purchase time, so they are unaffected.
  return res.json(plan);
});

// ---------------------------------------------------------------------------
// Outbound email
// ---------------------------------------------------------------------------

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Email sending limit reached for this hour.' },
});

// @desc    Send branded email to a user from the admin panel
// @route   POST /api/admin/send-email
// @access  Private/Admin
router.post('/send-email', requireAdminPin, emailLimiter, async (req, res) => {
  /*
   * This was an authenticated open relay: any `to` address, arbitrary body,
   * wrapped in the company's branded template and sent from the verified
   * domain — with no PIN, no allowlist, and no rate limit beyond the global
   * one. A single compromised admin session became a phishing platform running
   * on your own sending reputation.
   *
   * Now: PIN-gated, rate-limited, audited, and the recipient must be a
   * registered user.
   */
  const { to, subject, message } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ msg: 'To, subject, and message are all required.' });
  }

  const recipient = await User.findOne({ email: String(to).toLowerCase().trim() });
  if (!recipient) {
    return res.status(400).json({ msg: 'Recipient must be a registered user of the platform.' });
  }

  await sendEmail({
    email: recipient.email,
    subject: String(subject).slice(0, 200),
    message: String(message).slice(0, 10000),
  });

  await AdminAction.record(req, {
    action: 'email_sent',
    targetUser: recipient._id,
    note: String(subject).slice(0, 200),
  });

  return res.json({ msg: 'Email sent successfully' });
});

module.exports = router;
