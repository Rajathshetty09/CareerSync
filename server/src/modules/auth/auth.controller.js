import asyncHandler from '../../utils/asyncHandler.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import { COOKIE_OPTIONS } from '../../constants/index.js';
import { verifyRefreshToken } from '../../utils/token.js';
import {
  registerService,
  loginService,
  refreshTokenService,
  logoutService,
  verifyEmailService,
  resendVerificationService,
} from './auth.service.js';

// POST /api/v1/auth/register
export const register = asyncHandler(async (req, res) => {
  const result = await registerService(req.body);
  res.status(201).json(new ApiResponse(201, null, result.message));
});

// POST /api/v1/auth/login
export const login = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user } = await loginService(req.body);
  res
    .cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
    .status(200)
    .json(new ApiResponse(200, { accessToken, user }, 'Login successful'));
});

// POST /api/v1/auth/refresh-token
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  const { accessToken, refreshToken: newRefreshToken, user } = await refreshTokenService(token);
  res
    .cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS)
    .status(200)
    .json(new ApiResponse(200, { accessToken, user }, 'Token refreshed'));
});

// POST /api/v1/auth/logout
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      await logoutService(decoded.sub);
    } catch {
      // Token invalid or expired — still clear the cookie
    }
  }

  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  };

  res
    .clearCookie('refreshToken', clearOptions)
    .status(200)
    .json(new ApiResponse(200, null, 'Logged out successfully'));
});

// GET /api/v1/auth/verify-email?token=
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) throw new ApiError(400, 'Verification token is required');

  const result = await verifyEmailService(token);
  res.status(200).json(new ApiResponse(200, null, result.message));
});

// POST /api/v1/auth/resend-verification
export const resendVerification = asyncHandler(async (req, res) => {
  const result = await resendVerificationService(req.body.email);
  res.status(200).json(new ApiResponse(200, null, result.message));
});
