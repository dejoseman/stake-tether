const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tether');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.warn(`WARNING: The database is not connected. Auth and Dashboard will not work. Please ensure MongoDB is running locally on port 27017.`);
    // process.exit(1);
  }
};

module.exports = connectDB;
