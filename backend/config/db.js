const mongoose = require('mongoose');

/**
 * Connect to MongoDB.
 *
 * This used to swallow connection failures and let the server keep listening.
 * Health checks passed, the frontend loaded, and every authenticated request
 * returned a 500 — while the staking cron and plan seeding failed silently in
 * the background. Failing to start is far easier to diagnose, and lets the
 * orchestrator restart or roll back.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`FATAL: MongoDB connection failed — ${error.message}`);
    process.exit(1);
  }

  // A connection that drops after startup is just as fatal, but recoverable —
  // log it loudly and let the driver retry. /api/health reports the real state
  // so a load balancer can route around this instance meanwhile.
  mongoose.connection.on('disconnected', () => {
    console.error('MongoDB disconnected — attempting to reconnect');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`MongoDB error: ${err.message}`);
  });
};

module.exports = connectDB;
