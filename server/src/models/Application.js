import mongoose from 'mongoose';
import { APPLICATION_STATUS } from '../constants/index.js';

const { Schema } = mongoose;

const applicationSchema = new Schema(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User',   required: true },
    jobId:       { type: Schema.Types.ObjectId, ref: 'Job',    required: true },
    resumeId:    { type: Schema.Types.ObjectId, ref: 'Resume' },
    status:      {
      type: String,
      enum: Object.values(APPLICATION_STATUS),
      default: APPLICATION_STATUS.PENDING,
    },
    matchScore:  { type: Number, min: 0, max: 100 },
    coverLetter: { type: String },
    notes:       { type: String, trim: true },
    appliedAt:   { type: Date },
    source:      { type: String, enum: ['manual', 'auto'], default: 'manual' },
  },
  { timestamps: true },
);

applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });
applicationSchema.index({ userId: 1, status: 1 });
applicationSchema.index({ userId: 1, createdAt: -1 });

const Application = mongoose.model('Application', applicationSchema);
export default Application;
