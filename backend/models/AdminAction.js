const mongoose = require('mongoose');

/**
 * Append-only audit trail for privileged actions.
 *
 * Admins can set arbitrary balances, approve withdrawals, and verify KYC. None
 * of that was recorded anywhere. For a custodial money platform this is the
 * first artefact an auditor or a fraud investigation asks for.
 *
 * Nothing in the codebase updates or deletes these records.
 */
const adminActionSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  adminUsername: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  // The user or record the action was performed against.
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  targetId: {
    type: String,
  },
  // Before/after snapshots for reversible or disputed actions.
  before: {
    type: mongoose.Schema.Types.Mixed,
  },
  after: {
    type: mongoose.Schema.Types.Mixed,
  },
  note: {
    type: String,
  },
  ip: {
    type: String,
  },
}, {
  timestamps: true,
});

adminActionSchema.index({ createdAt: -1 });

const AdminAction = mongoose.model('AdminAction', adminActionSchema);

/**
 * Record an admin action. Never throws — an audit-log failure must not roll
 * back or block the operation it is describing, but it must be loud.
 */
AdminAction.record = async (req, { action, targetUser, targetId, before, after, note }) => {
  try {
    await AdminAction.create({
      admin: req.user._id,
      adminUsername: req.user.username,
      action,
      targetUser,
      targetId,
      before,
      after,
      note,
      ip: req.ip,
    });
  } catch (error) {
    console.error('AUDIT LOG WRITE FAILED', { action, targetId, error: error.message });
  }
};

module.exports = AdminAction;
