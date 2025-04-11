const mongoose = require('mongoose');
const connectDB = async () => {
  try {
    // Check if we have the MongoDB URI in environment variables
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL;
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

connectDB();