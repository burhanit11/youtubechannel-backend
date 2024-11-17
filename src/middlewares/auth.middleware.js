import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";

export const verifyJWT = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("authorization")?.replace("Bearer ", "");

    console.log(token, "access token");

    if (!token) {
      res.status(403).json({ message: "UnAuthorized request." });
    }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      res.status(403).json({ message: "Invalid Access Token." });
    }
    req.user = user;
    next();
  } catch (error) {
    console.log(error);
  }
};
