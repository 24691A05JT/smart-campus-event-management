const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI || mongoURI.includes('YOUR_MONGODB_ATLAS_URI')) {
      console.warn('⚠️ MONGO_URI environment variable is not configured or using placeholder.');
      console.warn('⚠️ Database operations will be disabled until MONGO_URI is set in backend/.env');
      return false;
    }

    const conn = await mongoose.connect(mongoURI);

    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Non-fatal warning in development to allow server health check testing
    return false;
  }
};

module.exports = connectDB;
