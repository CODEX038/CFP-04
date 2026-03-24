import multer from 'multer'
import path   from 'path'
import fs     from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const uploadsDir = path.join(__dirname, '../uploads')

// ── Create base folders on startup ────────────────────────────────────────────
const folders = ['docs', 'photos', 'campaign-docs']  // ✅ added campaign-docs
folders.forEach(f => {
  const dir = path.join(uploadsDir, f)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
})

// ── File filter ───────────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/jpg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  if (allowed.includes(file.mimetype)) cb(null, true)
  else cb(new Error('Only images, PDFs and Word documents are allowed'), false)
}

// ── Default storage (docs / photos) ──────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.params.type || 'docs'
    const dir  = path.join(uploadsDir, type)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${unique}${path.extname(file.originalname)}`)
  },
})

// ── Default uploader (existing — unchanged) ───────────────────────────────────
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
})

// ── Campaign docs uploader (NEW) ──────────────────────────────────────────────
// Saves to /uploads/campaign-docs/
// Usage in routes: uploadCampaignDocs.fields([{ name: 'fees_receipt' }, ...])
export const uploadCampaignDocs = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(uploadsDir, 'campaign-docs')
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
      cb(null, `${unique}${path.extname(file.originalname)}`)
    },
  }),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
})
