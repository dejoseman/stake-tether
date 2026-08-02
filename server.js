const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./backend/config/db');

dotenv.config();

// Connect to MongoDB
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for development, enable in prod
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
const authRoutes = require('./backend/routes/auth');
const transactionRoutes = require('./backend/routes/transactions');
const adminRoutes = require('./backend/routes/admin');
const settingsRoutes = require('./backend/routes/settings');
const stakesRoutes = require('./backend/routes/stakes');
const kycRoutes = require('./backend/routes/kyc');
const startStakingCron = require('./backend/cron/stakingProcessor');

// Start automated background tasks
if (process.env.NODE_ENV !== 'test') {
  startStakingCron();
}

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/stakes', stakesRoutes);
app.use('/api/kyc', kycRoutes);

// Serve uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve Static Frontend Files (React Vite build)
app.use(express.static(path.join(__dirname, 'client/dist')));

// Default Route (serve React index.html for all other routes to support client-side routing)
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
