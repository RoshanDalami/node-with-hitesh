// const mongoose = require('mongoose')

// const  { DB_NAME } = require('../contants')
import mongoose from 'mongoose'
import {DB_NAME} from '../contants.js'


const connectDB = async()=>{
    try {
      const connectionInstance =   await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)

      console.log(`\n MongoDB connected on HOST : ${connectionInstance.connection.host} `)
    } catch (error) {
        console.error('Mongodb connection error',error);
        process.exit()
    }
}

export default connectDB