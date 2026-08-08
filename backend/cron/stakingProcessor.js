const cron = require('node-cron');
const Staking = require('../models/Staking');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

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

        // Check if completed (matured) — auto-credit user balance
        if (now >= stake.completesAt) {
          const payoutAmount = stake.amount + stake.accruedRewards;

          // Credit the user's available balance
          const user = await User.findById(stake.user);
          if (user) {
            user.balance += payoutAmount;
            await user.save();

            // Notify user that stake has matured and been credited
            sendEmail({
              email: user.email,
              subject: `Stake Completed: ${stake.planName} — $${payoutAmount.toFixed(2)} Credited`,
              message: `Hi ${user.username},\n\nGreat news! Your ${stake.planName} staking contract for $${stake.amount.toFixed(2)} has matured.\n\nYour total payout of $${payoutAmount.toFixed(2)} (capital + ${stake.returnPercent}% return) has been automatically credited to your available balance.\n\nYou can now withdraw or re-stake your funds.\n\nBest regards,\nThe GeneratingPro Team`
            });
          }

          stake.status = 'completed';
          await stake.save();
          console.log(`Stake ${stake._id} completed. $${payoutAmount.toFixed(2)} credited to user ${stake.user}.`);
        }
      }
    } catch (error) {
      console.error('Error processing stakes:', error);
    }
  });
};

module.exports = startStakingCron;
