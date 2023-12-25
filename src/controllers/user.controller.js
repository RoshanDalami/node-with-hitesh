import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { User } from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/Cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js'
const registerUser = asyncHandler(async (req, res) => {
  //get user details from request.
  //validation
  //check if user already exist. username, email
  //check for images , check for avatar.
  //upload to cloudinary , avatar.
  // create user object. -- create entry to database.
  //remove password and refresh token from response .
  // check for user creation .
  // return response.

  const { username, email, fullname, password } = req.body;

  if (
    [username, email, fullname, password].some((field) => field.trim() === "")
  ) {
    throw new ApiError(400, "All Fields are required");
  }
  if (!email.includes("@")) {
    throw new ApiError(400, "Please provide proper email");
  }
  const existedUser = await User.findOne({
    $or:[{ username },{ email }]
  })
  if(existedUser){ throw new ApiError(409,"user email or username already exist")}

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0 ){
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if(!avatarLocalPath){
    throw new ApiError(400,'Avatar is required')
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!avatar){
    throw new ApiError(400,'Avatar is required')
  }

 const user =  await User.create({
    fullname,
    avatar:avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
  })
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )
  if(!createdUser){
    throw new ApiError(500,'Something went wrong while creating user')
  }
  return res.status(201).json(
    new ApiResponse(200,createdUser,'user registered successfully')
  )
});

export { registerUser };
