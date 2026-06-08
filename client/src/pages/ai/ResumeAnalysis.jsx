import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { runResumeAnalysis, clearAnalysis } from '../../features/ai/aiSlice.js';
import { fetchResumes } from '../../features/resume/resumeSlice.js';
import { fetchJobs } from '../../features/jobs/jobsSlice.js';
import ScoreGauge from './components/ScoreGauge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { Sparkles, CheckCircle2, XCircle, TrendingUp, AlertCircle } from 'lucide-react';

const Section = ({ icon: Icon, title, items, color }) => {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className={`flex items-center gap-2 text-sm font-semibold mb-2 ${color}`}>
        <Icon size={15} />{title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="mt-0.5 shrink-0">•</span>{item}
          </li>
        ))}
      </ul>
    </div>
  );
};

const ResumeAnalysis = () => {
  const dispatch = useDispatch();
  const { analysis, analysisStatus, error } = useSelector((s) => s.ai);
  const { resumes } = useSelector((s) => s.resume);
  const { listings: jobs } = useSelector((s) => s.jobs);

  const [resumeId, setResumeId] = useState('');
  const [jobId, setJobId] = useState('');

  useEffect(() => {
    if (!resumes.length) dispatch(fetchResumes());
    if (!jobs.length) dispatch(fetchJobs({}));
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyse = () => {
    if (!resumeId || !jobId) return;
    dispatch(clearAnalysis());
    dispatch(runResumeAnalysis({ resumeId, jobId }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles size={24} className="text-primary-600" />
          Resume Analysis
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          AI-powered match analysis — see exactly how well your resume fits a job.
        </p>
      </div>

      {/* Selectors */}
      <Card>
        <Card.Body className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Resume</label>
              <select
                value={resumeId}
                onChange={(e) => setResumeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select a resume…</option>
                {resumes.map((r) => (
                  <option key={r._id} value={r._id}>{r.fileName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Job to Match</label>
              <select
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select a job…</option>
                {jobs.map((j) => (
                  <option key={j._id} value={j._id}>{j.title} — {j.company}</option>
                ))}
              </select>
            </div>
          </div>

          <Button
            onClick={handleAnalyse}
            disabled={!resumeId || !jobId}
            loading={analysisStatus === 'loading'}
            className="gap-2"
          >
            <Sparkles size={15} />
            {analysisStatus === 'loading' ? 'Analysing…' : 'Analyse Match'}
          </Button>
        </Card.Body>
      </Card>

      {/* Error */}
      {analysisStatus === 'failed' && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Results */}
      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Score */}
          <div className="lg:col-span-1">
            <ScoreGauge score={analysis.matchScore} recommendation={analysis.recommendation} />
            {analysis.experienceAlignment && (
              <p className="mt-3 text-xs text-center text-gray-500 italic">
                {analysis.experienceAlignment}
              </p>
            )}
          </div>

          {/* Detail */}
          <div className="lg:col-span-2 space-y-5">
            {analysis.summary && (
              <Card>
                <Card.Body>
                  <p className="text-sm text-gray-700 leading-relaxed">{analysis.summary}</p>
                  {analysis.fallback && (
                    <p className="text-xs text-amber-600 mt-2">
                      ⚠ Keyword-based result only.{' '}
                      {analysis.fallbackReason
                        ? analysis.fallbackReason
                        : 'Add OPENAI_API_KEY to your .env for detailed AI analysis.'}
                    </p>
                  )}
                </Card.Body>
              </Card>
            )}

            <Card>
              <Card.Body className="space-y-5">
                {/* Skills */}
                {analysis.matchedSkills?.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-green-700 mb-2">
                      <CheckCircle2 size={15} />Matched Skills
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.matchedSkills.map((s) => (
                        <Badge key={s} className="bg-green-100 text-green-700">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.missingSkills?.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-red-600 mb-2">
                      <XCircle size={15} />Missing Skills
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.missingSkills.map((s) => (
                        <Badge key={s} className="bg-red-100 text-red-600">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Section icon={TrendingUp} title="Strengths" items={analysis.strengths} color="text-blue-700" />
                <Section icon={AlertCircle} title="Improvements" items={analysis.improvements} color="text-amber-600" />
              </Card.Body>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeAnalysis;
