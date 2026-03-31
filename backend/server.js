// ── dotenv MUST be the very first import ─────────────────────────────────────
import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

import authRoutes                  from './routes/auth.js'
import campaignRoutes              from './routes/campaigns.js'
import verificationRoutes          from './routes/verificationRoutes.js'
import campaignVerificationRoutes  from './routes/campaignVerificationRoutes.js'
import donationRoutes              from './routes/donationRoutes.js'
import { startListener }           from './listeners/contractListener.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const app  = express()
const PORT = process.env.PORT || 5000

app.set('trust proxy', 1)

// ── Allowed origins ───────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://cfp-04-4u5n.vercel.app',
  'https://cfp-04.vercel.app',
  process.env.FRONTEND_URL,
  process.env.ADMIN_PANEL_URL,
].filter(Boolean).map(o => o.replace(/\/$/, '')) // strip trailing slashes

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, server-to-server, curl)
    if (!origin) return callback(null, true)

    // Allow any Vercel preview deployment + explicit origins
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app')   ||
      origin.endsWith('.onrender.com')
    ) {
      return callback(null, true)
    }

    console.warn(`[CORS] Blocked origin: ${origin}`)
    return callback(new Error(`CORS blocked: ${origin}`))
  },
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Handle preflight for all routes
app.options('*', cors())

// ── Stripe webhook — raw body BEFORE express.json() ──────────────────────────
app.use(
  '/api/donations/upi/webhook',
  express.raw({ type: 'application/json' })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Serve uploaded files ──────────────────────────────────────────────────────
app.use(
  '/uploads',
  (req, res, next) => {
    const origin = req.headers.origin
    if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app'))) {
      res.header('Access-Control-Allow-Origin', origin)
    }
    res.header('Access-Control-Allow-Methods', 'GET')
    next()
  },
  express.static(path.join(__dirname, 'uploads'))
)

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',                 authRoutes)
app.use('/api/campaigns',            campaignRoutes)
app.use('/api/verification',         verificationRoutes)
app.use('/api/campaign-verification',campaignVerificationRoutes)
app.use('/api/donations',            donationRoutes)

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  env:    process.env.NODE_ENV,
  time:   new Date().toISOString(),
}))

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` })
})

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message)
  res.status(500).json({ message: err.message || 'Internal server error' })
})

// ── Database + Server start ───────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => {
    console.log('MongoDB connected')
    app.listen(PORT, '0.0.0.0', () =>
      console.log(`Server running on port ${PORT}`)
    )
    startListener()
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message)
    process.exit(1)
  })
