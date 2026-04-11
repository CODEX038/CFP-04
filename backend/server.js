// ── dotenv MUST be the very first import ─────────────────────────────────────
import dotenv from 'dotenv'
dotenv.config()

import express  from 'express'
import mongoose from 'mongoose'
import cors     from 'cors'
import path     from 'path'
import { fileURLToPath } from 'url'

// ── Route imports ─────────────────────────────────────────────────────────────
import authRoutes                 from './routes/auth.js'
import campaignRoutes             from './routes/campaigns.js'
import verificationRoutes         from './routes/verificationRoutes.js'
import campaignVerificationRoutes from './routes/campaignVerificationRoutes.js'
import donationRoutes             from './routes/donationRoutes.js'
import campaignExpiryRoutes       from './routes/campaignExpiryRoutes.js'

// ── Listeners / Jobs ──────────────────────────────────────────────────────────
import { startListener }      from './listeners/contractListener.js'
import { scheduleExpiryCheck } from './jobs/campaignExpiryCron.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const app  = express()
const PORT = process.env.PORT || 5000

app.set('trust proxy', 1)

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://cfp-04-4u5n.vercel.app',
  'https://cfp-04.vercel.app',
  process.env.FRONTEND_URL,
  process.env.ADMIN_PANEL_URL,
].filter(Boolean).map(o => o.replace(/\/$/, ''))

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app')   ||
      origin.endsWith('.onrender.com')
    ) return cb(null, true)
    console.warn('[CORS] Blocked:', origin)
    return cb(new Error(`CORS blocked: ${origin}`))
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.options('*', cors())

// ── Stripe webhook — raw body BEFORE express.json() ──────────────────────────
// This MUST come before express.json() middleware.
app.use(
  '/api/donations/upi/webhook',
  express.raw({ type: 'application/json' })
)

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Static uploads ────────────────────────────────────────────────────────────
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
app.use('/api/auth',                  authRoutes)
app.use('/api/campaigns',             campaignRoutes)
app.use('/api/campaigns',             campaignExpiryRoutes)   // check-expired + process-expired
app.use('/api/verification',          verificationRoutes)
app.use('/api/campaign-verification', campaignVerificationRoutes)
app.use('/api/donations',             donationRoutes)

// ── Admin: manual cron trigger (development / testing) ───────────────────────
// Remove or guard this in production behind adminOnly middleware
import { runExpiryCheckNow } from './jobs/campaignExpiryCron.js'

app.post('/api/admin/trigger-expiry-check', async (req, res) => {
  const authHeader = req.headers.authorization || ''
  const token      = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (process.env.ADMIN_CRON_TOKEN && token !== process.env.ADMIN_CRON_TOKEN) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  try {
    const result = await runExpiryCheckNow()
    res.json(result)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  env:    process.env.NODE_ENV,
  db:     mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  time:   new Date().toISOString(),
}))

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` })
})

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message)
  res.status(500).json({ message: err.message || 'Internal server error' })
})

// ── Connect DB → start server + jobs ─────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  .then(() => {
    console.log('✓ MongoDB connected')

    app.listen(PORT, '0.0.0.0', () =>
      console.log(`✓ Server running on port ${PORT}`)
    )

    // Start blockchain event listener
    startListener()

    // Start daily campaign expiry cron (2:00 AM)
    scheduleExpiryCheck()
  })
  .catch(err => {
    console.error('✗ MongoDB connection error:', err.message)
    process.exit(1)
  })

export default app
