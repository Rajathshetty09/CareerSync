import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import requestLogger from './middleware/requestLogger.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';
import env from './config/env.js';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/user/user.routes.js';
import resumeRoutes from './modules/resume/resume.routes.js';
import jobRoutes from './modules/jobs/job.routes.js';
import applicationRoutes from './modules/applications/application.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import automationRoutes from './modules/automation/automation.routes.js';

const app = express();

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Request Logging ─────────────────────────────────────────────────────────
app.use(requestLogger);

// ─── Global Rate Limiting ────────────────────────────────────────────────────
app.use(globalLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'CareerSync API is running', env: env.NODE_ENV });
});

// ─── Static Files (dev fallback: local resume/avatar uploads) ────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/v1/auth',  authRoutes);
app.use('/api/v1/users',   userRoutes);
app.use('/api/v1/resumes', resumeRoutes);
app.use('/api/v1/jobs',         jobRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/ai',           aiRoutes);
app.use('/api/v1/analytics',    analyticsRoutes);
app.use('/api/v1/admin',        adminRoutes);
app.use('/api/v1/automation',   automationRoutes);

// ─── 404 + Global Error Handler ──────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
