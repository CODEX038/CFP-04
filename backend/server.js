// ── dotenv MUST be the very first import ─────────────────────────────────────
import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

import authRoutes from './routes/auth.js'
import campaignRoutes from './routes/campaigns.js'
import verificationRoutes from './routes/verificationRoutes.js'
import campaignVerificationRoutes from './routes/campaignVerificationRoutes.js'
import donationRoutes from './routes/donationRoutes.js'
import { startListener } from './listeners/contractListener.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

// ── Allowed origins ───────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'https://cfp-04-4u5n.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean)

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS blocked: ${origin}`))
    }
  },
  credentials: true,
}))

// ── Stripe webhook MUST receive raw body — register BEFORE express.json() ────
app.use('/api/donations/upi/webhook', express.raw({ type: 'application/json' }))

app.use(express.json())

// ── Serve uploaded files (local fallback) ─────────────────────────────────────
app.use(
  '/uploads',
  (req, res, next) => {
    const origin = req.headers.origin
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin)
    }
    res.header('Access-Control-Allow-Methods', 'GET')
    next()
  },
  express.static(path.join(__dirname, 'uploads'))
)

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/campaigns', campaignRoutes)
app.use('/api/verification', verificationRoutes)
app.use('/api/campaign-verification', campaignVerificationRoutes)
app.use('/api/donations', donationRoutes)

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

// ── Database + Server start ───────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected')
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
    startListener()
  })
  .catch((err) => console.error('MongoDB error:', err))
