import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRunHistory, cancelAutomationRun } from '../../../features/automation/automationSlice.js';
import { showToast } from '../../../features/ui/uiSlice.js';
import * as automationApi from '../../../api/automationApi.js';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import { timeAgo } from '../../../utils/formatDate.js';
import {
  ChevronDown, ChevronUp, RefreshCw, XCircle, CheckCircle2,
  AlertCircle, Loader2, Bot, ExternalLink, Brain,
} from 'lucide-react';

// ─── Config ───────────────────────────────────────────────────────────────────

const POLL_INTERVAL = 3000; // ms

const RUN_STATUS = {
  running:   { color: 'bg-blue-100 text-blue-700',   icon: <Loader2 size={11} className="animate-spin" />, label: 'Running' },
  completed: { color: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={11} />,                     label: 'Completed' },
  failed:    { color: 'bg-red-100 text-red-600',     icon: <XCircle size={11} />,                          label: 'Failed' },
  cancelled: { color: 'bg-gray-100 text-gray-500',   icon: <XCircle size={11} />,                          label: 'Cancelled' },
};

const JOB_DOT = {
  queued:   'bg-gray-300',
  applied:  'bg-green-500',
  external: 'bg-purple-400',
  skipped:  'bg-yellow-400',
  failed:   'bg-red-500',
};

/** Prettify a camelCase / snake_case captured field key */
const prettifyKey = (k) =>
  k.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, (c) => c.toUpperCase());

// ─── Live progress panel (shown while a run is "running") ─────────────────────

