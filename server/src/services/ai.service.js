import crypto from 'crypto';
import OpenAI from 'openai';
import env from '../config/env.js';
import redis from '../config/redis.js';
import { extractSkills } from '../utils/skillExtractor.js';
import logger from '../utils/logger.js';

const CACHE_TTL = 24 * 60 * 60; // 24 hours

const getClient = () => {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured. Add OPENAI_API_KEY to your .env file.');
  }
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
};

function friendlyOpenAIError(err) {
  const msg = err.message || '';
  if (err.status === 429 || msg.includes('quota') || msg.includes('exceeded'))
    return 'OpenAI quota exceeded. Please check your billing at platform.openai.com or add credits.';
  if (err.status === 401 || msg.includes('Incorrect API key') || msg.includes('invalid_api_key'))
    return 'Invalid OpenAI API key. Update OPENAI_API_KEY in your .env file.';
  if (err.status === 503 || msg.includes('overloaded'))
    return 'OpenAI is currently overloaded. Please try again in a few seconds.';
  return `AI service error: ${msg}`;
}

const cacheKey = (prefix, ...parts) =>
  `ai:${prefix}:${crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)}`;

const getCached = async (key) => {
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const setCache = async (key, value) => {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', CACHE_TTL);
  } catch { /* non-fatal */ }
};

// ─── Resume Analysis ──────────────────────────────────────────────────────────

