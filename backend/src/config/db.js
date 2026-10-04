const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (
      !mongoURI ||
      mongoURI.includes('YOUR_MONGODB_ATLAS_URI') ||
      mongoURI.includes('<username>') ||
      mongoURI.includes('<password>') ||
      mongoURI.includes('cluster0.mongodb.net')
    ) {
      console.warn('⚠️ MONGO_URI environment variable is not configured with a valid MongoDB Atlas connection string.');
      console.warn('⚠️ Please update MONGO_URI in backend/.env with your real MongoDB Atlas connection URI.');
      return false;
    }

    const conn = await mongoose.connect(mongoURI);

    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    return false;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB connection lost. Disconnected.');
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ Mongoose Connection Error: ${err.message}`);
});

module.exports = connectDB;

