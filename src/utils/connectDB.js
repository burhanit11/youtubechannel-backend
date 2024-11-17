import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGDB_URL);
    console.log("Database Connect successfully.");
  } catch (error) {
    console.log("Connecting db error: ", error);
  }
};

export default connectDB;
