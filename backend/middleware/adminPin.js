const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Second factor for destructive admin actions (balance edits, approvals,
 * KYC decisions). Requires an `x-admin-pin` header.
 *
 * The PIN hash is `select: false` on the schema, so it must be re-fetched
 * explicitly rather than read off req.user.
 */
const requireAdminPin = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Not authorized as an admin' });
  }

  const pin = req.headers['x-admin-pin'];
  if (!pin) {
    return res.status(401).json({ msg: 'Admin Action PIN is required to perform this action' });
  }

  const adminUser = await User.findById(req.user._id).select('+adminPin');

  if (!adminUser || !adminUser.adminPin) {
    return res.status(403).json({ msg: 'Admin PIN is not set. Please set it in Settings first.' });
  }

  const isMatch = await bcrypt.compare(String(pin), adminUser.adminPin);
  if (!isMatch) {
    console.warn(`Invalid admin PIN attempt by ${req.user.username} from ${req.ip}`);
    return res.status(401).json({ msg: 'Invalid Admin Action PIN' });
  }

  return next();
};

module.exports = { requireAdminPin };
