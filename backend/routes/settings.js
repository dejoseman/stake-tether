const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const Settings = require('../models/Settings');

// @desc    Get global settings
// @route   GET /api/settings
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let settings = await Settings.findOne({});
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @desc    Update global settings (e.g. crypto networks)
// @route   PUT /api/settings
// @access  Private/Admin
router.put('/', protect, admin, async (req, res) => {
  try {
    const { cryptoNetworks } = req.body;
    
    let settings = await Settings.findOne({});
    if (!settings) {
      settings = new Settings();
    }
    
    if (cryptoNetworks) {
      settings.cryptoNetworks = cryptoNetworks;
    }
    
    await settings.save();
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
