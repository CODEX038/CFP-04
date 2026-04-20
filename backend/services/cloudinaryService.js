/**
 * cloudinaryService.js
 * Single Cloudinary utility for all file uploads in the project.
 * Handles: campaign images, campaign docs, user profile photos, user identity docs.
 *
 * Install: npm install cloudinary
 */

import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'
import fs from 'fs'
import path from 'path'

// ── Configure Cloudinary lazily (avoids dotenv timing issues with ES modules) ─
let configured = false

function ensureConfigured() {
  if (configured) return
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      'Cloudinary env vars missing. Ensure CLOUDINARY_CLOUD_NAME, ' +
      'CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in .env'
    )
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key:    CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  })

  configured = true
}

/**
 * Determine the correct Cloudinary resource_type for a file.
 * PDFs and documents must use 'raw' — Cloudinary's 'auto' sometimes
 * misclassifies them as images, causing /image/upload/ URLs that
 * browsers cannot render as PDFs.
 *
 * @param {string} filename - filename or file path
 * @returns {'raw' | 'image' | 'video' | 'auto'}
 */
function getResourceType(filename) {
  if (!filename) return 'auto'
  const ext = path.extname(filename).toLowerCase()
  const rawTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.zip']
  if (rawTypes.includes(ext)) return 'raw'
  const videoTypes = ['.mp4', '.mov', '.avi', '.webm', '.mkv']
  if (videoTypes.includes(ext)) return 'video'
  return 'image'
}

/**
 * Upload a file from disk path to Cloudinary.
 * @param {string} filePath   - local temp file path (from multer)
 * @param {string} folder     - Cloudinary folder name
 * @param {object} options    - extra Cloudinary options
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export async function uploadFromDisk(filePath, folder, options = {}) {
  ensureConfigured()

  /* Multer saves temp files without extensions (e.g. multer-abc123).
     Use originalName hint if provided, otherwise fall back to filePath. */
  const nameHint = options.originalName || filePath
  const resourceType = options.resource_type || getResourceType(nameHint)
  delete options.originalName   // don't pass to Cloudinary

  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: resourceType,
    ...options,
  })

  console.log(`[Cloudinary] Uploaded ${path.basename(filePath)} as resource_type=${resourceType} → ${result.secure_url}`)

  // Clean up local temp file
  try { fs.unlinkSync(filePath) } catch {}

  return {
    url:          result.secure_url,
    publicId:     result.public_id,
    resourceType: result.resource_type,
  }
}

/**
 * Upload a file from a Buffer to Cloudinary (for in-memory multer).
 * @param {Buffer} buffer
 * @param {string} folder
 * @param {string} originalName - original filename to detect resource type
 * @param {object} options
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export async function uploadFromBuffer(buffer, folder, originalName = '', options = {}) {
  ensureConfigured()

  const resourceType = options.resource_type || getResourceType(originalName)

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, ...options },
      (error, result) => {
        if (error) return reject(error)
        console.log(`[Cloudinary] Buffer upload as resource_type=${resourceType} → ${result.secure_url}`)
        resolve({
          url:          result.secure_url,
          publicId:     result.public_id,
          resourceType: result.resource_type,
        })
      }
    )
    const readable = new Readable()
    readable.push(buffer)
    readable.push(null)
    readable.pipe(uploadStream)
  })
}

/**
 * Delete a file from Cloudinary by public ID.
 * Automatically determines resource_type if not provided.
 * @param {string} publicId
 * @param {string} resourceType - 'image' | 'video' | 'raw'
 */
export async function deleteFile(publicId, resourceType = 'image') {
  ensureConfigured()
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
  } catch (err) {
    console.warn('Cloudinary delete failed:', err.message)
  }
}

export default cloudinary
