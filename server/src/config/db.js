import mongoose from 'mongoose';

let isMongoConnected = false;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codetogether';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isMongoConnected = true;
    console.log(`[MongoDB] Connected successfully to ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    isMongoConnected = false;
    console.warn(`[MongoDB] Connection failed: ${error.message}. Running with in-memory persistence fallback layer.`);
  }

  mongoose.connection.on('disconnected', () => {
    isMongoConnected = false;
    console.warn('[MongoDB] Disconnected. Fallback storage active.');
  });

  mongoose.connection.on('reconnected', () => {
    isMongoConnected = true;
    console.log('[MongoDB] Reconnected successfully.');
  });
};

export const getIsMongoConnected = () => isMongoConnected;
