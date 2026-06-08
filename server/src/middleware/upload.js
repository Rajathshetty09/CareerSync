import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Local uploads dir (dev fallback when Cloudinary isn't configured) ────────
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const cloudinaryReady = !!(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
);

// ─── Multer ───────────────────────────────────────────────────────────────────
const storage = multer.memoryStorage();

const imageFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new ApiError(400, 'Only image files are allowed'), false);
};

const documentFilter = (_req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new ApiError(400, 'Only PDF files are allowed'), false);
};

export const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('avatar');

export const uploadDocument = multer({
  storage,
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('resume');

// ─── Cloudinary upload (only called when credentials are present) ─────────────
export const streamToCloudinary = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(new ApiError(500, `Cloudinary upload failed: ${error.message}`));
      else resolve(result);
    });
    stream.end(buffer);
  });

/**
 * Upload a file buffer — uses Cloudinary when credentials are set,
 * otherwise writes to local disk (dev / no-credentials fallback).
 * Returns { secure_url, public_id } to match the Cloudinary response shape.
 */
export const uploadFile = async (buffer, options = {}) => {
  if (cloudinaryReady) {
    return streamToCloudinary(buffer, options);
  }

  // Local fallback: write to uploads/ and return a localhost URL
  const filename = `${options.public_id?.replace(/\//g, '_') || Date.now()}.${options.format || 'bin'}`;
  const filepath = path.join(uploadsDir, filename);
  fs.writeFileSync(filepath, buffer);

  const baseUrl = `http://localhost:${env.PORT || 5000}`;
  return {
    secure_url: `${baseUrl}/uploads/${filename}`,
    public_id: filename,
  };
};

/**
 * Delete a file — no-op when Cloudinary isn't configured.
 * Fails silently so deletion never breaks user-facing flows.
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!cloudinaryReady) {
    // Delete local file if it exists
    try {
      const filepath = path.join(uploadsDir, publicId);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    } catch { /* ignore */ }
    return;
  }
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch { /* ignore */ }
};
