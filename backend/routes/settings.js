const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const { requireAdminPin } = require('../middleware/adminPin');
const Settings = require('../models/Settings');
const AdminAction = require('../models/AdminAction');

// @desc    Get global settings
// @route   GET /api/settings
// @access  Private
router.get('/', protect, async (req, res) => {
  let settings = await Settings.findOne({});
  if (!settings) {
    settings = await Settings.create({});
  }
  return res.json(settings);
});

// @desc    Update global settings (deposit addresses)
// @route   PUT /api/settings
// @access  Private/Admin
router.put('/', protect, admin, requireAdminPin, async (req, res) => {
  /*
   * PIN-gated deliberately.
   *
   * These are the wallet addresses users are told to deposit into. Whoever can
   * change them can redirect every incoming deposit to an address they
   * control — which makes this as sensitive as a balance edit, and it was
   * previously protected by nothing more than the admin role.
   */
  const { cryptoNetworks } = req.body;

  if (cryptoNetworks !== undefined) {
    if (!Array.isArray(cryptoNetworks)) {
      return res.status(400).json({ msg: 'cryptoNetworks must be an array' });
    }
    if (cryptoNetworks.length > 20) {
      return res.status(400).json({ msg: 'Too many networks' });
    }
    for (const n of cryptoNetworks) {
      if (!n || typeof n.name !== 'string' || typeof n.address !== 'string') {
        return res.status(400).json({ msg: 'Each network needs a name and an address' });
      }
      if (!n.name.trim() || !n.address.trim()) {
        return res.status(400).json({ msg: 'Network name and address cannot be empty' });
      }
      if (n.address.trim().length < 20 || n.address.trim().length > 120) {
        return res.status(400).json({ msg: `Address for ${n.name} does not look valid` });
      }
    }
  }

  let settings = await Settings.findOne({});
  if (!settings) settings = new Settings();

  const before = settings.cryptoNetworks?.map((n) => ({ name: n.name, address: n.address })) || [];

  if (cryptoNetworks) {
    settings.cryptoNetworks = cryptoNetworks.map((n) => ({
      name: n.name.trim(),
      address: n.address.trim(),
    }));
  }

  await settings.save();

  await AdminAction.record(req, {
    action: 'deposit_addresses_updated',
    before: { cryptoNetworks: before },
    after: { cryptoNetworks: settings.cryptoNetworks },
  });

  console.warn(`DEPOSIT ADDRESSES CHANGED by ${req.user.username}`);

  return res.json(settings);
});

module.exports = router;
