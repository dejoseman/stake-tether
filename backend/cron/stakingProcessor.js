const cron = require('node-cron');
const Staking = require('../models/Staking');
const User = require('../models/User');

const startStakingCron = () => {
  console.log('Staking processor cron job started. Running every minute...');
  
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Find all active stakes
      const activeStakes = await Staking.find({ status: 'active' });

      for (const stake of activeStakes) {
        // Only accrue up to completesAt
        const effectiveNow = now > stake.completesAt ? stake.completesAt : now;
        const hoursPassed = (effectiveNow - stake.lastProcessedAt) / (1000 * 60 * 60);
        
        if (hoursPassed > 0) {
          // Proportion of the total duration this time slice represents
          const proportion = hoursPassed / stake.durationHours;
          
          // Reward for this time slice
          const rewardSlice = stake.amount * (stake.returnPercent / 100) * proportion;
          
          if (stake.autoCompound) {
            stake.amount += rewardSlice; // compound into principal
          } else {
            stake.accruedRewards += rewardSlice; // keep separate
          }
          
          stake.lastProcessedAt = effectiveNow;
          await stake.save();
        }

        // Check if completed (matured)
        if (now >= stake.completesAt) {
          stake.status = 'matured';
          await stake.save();
          console.log(`Stake ${stake._id} has matured. Waiting for user to cash out.`);
        }
      }
    } catch (error) {
      console.error('Error processing stakes:', error);
    }
  });
};

module.exports = startStakingCron;
