import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { User } from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/Cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'

const generateAccessAndRefreshToken = async(userId)=>{
    try {
     const user =  await User.findById(userId);
     const accessToken = user.generateAccessToken()
    const refreshToken =  user.generateRefreshToken()
    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave:false})

    return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,'Something went wrong while generating refresh and access token')
    }
}



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

const loginUser = asyncHandler(async(req,res)=>{
  //get email and password from user .
  // check User exist on db
  // check if password match
  // send token on cookie
  const { username,email,password } =req.body;
  if(!(username || email)){
    throw new ApiError(400,'Username or Email is required')
  }
 const user = await User.findOne({
    $or:[{username},{email}]
  })

  if(!user){
    throw new ApiError(404,"User doesn't exist")
  }

  const isPasswordValid =   await user.isPasswordCorrect(password)

  if(!isPasswordValid){
    throw new ApiError(401,"Password Incorrect")
  }
   const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

   const loggedInUser = await User.findOne(user._id).select("-password -refreshToken")

   const Options = {
    httpOnly:true,
    secure:true,
   }
   return res
   .status(200)
   .cookie("accessToken",accessToken,Options).
   cookie("refreshToken",refreshToken,Options).json(
    new ApiResponse(200,{
      user: loggedInUser,accessToken,refreshToken
    },
    "User loggedIn successfully"
    )
   )

})

const logoutUser = asyncHandler(async(req,res)=>{
  
 await User.findByIdAndUpdate(req.user._id,
    {
    $set:{refreshToken:undefined}
   },
   {new : true}
  )
  const Options = {
    httpOnly:true,
    secure:true,
   }
   return res.status(200).clearCookie('accessToken',Options).clearCookie('refreshToken',Options).json(new ApiResponse(200,{},"User logged Out Successfully"))

})
const refreshAccessToken = asyncHandler(async(req,res)=>{
   const incommingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken
   if(!incommingRefreshToken) {
    throw new ApiError(401,'Unauthorized Request')
   }
  try {
    const decodedToken =  jwt.verify(incommingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    const user = await User.findById(decodedToken?._id)
    if(!user){
      throw new ApiError(401,'Invalid Refresh Token')
    }
    if(incommingRefreshToken!== user?.refreshToken){
      throw new ApiError(401,'Refresh Token is Expired')
    }
    const Options = {
      httpOnly:true,
      secure:true
    }
      const {accessToken , newrefreshToken} = await generateAccessAndRefreshToken(user?._id)
      return res.status(200).cookie('accessToken',accessToken,Options).cookie('refreshToken',newrefreshToken,Options).json(new ApiResponse(200,{accessToken,refreshToken:newrefreshToken},"Access Token Refreshed"))
  } catch (error) {
    throw new ApiError(401,error?.message || 'Invalid refresh token')
  }
})
export { registerUser , loginUser , logoutUser , refreshAccessToken };
