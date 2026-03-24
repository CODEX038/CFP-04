import mongoose from 'mongoose'
import dotenv   from 'dotenv'
import User     from './models/User.js'

dotenv.config()

await mongoose.connect(process.env.MONGO_URI)
console.log('Connected to MongoDB')

const result = await User.findOneAndUpdate(
  { email: 'admin@fundchain.com' },
  { isAdmin: true },
  { new: true }
)

if (result) {
  console.log('Done! Admin promoted:', result.email)
} else {
  console.log('User not found — make sure you registered first')
}

await mongoose.disconnect()