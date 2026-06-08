import mongoose from 'mongoose';

const automationCredentialsSchema = new mongoose.Schema(
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
      lowercase: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    // AES-256-GCM encrypted: JSON { iv, tag, ciphertext } — all hex
    encryptedPassword: {
      type: String,
      required: true,
    },
    // User-configured base preferences (set in UI)
    preferences: {
      // Naukri
      noticePeriodDays:  { type: Number, default: 30 },
      currentCtcLakhs:   { type: Number, default: 0 },
      expectedCtcLakhs:  { type: Number, default: 0 },
      coverNote:         { type: String, default: '', maxlength: 1000 },
      // LinkedIn
      phoneNumber:       { type: String, default: '' },
      yearsOfExperience: { type: Number, default: 0 },
    },
    /**
     * Fields learned from watching the user fill in apply forms.
     * Stored as a flexible key→value map (Mixed) so any Naukri chatbot
     * field can be captured and reused.
     *
     * Well-known keys (filled automatically):
     *   relevantExperienceYears  — e.g. 3
     *   totalExperienceYears     — e.g. 5
     *   currentLocation          — e.g. "Bangalore"
     *   annualSalary             — e.g. "5"
     *
     * Any other field label captured from the form goes in here too,
     * keyed by a sanitised version of the field placeholder/name.
     */
    capturedFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isActive: { type: Boolean, default: true },
    lastVerifiedAt: { type: Date, default: null },
    lastLoginError: { type: String, default: null },
  },
  { timestamps: true },
);

automationCredentialsSchema.index({ userId: 1, portal: 1 }, { unique: true });

export default mongoose.model('AutomationCredentials', automationCredentialsSchema);
