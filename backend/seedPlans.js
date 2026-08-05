const StakingPlan = require('./models/StakingPlan');

const seedStakingPlans = async () => {
  try {
    const count = await StakingPlan.countDocuments();
    if (count === 0) {
      console.log('No staking plans found in DB. Seeding default plans...');
      
      const defaultPlans = [
        { name: 'Basic Plan 1', min: 100, max: 499, durationHours: 24, returnPercent: 10 },
        { name: 'Silver Plan 2', min: 500, max: 4999, durationHours: 48, returnPercent: 20 },
        { name: 'Gold Plan 3', min: 5000, max: 9999, durationHours: 72, returnPercent: 35 },
        { name: 'Premium Plan 4', min: 10000, max: 9999999, durationHours: 120, returnPercent: 50 }
      ];

      await StakingPlan.insertMany(defaultPlans);
      console.log('Staking plans seeded successfully.');
    }
  } catch (error) {
    console.error('Error seeding staking plans:', error);
  }
};

module.exports = seedStakingPlans;
