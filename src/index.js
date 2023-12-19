// require('dotenv').config({path:'./env'})

// const {connectDB} = require('./db/index')
import connectDB from "./db/index.js";
import { app } from "./app.js";
import dotenv from "dotenv";

dotenv.config({
  path: "./env",
});

connectDB()
  .then(
    () =>
      app.on("error", (error) => {
        console.log(error);
      }),
    app.listen(process.env.PORT, () => {
      console.log(`Server running on ${process.env.PORT} `);
    })
  )
  .catch((err) => console.log("Mongodb connection fail", err));
