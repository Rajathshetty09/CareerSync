import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import ApiError from '../../utils/ApiError.js';
import Resume from '../../models/Resume.js';
import Job from '../../models/Job.js';
import User from '../../models/User.js';
import { analyseResume, generateCoverLetter, analyseSkillGap } from '../../services/ai.service.js';

export const analyseResumeController = asyncHandler(async (req, res) => {
  const { resumeId, jobId } = req.body;

  const [resume, job] = await Promise.all([
    Resume.findOne({ _id: resumeId, userId: req.user.id }).select('+extractedText'),
    Job.findById(jobId),
  ]);

  if (!resume) throw new ApiError(404, 'Resume not found');
  if (!job) throw new ApiError(404, 'Job not found');
  if (!resume.extractedText) throw new ApiError(400, 'Resume text could not be extracted — re-upload the PDF');

  const result = await analyseResume({
    resumeText: resume.extractedText,
    jobTitle: job.title,
    jobDescription: job.description || job.title,
    jobSkills: job.skills,
  });

  res.json(new ApiResponse(200, { analysis: result }, 'Analysis complete'));
});

export const generateCoverLetterController = asyncHandler(async (req, res) => {
  const { resumeId, jobId, tone } = req.body;

  const [resume, job, user] = await Promise.all([
    Resume.findOne({ _id: resumeId, userId: req.user.id }).select('+extractedText'),
    Job.findById(jobId),
    User.findById(req.user.id).select('name profile'),
  ]);

  if (!resume) throw new ApiError(404, 'Resume not found');
  if (!job) throw new ApiError(404, 'Job not found');

  const resumeSummary = resume.extractedText?.slice(0, 2000) || resume.extractedSkills.join(', ');

  const result = await generateCoverLetter({
    userName: user.name,
    jobTitle: job.title,
    company: job.company,
    jobDescription: job.description || '',
    resumeSummary,
    tone,
  });

  res.json(new ApiResponse(200, { coverLetter: result.coverLetter, cached: result.cached }, 'Cover letter generated'));
});

export const analyseSkillGapController = asyncHandler(async (req, res) => {
  const { targetRole, jobId } = req.body;

  const user = await User.findById(req.user.id).select('skills');

  let jobDescription = '';
  if (jobId) {
    const job = await Job.findById(jobId).select('description');
    jobDescription = job?.description || '';
  }

  const result = await analyseSkillGap({
    currentSkills: user.skills || [],
    targetRole,
    jobDescription,
  });

  res.json(new ApiResponse(200, { gap: result }, 'Skill gap analysis complete'));
});
