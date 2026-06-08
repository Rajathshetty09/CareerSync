import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { runSkillGap, clearSkillGap } from '../../features/ai/aiSlice.js';
import { fetchJobs } from '../../features/jobs/jobsSlice.js';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { Brain, Sparkles, TrendingUp, BookOpen, AlertCircle } from 'lucide-react';

const PRIORITY_COLORS = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-green-100 text-green-700',
};

const SkillGap = () => {
  const dispatch = useDispatch();
  const { skillGap, skillGapStatus, error } = useSelector((s) => s.ai);
  const { listings: jobs } = useSelector((s) => s.jobs);
  const profileSkills = useSelector((s) => s.profile?.data?.skills ?? []);

  const [targetRole, setTargetRole] = useState('');
  const [jobId, setJobId] = useState('');

  useEffect(() => {
    if (!jobs.length) dispatch(fetchJobs({}));
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyse = () => {
    if (!targetRole.trim()) return;
    dispatch(clearSkillGap());
    dispatch(runSkillGap({ targetRole, jobId: jobId || undefined }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Brain size={24} className="text-primary-600" />
          Skill Gap Analysis
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Discover what skills you need to land your target role, and how to get there.
        </p>
      </div>

      {profileSkills.length === 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>
            Your profile has no skills listed. The analysis will be less accurate.{' '}
            <Link to="/profile" className="underline font-medium hover:text-amber-900">
              Add skills in your profile
            </Link>{' '}
            for better results.
          </span>
        </div>
      )}

      <Card>
        <Card.Body className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Role</label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Full Stack Engineer, ML Engineer…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Reference Job <span className="text-gray-400 font-normal">(optional — improves accuracy)</span>
            </label>
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">None — use role name only</option>
              {jobs.map((j) => <option key={j._id} value={j._id}>{j.title} — {j.company}</option>)}
            </select>
          </div>

          <Button
            onClick={handleAnalyse}
            disabled={!targetRole.trim()}
            loading={skillGapStatus === 'loading'}
            className="gap-2"
          >
            <Sparkles size={15} />
            {skillGapStatus === 'loading' ? 'Analysing…' : 'Analyse Gap'}
          </Button>
        </Card.Body>
      </Card>

      {skillGapStatus === 'failed' && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
      )}

      {skillGap && (
        <div className="space-y-4">
          {/* Readiness */}
          <Card>
            <Card.Body className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary-600">{skillGap.readinessScore}%</div>
                <div className="text-xs text-gray-500 mt-0.5">Readiness</div>
              </div>
              <div className="border-l border-gray-200 pl-4">
                <p className="font-medium text-gray-800 text-sm">Time to Ready</p>
                <p className="text-gray-600 text-sm">{skillGap.timeToReady || 'Varies by effort'}</p>
              </div>
            </Card.Body>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Strengths */}
            {skillGap.strengths?.length > 0 && (
              <Card>
                <Card.Header>
                  <h2 className="text-sm font-semibold text-green-700 flex items-center gap-1.5">
                    <TrendingUp size={15} />Your Strengths
                  </h2>
                </Card.Header>
                <Card.Body>
                  <div className="flex flex-wrap gap-1.5">
                    {skillGap.strengths.map((s) => (
                      <Badge key={s} className="bg-green-100 text-green-700">{s}</Badge>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Missing */}
            {skillGap.missingSkills?.length > 0 && (
              <Card>
                <Card.Header>
                  <h2 className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
                    <AlertCircle size={15} />Must Learn
                  </h2>
                </Card.Header>
                <Card.Body>
                  <div className="flex flex-wrap gap-1.5">
                    {skillGap.missingSkills.map((s) => (
                      <Badge key={s} className="bg-red-100 text-red-600">{s}</Badge>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}
          </div>

          {/* Learning path */}
          {skillGap.learningPath?.length > 0 && (
            <Card>
              <Card.Header>
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <BookOpen size={15} />Learning Path
                </h2>
              </Card.Header>
              <Card.Body>
                <div className="space-y-3">
                  {skillGap.learningPath.map((item, i) => (
                    <div key={i} className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-800">{item.skill}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[item.priority]}`}>
                            {item.priority}
                          </span>
                        </div>
                        {item.resources?.length > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">{item.resources.join(' · ')}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">~{item.estimatedWeeks}w</span>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default SkillGap;
