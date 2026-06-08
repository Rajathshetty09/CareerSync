import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCredentials, saveCredentials, removeCredentials, verifyLogin, resetLoginTest,
} from '../../../features/automation/automationSlice.js';
import { showToast } from '../../../features/ui/uiSlice.js';
import Button from '../../../components/ui/Button.jsx';
import Card from '../../../components/ui/Card.jsx';
import {
  CheckCircle2, XCircle, Loader2, Eye, EyeOff, Trash2, Shield, AlertCircle, Brain,
} from 'lucide-react';

const prettifyKey = (k) =>
  k.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, (c) => c.toUpperCase());

const NOTICE_OPTIONS = [0, 15, 30, 45, 60, 90];

const NaukriSetup = () => {
  const dispatch = useDispatch();
  const { credentials, credentialsStatus, credentialsError, loginTestStatus, loginTestError } =
    useSelector((s) => s.automation);

  const creds = credentials['naukri'];
  const hasCredentials = !!creds;

  const [form, setForm] = useState({
    username: '', password: '',
    noticePeriodDays: 30, currentCtcLakhs: 0, expectedCtcLakhs: 0, coverNote: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    dispatch(fetchCredentials('naukri'));
    return () => dispatch(resetLoginTest());
  }, [dispatch]);

  useEffect(() => {
    if (creds) {
      setForm((f) => ({
        ...f,
        username: creds.username || '',
        noticePeriodDays: creds.preferences?.noticePeriodDays ?? 30,
        currentCtcLakhs:  creds.preferences?.currentCtcLakhs  ?? 0,
        expectedCtcLakhs: creds.preferences?.expectedCtcLakhs ?? 0,
        coverNote:        creds.preferences?.coverNote         ?? '',
      }));
    }
  }, [creds]);

  const handleSave = async () => {
    if (!form.username || !form.password) return;
    const result = await dispatch(saveCredentials({
      portal: 'naukri',
      username: form.username,
      password: form.password,
      preferences: {
        noticePeriodDays:  form.noticePeriodDays,
        currentCtcLakhs:   form.currentCtcLakhs,
        expectedCtcLakhs:  form.expectedCtcLakhs,
        coverNote:         form.coverNote,
      },
    }));
    if (saveCredentials.fulfilled.match(result)) {
      dispatch(showToast({ message: 'Credentials saved securely', type: 'success' }));
      setEditing(false);
      setForm((f) => ({ ...f, password: '' }));
    }
  };

  const handleDelete = async () => {
    if (!confirm('Remove Naukri credentials? This cannot be undone.')) return;
    await dispatch(removeCredentials('naukri'));
    setForm({ username: '', password: '', noticePeriodDays: 30, currentCtcLakhs: 0, expectedCtcLakhs: 0, coverNote: '' });
    setEditing(false);
  };

  const handleTestLogin = () => dispatch(verifyLogin('naukri'));

  const isLoading = credentialsStatus === 'loading';
  const isTesting = loginTestStatus === 'loading';

  const statusBadge = () => {
    if (!hasCredentials) return null;
    if (creds.lastVerifiedAt) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
          <CheckCircle2 size={11} />
          Verified {new Date(creds.lastVerifiedAt).toLocaleDateString()}
        </span>
      );
    }
    if (creds.lastLoginError) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
          <XCircle size={11} />Login failed last time
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
        <AlertCircle size={11} />Not yet verified
      </span>
    );
  };

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <img src="https://static.naukimg.com/s/0/0/i/new-global/naukri-logo.svg"
                alt="Naukri" className="h-5 object-contain" onError={(e) => { e.target.style.display='none'; }} />
              Naukri Setup
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Your credentials are encrypted with AES-256-GCM before storage.
            </p>
          </div>
          {statusBadge()}
        </div>
      </Card.Header>

      <Card.Body className="space-y-5">
        {/* Security notice */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
          <Shield size={13} className="mt-0.5 shrink-0" />
          <span>
            Credentials are stored encrypted. The automation logs into Naukri on your behalf
            and applies using your saved Naukri profile — no resume is uploaded separately.
          </span>
        </div>

        {hasCredentials && !editing ? (
          /* ─── Saved state ─── */
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">{creds.username}</p>
                <p className="text-xs text-gray-400 mt-0.5">Password: ••••••••</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500 hover:text-red-700">
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="p-2 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-800">{creds.preferences?.noticePeriodDays ?? '—'}d</div>
                <div className="text-xs text-gray-400">Notice Period</div>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-800">{creds.preferences?.currentCtcLakhs ?? '—'} L</div>
                <div className="text-xs text-gray-400">Current CTC</div>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-800">{creds.preferences?.expectedCtcLakhs ?? '—'} L</div>
                <div className="text-xs text-gray-400">Expected CTC</div>
              </div>
            </div>

            {/* Learned fields from previous runs */}
            {creds.capturedFields && Object.keys(creds.capturedFields).length > 0 && (
              <div className="border border-emerald-200 rounded-lg p-3 bg-emerald-50 space-y-2">
                <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                  <Brain size={13} />
                  Learned from previous runs — auto-filled during apply
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(creds.capturedFields)
                    .filter(([, v]) => v != null && v !== '')
                    .map(([k, v]) => (
                      <span key={k} className="text-xs bg-white border border-emerald-200 text-emerald-700 rounded-full px-2.5 py-0.5">
                        {prettifyKey(k)}: <strong>{String(v)}</strong>
                      </span>
                    ))}
                </div>
                <p className="text-xs text-emerald-600">
                  These values are filled automatically. They update as you fill in new fields.
                </p>
              </div>
            )}

            {/* Test login */}
            <div>
              <Button
                variant="secondary"
                onClick={handleTestLogin}
                loading={isTesting}
                disabled={isTesting}
                className="gap-2 w-full"
              >
                {isTesting
                  ? <><Loader2 size={14} className="animate-spin" />Testing login…</>
                  : 'Test Login Now'}
              </Button>
              {loginTestStatus === 'succeeded' && (
                <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 size={12} />Login verified successfully
                </p>
              )}
              {loginTestStatus === 'failed' && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <XCircle size={12} />{loginTestError}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* ─── Edit / Add form ─── */
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Naukri Email / Mobile
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder={hasCredentials ? 'Enter new password to change' : 'Your Naukri password'}
                    className="w-full px-3 py-2 pr-9 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-600 mb-3">Apply Preferences</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Notice Period</label>
                  <select
                    value={form.noticePeriodDays}
                    onChange={(e) => setForm((f) => ({ ...f, noticePeriodDays: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                  >
                    {NOTICE_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d === 0 ? 'Immediate' : `${d} days`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Current CTC (L)</label>
                  <input
                    type="number" min="0" step="0.5"
                    value={form.currentCtcLakhs}
                    onChange={(e) => setForm((f) => ({ ...f, currentCtcLakhs: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Expected CTC (L)</label>
                  <input
                    type="number" min="0" step="0.5"
                    value={form.expectedCtcLakhs}
                    onChange={(e) => setForm((f) => ({ ...f, expectedCtcLakhs: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {credentialsError && (
              <p className="text-xs text-red-600">{credentialsError}</p>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                loading={isLoading}
                disabled={!form.username || !form.password}
                className="flex-1"
              >
                Save Credentials
              </Button>
              {hasCredentials && (
                <Button variant="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default NaukriSetup;
