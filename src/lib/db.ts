// import mongoose from "mongoose";

// const MONGODB_URI = process.env.MONGODB_URI as string;

// if (!mongoose.connections[0].readyState) {
//   mongoose
//     .connect(MONGODB_URI)
//     .then(() => console.log("MongoDB connected")) // লগ যোগ করুন
//     .catch((err) => console.error("MongoDB connection error:", err)); // লগ যোগ করুন
// }

// export default mongoose;

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

export const connect = async (uri?: string) => {
  if (!mongoose.connections[0].readyState) {
    await mongoose
      .connect(uri || (MONGODB_URI as string))
      .then(() => console.log("MongoDB connected")) // লগ যোগ করুন
      .catch((err) => console.error("MongoDB connection error:", err)); // লগ যোগ করুন
  }
};

export default mongoose;
