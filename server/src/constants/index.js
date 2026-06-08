export const USER_ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

export const APPLICATION_STATUS = Object.freeze({
  PENDING: 'pending',
  APPLIED: 'applied',
  INTERVIEWING: 'interviewing',
  OFFERED: 'offered',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
});

export const JOB_SOURCES = Object.freeze({
  NAUKRI:    'naukri',
  LINKEDIN:  'linkedin',
  INDEED:    'indeed',
  FOUNDIT:   'foundit',
  WELLFOUND: 'wellfound',
  ADZUNA:    'adzuna',
  JOOBLE:    'jooble',
  REMOTEOK:  'remoteok',
  ARBEITNOW: 'arbeitnow',
  HIMALAYAS: 'himalayas',
  JOBICY:    'jobicy',
  THEMUSE:   'themuse',
  FINDWORK:  'findwork',
  REED:      'reed',
  MANUAL:    'manual',
});

export const EMPLOYMENT_TYPES = Object.freeze({
  FULL_TIME: 'full-time',
  PART_TIME: 'part-time',
  CONTRACT: 'contract',
  INTERNSHIP: 'internship',
  FREELANCE: 'freelance',
});

export const NOTIFICATION_TYPES = Object.freeze({
  JOB_MATCH: 'job_match',
  APPLICATION_UPDATE: 'application_update',
  JOB_ALERT: 'job_alert',
  SYSTEM: 'system',
  APPLICATION_SUBMITTED: 'application_submitted',
  APPLICATION_STATUS_CHANGED: 'application_status_changed',
  NEW_JOB_MATCH: 'new_job_match',
  RESUME_ANALYSIS_COMPLETE: 'resume_analysis_complete',
});

export const QUEUE_NAMES = Object.freeze({
  JOB_DISCOVERY: 'job-discovery',
  RESUME_ANALYSIS: 'resume-analysis',
  AUTO_APPLY: 'auto-apply',
  NOTIFICATION: 'notification',
});

export const MAX_RESUMES_PER_USER = 5;

export const COOKIE_OPTIONS = Object.freeze({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
