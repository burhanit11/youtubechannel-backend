import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

//  access and refresh tokens
const accessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log(error);
  }
};

// register a new user
const register = async (req, res) => {
  try {
    const { fullname, username, email, password } = req.body;

    if (
      [fullname, username, email, password].some(
        (field) => field?.trim() === ""
      )
    ) {
      throw new ApiError(402, "All fields must be required");
    }
    const userExists = await User.findOne({ email });

    if (userExists) {
      throw new ApiError(402, "User already exists");
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLoaclPath = req.files?.coverImage[0]?.path;

    console.log(avatarLocalPath, coverImageLoaclPath, "coverImageLoacl");

    if (!avatarLocalPath) {
      throw new ApiError(402, "avatar file path  must be required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLoaclPath);

    if (!avatar) {
      throw new ApiError(402, "avatar file path  must be required");
    }
    const user = await User.create({
      fullname,
      username,
      email,
      password,
      avatar: avatar?.url,
      coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    res
      .status(200)
      .json({ message: "user registered successfully", createdUser });
  } catch (error) {
    console.log(error);
  }
};

// login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Invalid email or password" });
    }

    const matchPassword = await user.isPasswordCorrect(password);

    if (!matchPassword) {
      return res.status(404).json({ message: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = await accessTokenAndRefreshToken(
      user._id
    );

    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({
        message: "user logged in successfully",
        accessToken,
        refreshToken,
        loggedInUser,
      });
  } catch (error) {
    console.log(error);
  }
};

// logout user
const logout = async (req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .cookie("accessToken", options)
    .cookie("refreshToken", options)
    .json({ message: "User logged in successfully" });

  try {
  } catch (error) {
    console.log(error);
  }
};

// refresh access token
const refreshTokenAccess = async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    res.status(403).json({ message: "Unauthorized request." });
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id);
    if (!user) {
      res.status(403).json({ message: "Invalid refresh token" });
    }

    if (incomingRefreshToken !== user.refreshToken) {
      res.status(403).json({ message: "Refesh token expired or used" });
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } = await accessTokenAndRefreshToken(
      user._id
    );

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json({
        message: "access token refreshed",
        accessToken: accessToken,
        refreshToken: newRefreshToken,
      });
  } catch (error) {
    console.log(error);
  }
};

// change current password
const changeCurrentPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    const matchPassword = await user.isPasswordCorrect(oldPassword);

    if (!matchPassword) {
      return res.status(403).json({ message: "Invalid password" });
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ message: "Password change successfully." });
  } catch (error) {
    console.log(error);
  }
};

// get Current User
const getCurrentUser = async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({ message: "Current User fetch successfully.", user });
  } catch (error) {
    console.log(error);
  }
};

// update account details
const updateAccountDetails = async (req, res) => {
  try {
    const { email, fullname } = req.body;

    if (!email || !fullname) {
      res.status(404).json({ message: "All fields are required" });
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          fullname,
          email,
        },
      },
      {
        new: true,
      }
    ).select("-password");

    res
      .status(200)
      .json({ message: "Account updated successfully", user: user });
  } catch (error) {
    console.log(error);
  }
};

// get user channel profile
const getUserChannelProfile = async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(404).json({ message: "username is missing" });
    }

    const channel = User.aggregate([
      {
        $match: {
          username: username?.lowercase(),
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscribers",
          as: "subscribedTo",
        },
      },
      {
        $addFields: {
          SubscribersCount: {
            $size: "subscribers",
          },
          channelSubscribersCount: {
            $size: "subscribedTo",
          },
          isSubscribed: {
            $count: {
              if: { $in: [req.user?._id, "$subscribers.subscriber "] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          fullname: 1,
          username: 1,
          isSubscribed: 1,
          SubscribersCount: 1,
          channelSubscribersCount: 1,
          avatar: 1,
          coverImage: 1,
          email: 1,
        },
      },
    ]);

    console.log(channel, "channel");

    if (!channel.length) {
      return res.status(404).json({ message: "Channel do not exist." });
    }

    res.status(200).json({
      message: "User channel  fetched successfully.",
      channel: channel[0],
    });
  } catch (error) {
    console.log(error);
  }
};

const getWatchHistory = async (req, res) => {
  try {
    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.objectId(req.user._id),
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  {
                    $project: {
                      fullname: 1,
                      username: 1,
                      avatar: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                owner: {
                  $first: "$owner",
                },
              },
            },
          ],
        },
      },
    ]);

    res.status(200).json({
      message: "watch History fetched successfully",
      user: user[0].watchHistory,
    });
  } catch (error) {
    console.log(error);
  }
};

export {
  register,
  login,
  logout,
  refreshTokenAccess,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  getUserChannelProfile,
  getWatchHistory,
};
