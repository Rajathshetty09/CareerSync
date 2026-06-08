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

const LinkedInSetup = () => {
  const dispatch = useDispatch();
  const { credentials, credentialsStatus, credentialsError, loginTestStatus, loginTestError } =
    useSelector((s) => s.automation);

  const creds = credentials['linkedin'];
  const hasCredentials = !!creds;

  const [form, setForm] = useState({
    username: '', password: '',
    phoneNumber: '', yearsOfExperience: 0,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    dispatch(fetchCredentials('linkedin'));
    return () => dispatch(resetLoginTest());
  }, [dispatch]);

  useEffect(() => {
    if (creds) {
      setForm((f) => ({
        ...f,
        username:          creds.username || '',
        phoneNumber:       creds.preferences?.phoneNumber       ?? '',
        yearsOfExperience: creds.preferences?.yearsOfExperience ?? 0,
      }));
    }
  }, [creds]);

  const handleSave = async () => {
    if (!form.username || !form.password) return;
    const result = await dispatch(saveCredentials({
      portal:   'linkedin',
      username: form.username,
      password: form.password,
      preferences: {
        phoneNumber:       form.phoneNumber,
        yearsOfExperience: Number(form.yearsOfExperience),
      },
    }));
    if (saveCredentials.fulfilled.match(result)) {
      dispatch(showToast({ message: 'LinkedIn credentials saved securely', type: 'success' }));
      setEditing(false);
      setForm((f) => ({ ...f, password: '' }));
    }
  };

  const handleDelete = async () => {
    if (!confirm('Remove LinkedIn credentials? This cannot be undone.')) return;
    await dispatch(removeCredentials('linkedin'));
    setForm({ username: '', password: '', phoneNumber: '', yearsOfExperience: 0 });
    setEditing(false);
  };

  const handleTestLogin = () => dispatch(verifyLogin('linkedin'));

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
              {/* LinkedIn logo text since external img may be blocked */}
              <span className="text-[#0A66C2] font-bold text-lg leading-none">in</span>
              LinkedIn Easy Apply Setup
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Your credentials are encrypted with AES-256-GCM before storage.
            </p>
          </div>
          {statusBadge()}
        </div>
      </Card.Header>

      <Card.Body className="space-y-5">
        {/* Security + tip notice */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
          <Shield size={13} className="mt-0.5 shrink-0" />
          <span>
            Only jobs with LinkedIn's <strong>Easy Apply</strong> button are targeted — no redirects to company sites.
            The bot pauses at each step so you can answer custom screening questions.
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

            <div className="grid grid-cols-2 gap-3 text-center text-sm">
              <div className="p-2 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-800">
                  {creds.preferences?.phoneNumber || '—'}
                </div>
                <div className="text-xs text-gray-400">Phone</div>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-800">
                  {creds.preferences?.yearsOfExperience || '—'} yrs
                </div>
                <div className="text-xs text-gray-400">Experience</div>
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
                  These values are filled automatically. They update as you answer new screening questions.
                </p>
              </div>
            )}

            {/* Verification reminder */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <strong>First-time tip:</strong> LinkedIn may ask for identity verification when logging in from a new device.
              Complete it in the browser window — CareerSync will continue automatically afterwards.
            </div>

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
                  : 'Test LinkedIn Login'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">LinkedIn Email</label>
                <input
                  type="email"
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
                    placeholder={hasCredentials ? 'Enter new password to change' : 'Your LinkedIn password'}
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
              <p className="text-xs font-medium text-gray-600 mb-3">Apply Preferences (pre-fills common questions)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={form.phoneNumber}
                    onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                    placeholder="+91 9876543210"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Years of Experience</label>
                  <input
                    type="number" min="0" max="50" step="1"
                    value={form.yearsOfExperience}
                    onChange={(e) => setForm((f) => ({ ...f, yearsOfExperience: Number(e.target.value) }))}
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
                <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              )}
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default LinkedInSetup;
