import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Disable buffering so unhandled Mongo connection attempts fail fast (0ms) instead of hanging 10,000ms
mongoose.set('bufferCommands', false);

let cachedConn = null;
let cachedPromise = null;

export const connectDB = async (customUri) => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (cachedConn) {
    return cachedConn;
  }

  const uri = customUri || process.env.MONGO_URI;

  if (!uri) {
    throw new Error(
      'MONGO_URI environment variable is missing. Please add your MongoDB Atlas connection string under Vercel Settings > Environment Variables.'
    );
  }

  if (!cachedPromise) {
    cachedPromise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 2500,
        connectTimeoutMS: 2500,
        bufferCommands: false,
      })
      .then((conn) => {
        cachedConn = conn;
        console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
      })
      .catch((error) => {
        cachedPromise = null;
        console.warn(`[MongoDB] Connection Warning (Fast Fail): ${error.message}`);
        throw error;
      });
  }

  return cachedPromise;
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    cachedConn = null;
    cachedPromise = null;
    console.log('[MongoDB] Disconnected successfully');
  } catch (error) {
    console.error(`[MongoDB] Disconnect Error: ${error.message}`);
  }
};

export default connectDB;
