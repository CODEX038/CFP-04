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
 * Upload a file from disk path to Cloudinary.
 * @param {string} filePath   - local temp file path (from multer)
 * @param {string} folder     - Cloudinary folder name
 * @param {object} options    - extra Cloudinary options
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export async function uploadFromDisk(filePath, folder, options = {}) {
  ensureConfigured()
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: 'auto',   // handles images + PDFs + docs
    ...options,
  })
  // Clean up local temp file
  try { fs.unlinkSync(filePath) } catch {}
  return {
    url:      result.secure_url,
    publicId: result.public_id,
  }
}

/**
 * Upload a file from a Buffer to Cloudinary (for in-memory multer).
 * @param {Buffer} buffer
 * @param {string} folder
 * @param {object} options
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export async function uploadFromBuffer(buffer, folder, options = {}) {
  ensureConfigured()
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto', ...options },
      (error, result) => {
        if (error) return reject(error)
        resolve({ url: result.secure_url, publicId: result.public_id })
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