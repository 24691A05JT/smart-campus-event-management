const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 Smart Campus Server running on port ${PORT}`);
    console.log(`🌐 Health check endpoint: http://localhost:${PORT}/api/health`);
    console.log(`==================================================`);
  });
});
