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

// ── Configure Cloudinary ──────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Upload a file from disk path to Cloudinary.
 * @param {string} filePath   - local temp file path (from multer)
 * @param {string} folder     - Cloudinary folder name
 * @param {object} options    - extra Cloudinary options
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export async function uploadFromDisk(filePath, folder, options = {}) {
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
 */
export async function uploadFromBuffer(buffer, folder, options = {}) {
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
 */
export async function deleteFile(publicId, resourceType = 'image') {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
  } catch (err) {
    console.warn('Cloudinary delete failed:', err.message)
  }
}

export default cloudinary
