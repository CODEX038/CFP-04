import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

import authRoutes from './routes/auth.js'
import campaignRoutes from './routes/campaigns.js'
import verificationRoutes from './routes/verificationRoutes.js'
import campaignVerificationRoutes from './routes/campaignVerificationRoutes.js'
import donationRoutes from './routes/donationRoutes.js'
import { startListener } from './listeners/contractListener.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}))

// ── Stripe webhook MUST receive raw body — register BEFORE express.json() ────
app.use('/api/donations/upi/webhook', express.raw({ type: 'application/json' }))

app.use(express.json())

// Serve uploaded files — must be before routes
app.use(
  '/uploads',
  (req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173')
    res.header('Access-Control-Allow-Methods', 'GET')
    next()
  },
  express.static(path.join(__dirname, 'uploads'))
)

app.use('/api/auth', authRoutes)
app.use('/api/campaigns', campaignRoutes)
app.use('/api/verification', verificationRoutes)
app.use('/api/campaign-verification', campaignVerificationRoutes)
app.use('/api/donations', donationRoutes)

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected')
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
    startListener()
  })
  .catch((err) => console.error('MongoDB error:', err))
