import mongoose from 'mongoose';

const { Schema } = mongoose;

const resumeSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true, // Cloudinary public_id — needed for deletion
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number, // bytes
      default: 0,
    },
    extractedText: {
      type: String,
      select: false, // excluded from list queries — only fetched for preview / AI
    },
    extractedSkills: [
      { type: String, trim: true, lowercase: true },
    ],
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
resumeSchema.index({ userId: 1, createdAt: -1 });
resumeSchema.index({ userId: 1, isDefault: 1 });

const Resume = mongoose.model('Resume', resumeSchema);
export default Resume;