export const analyseResume = async ({ resumeText, jobTitle, jobDescription, jobSkills = [] }) => {
  const key = cacheKey('analyse', resumeText.slice(0, 200), jobTitle, jobDescription.slice(0, 200));
  const cached = await getCached(key);
  if (cached) return { ...cached, cached: true };

  if (!env.OPENAI_API_KEY) {
    return keywordFallback(resumeText, jobSkills, null);
  }

  const openai = getClient();

  const prompt = `You are an expert ATS (Applicant Tracking System) and technical recruiter.

Analyse this resume against the job posting and respond with a JSON object only — no markdown, no explanation.

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

RESUME:
${resumeText.slice(0, 4000)}

Return exactly this JSON structure:
{
  "matchScore": <integer 0-100>,
  "recommendation": <"strong_apply" | "apply" | "consider" | "skip">,
  "summary": <2-3 sentence overall assessment>,
  "matchedSkills": [<skills present in both resume and job>],
  "missingSkills": [<important skills the resume lacks>],
  "strengths": [<3-5 specific strengths relevant to this role>],
  "improvements": [<3-5 actionable resume improvements for this role>],
  "experienceAlignment": <brief note on experience level fit>
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1000,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    await setCache(key, result);
    logger.info(`[AI] Resume analysis complete — score: ${result.matchScore}`);
    return result;
  } catch (err) {
    const reason = friendlyOpenAIError(err);
    logger.warn(`[AI] analyseResume OpenAI failed — ${reason}`);
    return keywordFallback(resumeText, jobSkills, reason);
  }
};

// ─── Cover Letter Generation ──────────────────────────────────────────────────

export const generateCoverLetter = async ({
  userName,
  jobTitle,
  company,
  jobDescription,
  resumeSummary,
  tone = 'professional',
}) => {
  const key = cacheKey('cover', userName, jobTitle, company, tone, resumeSummary.slice(0, 200));
  const cached = await getCached(key);
  if (cached) return { ...cached, cached: true };

  if (!env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is required for cover letter generation.');
  }

  const openai = getClient();

  const toneGuide = {
    professional: 'formal, confident, and polished',
    enthusiastic: 'warm, energetic, and genuinely excited about the role',
    concise: 'direct, brief, and results-focused — no filler sentences',
  };

  const prompt = `You are an expert career coach who writes compelling cover letters.

Write a cover letter for ${userName} applying to the ${jobTitle} position at ${company}.
Tone: ${toneGuide[tone] || toneGuide.professional}

JOB DESCRIPTION (excerpt):
${jobDescription.slice(0, 2000)}

CANDIDATE BACKGROUND (from resume):
${resumeSummary.slice(0, 1500)}

Guidelines:
- 3-4 paragraphs, under 350 words
- Do NOT use generic phrases like "I am excited to apply" or "I believe I am a great fit"
- Reference specific skills and experiences that directly match the role
- End with a clear call to action

Respond with JSON only: { "coverLetter": "<the full cover letter text>" }`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 800,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    await setCache(key, result);
    logger.info(`[AI] Cover letter generated for ${userName} → ${jobTitle} at ${company}`);
    return result;
  } catch (err) {
    logger.error(`[AI] generateCoverLetter failed: ${err.message}`);
    throw new Error(friendlyOpenAIError(err));
  }
};

// ─── Skill Gap Analysis ───────────────────────────────────────────────────────

export const analyseSkillGap = async ({ currentSkills, targetRole, jobDescription = '' }) => {
  const key = cacheKey('skillgap', currentSkills.sort().join(','), targetRole);
  const cached = await getCached(key);
  if (cached) return { ...cached, cached: true };

  if (!env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is required for skill gap analysis.');
  }

  const openai = getClient();

  const prompt = `You are a technical career advisor helping software professionals grow.

Analyse the skill gap between the candidate's current skills and the target role.

TARGET ROLE: ${targetRole}
${jobDescription ? `ROLE DESCRIPTION:\n${jobDescription.slice(0, 1500)}\n` : ''}
CURRENT SKILLS: ${currentSkills.join(', ')}

Respond with JSON only:
{
  "missingSkills": [<skills needed for the role that the candidate lacks, prioritised>],
  "niceToHaveSkills": [<skills that would strengthen candidacy but aren't blockers>],
  "strengths": [<current skills that are highly relevant to this role>],
  "learningPath": [
    { "skill": <skill name>, "priority": <"high"|"medium"|"low">, "estimatedWeeks": <integer>, "resources": [<1-2 free resource names or types>] }
  ],
  "readinessScore": <integer 0-100 — how ready is the candidate today>,
  "timeToReady": <e.g. "3-4 months with focused learning">
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 1200,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    await setCache(key, result);
    logger.info(`[AI] Skill gap analysis done — readiness: ${result.readinessScore}%`);
    return result;
  } catch (err) {
    logger.error(`[AI] analyseSkillGap failed: ${err.message}`);
    throw new Error(friendlyOpenAIError(err));
  }
};

// ─── Keyword fallback (when AI is unavailable) ────────────────────────────────

function keywordFallback(resumeText, jobSkills, errorReason = null) {
  const resumeSkills = new Set(extractSkills(resumeText).map((s) => s.toLowerCase()));
  const jSkills = jobSkills.map((s) => s.toLowerCase());
  const matched = jSkills.filter((s) => resumeSkills.has(s));
  const missing = jSkills.filter((s) => !resumeSkills.has(s));
  const matchScore = jSkills.length > 0 ? Math.round((matched.length / jSkills.length) * 100) : 0;

  const summaryNote = errorReason
    ? `Keyword-based analysis only (AI unavailable: ${errorReason})`
    : 'Keyword-based analysis only (no OpenAI API key configured).';

  const improvementNote = errorReason
    ? `AI analysis unavailable: ${errorReason}`
    : 'Add OPENAI_API_KEY to your .env for detailed AI analysis';

  return {
    matchScore,
    recommendation: matchScore >= 70 ? 'apply' : matchScore >= 40 ? 'consider' : 'skip',
    summary: `${summaryNote} ${matched.length} of ${jSkills.length} required skills matched.`,
    matchedSkills: matched,
    missingSkills: missing,
    strengths: [],
    improvements: [improvementNote],
    experienceAlignment: 'Unavailable without AI analysis',
    fallback: true,
    fallbackReason: errorReason,
  };
}
