import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) throw new Error("Please define MONGODB_URI in env");

// Module-level cache (won't persist between hot reloads in dev)
const cached: MongooseCache = { conn: null, promise: null };

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
