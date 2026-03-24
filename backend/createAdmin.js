import mongoose from 'mongoose'
import dotenv   from 'dotenv'
import User     from './models/User.js'

dotenv.config()

await mongoose.connect(process.env.MONGO_URI)
console.log('Connected to MongoDB')

const existing = await User.findOne({ email: 'admin@fundchain.com' })
if (existing) {
  await User.findOneAndUpdate(
    { email: 'admin@fundchain.com' },
    { isAdmin: true, name: 'Admin', username: 'admin' }
  )
  console.log('Admin already exists — updated to admin role!')
} else {
  await User.create({
    name:     'Admin',
    username: 'admin',
    email:    'admin@fundchain.com',
    password: 'admin123',
    isAdmin:  true,
    isVerified: true,
  })
  console.log('Admin created successfully!')
}

console.log('Email:    admin@fundchain.com')
console.log('Password: admin123')

await mongoose.disconnect()