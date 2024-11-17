import dotenv from "dotenv";
import { app } from "./app.js";
import connectDB from "./utils/connectDB.js";

dotenv.config();
const PORT = process.env.PORT;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is Running on PORT : ${PORT}`);
    });
  })
  .catch((err) => console.log(err));
