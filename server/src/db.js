import mongoose from 'mongoose'

import { env } from './config/env.js'

let bucket = null

/** Connect to MongoDB and prepare the GridFS bucket that stores uploaded images and videos. */
export async function connectDb() {
  mongoose.set('strictQuery', true)
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 15000 })
  bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'media' })
  return mongoose.connection
}

export function mediaBucket() {
  if (!bucket) throw new Error('Database not connected')
  return bucket
}

export async function disconnectDb() {
  await mongoose.disconnect()
  bucket = null
}
