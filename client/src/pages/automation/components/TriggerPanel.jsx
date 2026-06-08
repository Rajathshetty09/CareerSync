import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { startAutoApply, resetTrigger } from '../../../features/automation/automationSlice.js';
import { fetchResumes } from '../../../features/resume/resumeSlice.js';
import { showToast } from '../../../features/ui/uiSlice.js';
import Button from '../../../components/ui/Button.jsx';
import Card from '../../../components/ui/Card.jsx';
import { Zap, CheckCircle2, AlertCircle } from 'lucide-react';

const PORTALS = [
  {
    id: 'naukri',
    label: 'Naukri',
    logo: 'N',
    logoColor: 'text-[#FF7555]',
    description: 'Searches Naukri and applies directly. Opens company-website jobs in separate tabs for you to apply manually.',
    placeholder: 'e.g. React Developer, Node.js, Full Stack',
    locationPlaceholder: 'Bangalore, Mumbai… (leave blank for any)',
    resumeLabel: 'Resume (for CareerSync record — Naukri uses your saved profile)',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    logo: 'in',
    logoColor: 'text-[#0A66C2]',
    description: 'Searches LinkedIn Easy Apply jobs only — every result has the in-app apply modal, no external redirects.',
    placeholder: 'e.g. Software Engineer, Product Manager',
    locationPlaceholder: 'Bangalore, India… (leave blank for worldwide)',
    resumeLabel: 'Resume (for CareerSync record — LinkedIn uses your uploaded profile resume)',
  },
];

const TriggerPanel = ({ onRunStarted }) => {
  const dispatch = useDispatch();
  const { credentials, triggerStatus, triggerError, lastTriggered } = useSelector((s) => s.automation);
  const { resumes } = useSelector((s) => s.resume);

  const [portal, setPortal] = useState('naukri');
  const [form, setForm] = useState({ keywords: '', location: '', resumeId: '', maxJobs: 10, freshness: 0 });

  const portalCfg  = PORTALS.find((p) => p.id === portal);
  const hasCreds   = !!credentials[portal];

  useEffect(() => {
    if (!resumes.length) dispatch(fetchResumes());
    return () => dispatch(resetTrigger());
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select default resume
  useEffect(() => {
    if (resumes.length && !form.resumeId) {
      const def = resumes.find((r) => r.isDefault) || resumes[0];
      setForm((f) => ({ ...f, resumeId: def._id }));
    }
  }, [resumes]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTrigger = async () => {
    if (!form.keywords || !form.resumeId) return;
    const result = await dispatch(startAutoApply({
      portal,
      keywords:  form.keywords,
      location:  form.location,
      resumeId:  form.resumeId,
      maxJobs:   form.maxJobs,
      freshness: form.freshness,
    }));
    if (startAutoApply.fulfilled.match(result)) {
      dispatch(showToast({ message: `${portalCfg.label} automation started — watch the browser window`, type: 'success' }));
      onRunStarted?.();
    }
  };

  const isLoading = triggerStatus === 'loading';

  return (
    <Card>
      <Card.Header>
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Zap size={16} className="text-primary-600" />
          Start Auto-Apply
        </h2>
      </Card.Header>

      <Card.Body className="space-y-4">
        {/* Portal tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {PORTALS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPortal(p.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                portal === p.id
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className={`font-bold text-sm leading-none ${p.logoColor}`}>{p.logo}</span>
              {p.label}
            </button>
          ))}
        </div>

        {/* Portal description */}
        <p className="text-xs text-gray-500">{portalCfg.description}</p>

        {/* No credentials warning */}
        {!hasCreds && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            Set up your <strong>{portalCfg.label}</strong> credentials first (Step 1 above) before triggering automation.
          </div>
        )}

        {/* Keywords */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Job Keywords <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.keywords}
            onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
            placeholder={portalCfg.placeholder}
            disabled={!hasCreds}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder={portalCfg.locationPlaceholder}
            disabled={!hasCreds}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Job freshness */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Job Freshness</label>
            <select
              value={form.freshness}
              onChange={(e) => setForm((f) => ({ ...f, freshness: Number(e.target.value) }))}
              disabled={!hasCreds}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
            >
              <option value={0}>Any time</option>
              <option value={1}>Past 24 hours</option>
              <option value={3}>Past 3 days</option>
              <option value={7}>Past 7 days</option>
              <option value={15}>Past 15 days</option>
              <option value={30}>Past month</option>
            </select>
          </div>

          {/* Max jobs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Applications</label>
            <select
              value={form.maxJobs}
              onChange={(e) => setForm((f) => ({ ...f, maxJobs: Number(e.target.value) }))}
              disabled={!hasCreds}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
            >
              {[5, 10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>{n} jobs</option>
              ))}
            </select>
          </div>
        </div>

        {/* Resume */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {portalCfg.resumeLabel}
          </label>
          <select
            value={form.resumeId}
            onChange={(e) => setForm((f) => ({ ...f, resumeId: e.target.value }))}
            disabled={!hasCreds}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
          >
            <option value="">Select a resume…</option>
            {resumes.map((r) => (
              <option key={r._id} value={r._id}>{r.fileName}{r.isDefault ? ' (default)' : ''}</option>
            ))}
          </select>
        </div>

        {triggerError && (
          <p className="text-xs text-red-600 flex items-start gap-1">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />{triggerError}
          </p>
        )}

        {triggerStatus === 'succeeded' && lastTriggered && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Automation started!</p>
              <p className="text-xs mt-0.5">A Chromium browser window is opening. Watch it for progress — the bot will pause at each step for you to answer screening questions.</p>
            </div>
          </div>
        )}

        <Button
          onClick={handleTrigger}
          loading={isLoading}
          disabled={!hasCreds || !form.keywords || !form.resumeId}
          className="w-full gap-2"
        >
          <Zap size={15} />
          {isLoading ? 'Starting…' : `Start Auto-Apply on ${portalCfg.label}`}
        </Button>

        <p className="text-xs text-gray-400 text-center">
          Browser stays open after automation so you can handle any manual steps.
        </p>
      </Card.Body>
    </Card>
  );
};

export default TriggerPanel;
