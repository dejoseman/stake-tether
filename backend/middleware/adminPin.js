const bcrypt = require('bcryptjs');
const User = require('../models/User');

const requireAdminPin = async (req, res, next) => {
  // If no user object, or not admin, we skip (should be caught by protect/admin anyway)
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Not authorized as an admin' });
  }

  // The admin must have set a pin first.
  if (!req.user.adminPin) {
    return res.status(403).json({ msg: 'Admin PIN is not set. Please set it in Settings first.' });
  }

  const pin = req.headers['x-admin-pin'];
  if (!pin) {
    return res.status(401).json({ msg: 'Admin Action PIN is required to perform this action' });
  }

  try {
    const isMatch = await bcrypt.compare(pin, req.user.adminPin);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Invalid Admin Action PIN' });
    }
    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Server error while verifying PIN' });
  }
};

module.exports = { requireAdminPin };
