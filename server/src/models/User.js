import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES } from '../constants/index.js';

const { Schema } = mongoose;

const experienceSchema = new Schema(
  {
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    from: { type: Date, required: true },
    to: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String, trim: true, maxlength: 500 },
  },
  { _id: true },
);

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },

    // ─── Email Verification ──────────────────────────────────────────
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    // ─── Auth Tokens ─────────────────────────────────────────────────
    // Stores SHA-256(jti) of the active refresh token — enables revocation
    refreshTokenHash: { type: String, select: false },

    // ─── Profile ─────────────────────────────────────────────────────
    profile: {
      bio: { type: String, trim: true, maxlength: 300 },
      location: { type: String, trim: true },
      phone: { type: String, trim: true },
      website: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      github: { type: String, trim: true },
      avatar: { type: String },
    },

    skills: [{ type: String, trim: true, lowercase: true }],

    experience: [experienceSchema],

    preferences: {
      jobTypes: [{ type: String }],
      locations: [{ type: String }],
      salaryMin: { type: Number, default: 0 },
      remote: { type: Boolean, default: false },
      notifications: {
        email: { type: Boolean, default: true },
        jobAlerts: { type: Boolean, default: true },
        applicationUpdates: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ emailVerificationToken: 1 }, { sparse: true });

// ─── Pre-save: hash password if modified ──────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ─── Instance method: compare password ────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Prevent password from leaking in JSON output ────────────────────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokenHash;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;
