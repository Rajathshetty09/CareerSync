import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { runCoverLetter, clearCoverLetter } from '../../features/ai/aiSlice.js';
import { showToast } from '../../features/ui/uiSlice.js';
import { fetchResumes } from '../../features/resume/resumeSlice.js';
import { fetchJobs } from '../../features/jobs/jobsSlice.js';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { FileText, Copy, RefreshCw, Sparkles } from 'lucide-react';

const TONES = [
  { value: 'professional', label: 'Professional', desc: 'Formal & polished' },
  { value: 'enthusiastic', label: 'Enthusiastic', desc: 'Warm & energetic' },
  { value: 'concise',      label: 'Concise',      desc: 'Direct & brief' },
];

const CoverLetterGenerator = () => {
  const dispatch = useDispatch();
  const { coverLetter, coverLetterStatus, error } = useSelector((s) => s.ai);
  const { resumes } = useSelector((s) => s.resume);
  const { listings: jobs } = useSelector((s) => s.jobs);

  const [resumeId, setResumeId] = useState('');
  const [jobId, setJobId] = useState('');
  const [tone, setTone] = useState('professional');

  useEffect(() => {
    if (!resumes.length) dispatch(fetchResumes());
    if (!jobs.length) dispatch(fetchJobs({}));
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = () => {
    if (!resumeId || !jobId) return;
    dispatch(clearCoverLetter());
    dispatch(runCoverLetter({ resumeId, jobId, tone }));
  };

  const handleCopy = () => {
    if (!coverLetter) return;
    navigator.clipboard.writeText(coverLetter);
    dispatch(showToast({ message: 'Copied to clipboard', type: 'success' }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText size={24} className="text-primary-600" />
          Cover Letter Generator
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate a tailored cover letter from your resume and the job description.
        </p>
      </div>

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
                {resumes.map((r) => <option key={r._id} value={r._id}>{r.fileName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Job</label>
              <select
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select a job…</option>
                {jobs.map((j) => <option key={j._id} value={j._id}>{j.title} — {j.company}</option>)}
              </select>
            </div>
          </div>

          {/* Tone selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
            <div className="flex gap-2">
              {TONES.map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTone(value)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                    tone === value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="font-medium">{label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!resumeId || !jobId}
            loading={coverLetterStatus === 'loading'}
            className="gap-2"
          >
            <Sparkles size={15} />
            {coverLetterStatus === 'loading' ? 'Generating…' : 'Generate Cover Letter'}
          </Button>
        </Card.Body>
      </Card>

      {coverLetterStatus === 'failed' && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
      )}

      {coverLetter && (
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Generated Cover Letter</h2>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="gap-1.5" onClick={handleCopy}>
                  <Copy size={13} />Copy
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleGenerate}>
                  <RefreshCw size={13} />Regenerate
                </Button>
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
              {coverLetter}
            </pre>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default CoverLetterGenerator;
