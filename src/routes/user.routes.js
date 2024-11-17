import express from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  login,
  logout,
  refreshTokenAccess,
  register,
  updateAccountDetails,
} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// register routes
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  register
);

// login routes
router.route("/login").post(login);

// logout routes
router.route("/logout").post(verifyJWT, logout);

// refresh token routes
router.route("/refresh-token").post(refreshTokenAccess);

// change password routes
router.route("/changeCurrentPassword").post(verifyJWT, changeCurrentPassword);

// getCurrentUser routes
router.route("/getCurrentUser").get(verifyJWT, getCurrentUser);

// update accunt details
router.route("/updateAccuntDetails").post(verifyJWT, updateAccountDetails);

// getUsers channel profile routes
router.route("/getUsersChannelProfile").get(getUserChannelProfile);

// avatar update routes
// router
//   .route("/avatarUpdate")
//   .post(verifyJWT, upload.single("avatar"), avatarUpdate);

// coverImage update routes
// router
//   .route("/coverImageUpdate")
//   .post(verifyJWT, upload.single("coverImage", coverImageUpdate));

// get channel profile routes
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);

router.route("/watchHistory").get(verifyJWT, getWatchHistory);

export default router;
