const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  cryptoNetworks: {
    type: [String],
    default: [
      'Ethereum (ERC20)',
      'Tron (TRC20)',
      'Solana (SPL)',
      'BNB Smart Chain (BEP20)',
      'Polygon',
      'Avalanche C-Chain',
      'Arbitrum One',
      'Optimism',
      'TON',
    ],
  },
}, {
  timestamps: true,
});

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
