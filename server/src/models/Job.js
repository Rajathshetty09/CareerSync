import mongoose from 'mongoose';
import { JOB_SOURCES, EMPLOYMENT_TYPES } from '../constants/index.js';

const { Schema } = mongoose;

const jobSchema = new Schema(
  {
    title:       { type: String, required: true, trim: true },
    company:     { type: String, required: true, trim: true },
    location:    { type: String, trim: true, default: 'Remote' },
    source:      { type: String, enum: Object.values(JOB_SOURCES), required: true },
    externalId:  { type: String, trim: true },   // portal-specific job ID for dedup

    salary: {
      min:      { type: Number },
      max:      { type: Number },
      currency: { type: String, default: 'USD' },
      period:   { type: String, enum: ['hourly', 'monthly', 'yearly'], default: 'yearly' },
    },

    employmentType: {
      type: String,
      enum: [...Object.values(EMPLOYMENT_TYPES), ''],
      default: '',
    },

    experienceRequired: {
      min: { type: Number, default: 0 },
      max: { type: Number },
    },

    skills:      [{ type: String, trim: true, lowercase: true }],
    description: { type: String, trim: true },
    applyUrl:    { type: String, trim: true },
    postedAt:    { type: Date, default: Date.now },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
jobSchema.index({ title: 'text', company: 'text', description: 'text' });
jobSchema.index({ source: 1, externalId: 1 }, { unique: true, sparse: true });
jobSchema.index({ source: 1 });
jobSchema.index({ isActive: 1, postedAt: -1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ employmentType: 1 });

const Job = mongoose.model('Job', jobSchema);
export default Job;
