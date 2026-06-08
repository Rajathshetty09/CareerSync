import mongoose from 'mongoose';

const jobResultSchema = new mongoose.Schema(
  {
    jobId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    title:       String,
    company:     String,
    // 'external' = opened company website tab for manual apply
    status:      {
      type: String,
      enum: ['queued', 'applied', 'external', 'skipped', 'failed'],
      default: 'queued',
    },
    externalUrl: { type: String, default: null },   // company apply URL (external only)
    error:       { type: String, default: null },
    appliedAt:   { type: Date, default: null },
  },
  { _id: false },
);

// Separate array for jobs where the company website was opened in a new tab
const externalJobSchema = new mongoose.Schema(
  {
    title:      String,
    company:    String,
    applyUrl:   String,   // original Naukri job URL
    externalUrl: String,  // company website URL that was opened
    openedAt:   { type: Date, default: Date.now },
  },
  { _id: false },
);

const automationRunSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    portal: {
      type: String,
      required: true,
      enum: ['naukri', 'linkedin', 'indeed'],
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'cancelled'],
      default: 'running',
    },
    keywords:  { type: String, default: '' },
    location:  { type: String, default: '' },
    maxJobs:   { type: Number, default: 10 },
    freshness: { type: Number, default: 0 },

    jobResults:   [jobResultSchema],
    externalJobs: [externalJobSchema],  // tabs opened for manual apply

    /**
     * Fields captured from the user during apply (merged across all jobs in the run).
     * e.g. { relevantExperienceYears: 3, currentLocation: "Bangalore" }
     */
    capturedFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    summary: {
      total:    { type: Number, default: 0 },
      applied:  { type: Number, default: 0 },
      external: { type: Number, default: 0 },  // opened manually
      skipped:  { type: Number, default: 0 },
      failed:   { type: Number, default: 0 },
      step:     { type: String, default: 'Initialising…' },
    },

    startedAt:   { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    error:       { type: String, default: null },
  },
  { timestamps: true },
);

automationRunSchema.index({ userId: 1, createdAt: -1 });
automationRunSchema.index({ userId: 1, status: 1 });

export default mongoose.model('AutomationRun', automationRunSchema);