const LiveProgress = ({ runId, onComplete }) => {
  const [data, setData] = useState(null);
  const timerRef = useRef(null);

  const poll = async () => {
    try {
      const res = await automationApi.getRunProgress(runId);
      const run = res.data?.data;
      setData(run);
      if (run?.status !== 'running') {
        onComplete?.();
      }
    } catch {}
  };

  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [runId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return null;

  const { summary = {}, jobResults = [], externalJobs = [], capturedFields = {}, status } = data;
  const total    = summary.total    || 0;
  const applied  = summary.applied  || 0;
  const external = summary.external || 0;
  const skipped  = summary.skipped  || 0;
  const failed   = summary.failed   || 0;
  const done     = applied + external + skipped + failed;
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
  const capturedEntries = Object.entries(capturedFields).filter(([, v]) => v != null && v !== '');

  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <Card.Body className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          {status === 'running'
            ? <Loader2 size={16} className="text-blue-600 animate-spin shrink-0" />
            : <CheckCircle2 size={16} className="text-green-600 shrink-0" />}
          <span className="text-sm font-semibold text-gray-900">
            {status === 'running' ? 'Automation in progress…' : 'Run complete'}
          </span>
        </div>

        {/* Step message */}
        {summary.step && (
          <p className="text-xs text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg">{summary.step}</p>
        )}

        {/* Progress bar */}
        {total > 0 && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{done}/{total} jobs processed</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        {total > 0 && (
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="text-green-700 font-medium">{applied} applied</span>
            {external > 0 && (
              <span className="text-purple-600 font-medium">{external} manual tabs open</span>
            )}
            <span className="text-yellow-600">{skipped} skipped</span>
            <span className="text-red-500">{failed} failed</span>
          </div>
        )}

        {/* Per-job dots */}
        {jobResults.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {jobResults.map((jr, i) => (
              <div
                key={i}
                title={`${jr.title || 'Job'} — ${jr.status}`}
                className={`w-3 h-3 rounded-full ${JOB_DOT[jr.status] || 'bg-gray-300'}`}
              />
            ))}
          </div>
        )}

        {/* External jobs — opened for manual apply */}
        {externalJobs.length > 0 && (
          <div className="border border-purple-200 rounded-lg p-3 bg-purple-50/60 space-y-2">
            <p className="text-xs font-semibold text-purple-800 flex items-center gap-1">
              <ExternalLink size={12} />
              {externalJobs.length} tab{externalJobs.length > 1 ? 's' : ''} opened — apply manually
            </p>
            {externalJobs.map((j, i) => (
              <div key={i} className="text-xs text-purple-700 flex items-start gap-1">
                <span className="mt-0.5 shrink-0">•</span>
                <span className="font-medium">{j.title}</span>
                {j.company && <span className="text-purple-500">@ {j.company}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Captured fields — learned from user input */}
        {capturedEntries.length > 0 && (
          <div className="border border-emerald-200 rounded-lg p-3 bg-emerald-50/60 space-y-1.5">
            <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
              <Brain size={12} />
              Learned from your inputs — will auto-fill next run
            </p>
            <div className="flex flex-wrap gap-2">
              {capturedEntries.map(([k, v]) => (
                <span key={k} className="text-xs bg-white border border-emerald-200 text-emerald-700 rounded-full px-2 py-0.5">
                  {prettifyKey(k)}: <strong>{String(v)}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {data.error && (
          <p className="text-xs text-red-600 flex items-start gap-1">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />{data.error}
          </p>
        )}
      </Card.Body>
    </Card>
  );
};

// ─── Collapsed run row in history list ────────────────────────────────────────

const RunRow = ({ run }) => {
  const dispatch = useDispatch();
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const cfg = RUN_STATUS[run.status] || RUN_STATUS.completed;

  const handleExpand = async () => {
    if (!expanded && !detail) {
      setLoading(true);
      try {
        const res = await automationApi.getRunById(run._id);
        setDetail(res.data?.data);
      } catch {}
      setLoading(false);
    }
    setExpanded((v) => !v);
  };

  const handleCancel = async (e) => {
    e.stopPropagation();
    if (!confirm('Cancel this run?')) return;
    const result = await dispatch(cancelAutomationRun(run._id));
    if (cancelAutomationRun.fulfilled.match(result)) {
      dispatch(showToast({ message: 'Run cancelled', type: 'info' }));
    }
  };

  const d = detail || run;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={handleExpand}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
            {cfg.icon}{cfg.label}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1.5">
              {run.portal === 'linkedin'
                ? <span className="text-[#0A66C2] font-bold text-xs shrink-0">in</span>
                : <span className="text-[#FF7555] font-bold text-xs shrink-0">N</span>}
              "{run.keywords}"{run.location ? ` · ${run.location}` : ''}
            </p>
            <p className="text-xs text-gray-400">{timeAgo(run.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500 hidden sm:block">
            {run.summary?.applied ?? 0} applied / {run.summary?.total ?? 0}
          </span>
          {run.status === 'running' && (
            <Button variant="ghost" size="sm" onClick={handleCancel} className="text-red-500 text-xs px-2 py-1">
              Cancel
            </Button>
          )}
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-4">
          {loading ? (
            <p className="text-xs text-gray-400 text-center py-3">Loading…</p>
          ) : (
            <>
              {/* Per-job results */}
              {d.jobResults?.length ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {d.jobResults.map((jr, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{jr.title || '—'}</p>
                        {jr.company && <p className="text-gray-500">{jr.company}</p>}
                        {jr.externalUrl && (
                          <a href={jr.externalUrl} target="_blank" rel="noreferrer"
                             className="text-purple-600 underline flex items-center gap-0.5 mt-0.5">
                            <ExternalLink size={10} />Apply manually
                          </a>
                        )}
                        {jr.error && <p className="text-red-500 mt-0.5">{jr.error}</p>}
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full font-medium capitalize ${
                        jr.status === 'applied'  ? 'bg-green-100 text-green-700' :
                        jr.status === 'external' ? 'bg-purple-100 text-purple-700' :
                        jr.status === 'skipped'  ? 'bg-yellow-100 text-yellow-700' :
                        jr.status === 'failed'   ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {jr.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">No job details yet.</p>
              )}

              {/* External tabs opened for manual apply */}
              {d.externalJobs?.length > 0 && (
                <div className="border border-purple-200 rounded-lg p-3 bg-purple-50 space-y-1.5">
                  <p className="text-xs font-semibold text-purple-800 flex items-center gap-1">
                    <ExternalLink size={11} />Company websites opened for manual apply
                  </p>
                  {d.externalJobs.map((j, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="font-medium text-purple-700 truncate">{j.title}</span>
                      {j.company && <span className="text-purple-500 shrink-0">@ {j.company}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Captured fields learned from user */}
              {d.capturedFields && Object.keys(d.capturedFields).length > 0 && (
                <div className="border border-emerald-200 rounded-lg p-3 bg-emerald-50 space-y-1.5">
                  <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                    <Brain size={11} />Fields learned from your inputs
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(d.capturedFields)
                      .filter(([, v]) => v != null && v !== '')
                      .map(([k, v]) => (
                        <span key={k} className="text-xs bg-white border border-emerald-200 text-emerald-700 rounded-full px-2 py-0.5">
                          {prettifyKey(k)}: <strong>{String(v)}</strong>
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

const RunHistory = ({ refreshTrigger }) => {
  const dispatch = useDispatch();
  const { runs, runsPagination, runsStatus } = useSelector((s) => s.automation);

  const activeRun = runs.find((r) => r.status === 'running');

  const load = () => dispatch(fetchRunHistory({ limit: 20 }));

  // Load on mount and when a new run is triggered
  useEffect(() => { load(); }, [refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // When the live-progress panel says a run finished, reload the history
  const handleRunComplete = () => {
    setTimeout(load, 1000);
  };

  return (
    <div className="space-y-4">
      {/* Live progress panel — only while a run is active */}
      {activeRun && (
        <LiveProgress runId={activeRun._id} onComplete={handleRunComplete} />
      )}

      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Run History</h2>
            <Button variant="ghost" size="sm" onClick={load} className="gap-1.5 text-xs">
              <RefreshCw size={13} />Refresh
            </Button>
          </div>
        </Card.Header>

        <Card.Body>
          {runsStatus === 'loading' && !runs.length ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
          ) : runs.length === 0 ? (
            <div className="text-center py-10">
              <Bot size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No automation runs yet.</p>
              <p className="text-xs text-gray-400 mt-1">Complete Steps 1 &amp; 2 above to start.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <RunRow key={run._id} run={run} />
              ))}
              {runsPagination?.pages > 1 && (
                <p className="text-xs text-center text-gray-400 pt-2">
                  Showing {runs.length} of {runsPagination.total} runs
                </p>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default RunHistory;
