import crypto from 'crypto';
import User from '../../models/User.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/token.js';
import { sendVerificationEmail } from '../../services/email.service.js';
import ApiError from '../../utils/ApiError.js';
import env from '../../config/env.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  profile: user.profile,
  skills: user.skills,
  preferences: user.preferences,
  createdAt: user.createdAt,
});

// ─── Register ─────────────────────────────────────────────────────────────────
export const registerService = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  // In development without SMTP, auto-verify so users can log in immediately
  const devAutoVerify = env.NODE_ENV === 'development' && !env.SMTP_HOST;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const user = await User.create({
    name,
    email,
    password,
    isEmailVerified: devAutoVerify,
    emailVerificationToken: devAutoVerify ? undefined : hashToken(rawToken),
    emailVerificationExpires: devAutoVerify ? undefined : Date.now() + 24 * 60 * 60 * 1000,
  });

  if (!devAutoVerify) {
    const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${rawToken}`;
    await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl });
  }

  return {
    message: devAutoVerify
      ? 'Account created. You can now sign in.'
      : 'Account created. Please check your email to verify your account.',
  };
};

// ─── Login ────────────────────────────────────────────────────────────────────
export const loginService = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password +refreshTokenHash');
  if (!user) throw new ApiError(401, 'Invalid email or password');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, 'Invalid email or password');

  if (!user.isEmailVerified) {
    throw new ApiError(403, 'Please verify your email before signing in', ['email_unverified']);
  }

  // Generate access token + refresh token with unique jti
  const jti = crypto.randomBytes(32).toString('hex');
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken({ sub: user._id.toString(), jti });

  user.refreshTokenHash = hashToken(jti);
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken, user: sanitizeUser(user) };
};

// ─── Refresh Token ────────────────────────────────────────────────────────────
export const refreshTokenService = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) throw new ApiError(401, 'Refresh token required');

  let decoded;
  try {
    decoded = verifyRefreshToken(incomingRefreshToken);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.sub).select('+refreshTokenHash');
  if (!user) throw new ApiError(401, 'User not found');

  // Verify jti matches what we stored — detect token reuse or revocation
  if (!user.refreshTokenHash || user.refreshTokenHash !== hashToken(decoded.jti)) {
    // Possible token theft — clear refresh token to force full re-login
    await User.findByIdAndUpdate(decoded.sub, { $unset: { refreshTokenHash: 1 } });
    throw new ApiError(401, 'Refresh token has been revoked. Please sign in again.');
  }

  // Rotate: new jti, new tokens
  const newJti = crypto.randomBytes(32).toString('hex');
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const newRefreshToken = signRefreshToken({ sub: user._id.toString(), jti: newJti });

  user.refreshTokenHash = hashToken(newJti);
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken: newRefreshToken, user: sanitizeUser(user) };
};

// ─── Logout ───────────────────────────────────────────────────────────────────
export const logoutService = async (userId) => {
  await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });
};

// ─── Verify Email ─────────────────────────────────────────────────────────────
export const verifyEmailService = async (rawToken) => {
  const hashedToken = hashToken(rawToken);

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) throw new ApiError(400, 'Verification link is invalid or has expired');

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  return { message: 'Email verified successfully. You can now sign in.' };
};

// ─── Resend Verification Email ─────────────────────────────────────────────────
export const resendVerificationService = async (email) => {
  const user = await User.findOne({ email }).select('+emailVerificationToken +emailVerificationExpires');

  // Always respond with success to prevent user enumeration
  if (!user || user.isEmailVerified) {
    return { message: 'If your email is registered and unverified, a new link has been sent.' };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = hashToken(rawToken);
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${rawToken}`;
  await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl });

  return { message: 'If your email is registered and unverified, a new link has been sent.' };
};
