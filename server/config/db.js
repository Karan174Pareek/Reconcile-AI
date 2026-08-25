import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Disable buffering so unhandled Mongo connection attempts fail fast (0ms) instead of hanging
mongoose.set('bufferCommands', false);

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export const connectDB = async (customUri) => {
  if (cached.conn && mongoose.connection.readyState >= 1) {
    return cached.conn;
  }

  const uri = customUri || process.env.MONGO_URI;

  if (!uri) {
    throw new Error(
      'MONGO_URI environment variable is missing. Please add your MongoDB Atlas connection string under Vercel Settings > Environment Variables.'
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 2500,
        connectTimeoutMS: 2500,
        bufferCommands: false,
        maxPoolSize: 10,
      })
      .then((conn) => {
        cached.conn = conn;
        console.log(`[MongoDB Serverless Cached Connected]: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
      })
      .catch((error) => {
        cached.promise = null;
        console.warn(`[MongoDB Serverless Connection Warning]: ${error.message}`);
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('[MongoDB] Disconnected successfully');
  } catch (error) {
    console.error(`[MongoDB] Disconnect Error: ${error.message}`);
  }
};

export default connectDB;
