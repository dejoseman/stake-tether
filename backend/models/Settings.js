const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  cryptoNetworks: [
    {
      name: { type: String, required: true },
      address: { type: String, required: true }
    }
  ],
}, {
  timestamps: true,
});

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
