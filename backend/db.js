const mongoose = require('mongoose');
require('dotenv').config();

/**
 * MongoDB connection using Mongoose
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/distribution_system';

    await mongoose.connect(mongoURI);

    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

/**
 * Initialize database connection and models
 */
async function ensureTables() {
  await connectDB();

  // Import all models to ensure they are registered
  require('./models');

  console.log('📦 All MongoDB models loaded successfully');
}

// Export the connection function for backward compatibility
module.exports = {
  ensureTables,
  connectDB,
  mongoose
};
