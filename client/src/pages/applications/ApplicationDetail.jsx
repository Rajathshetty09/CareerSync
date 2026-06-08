import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchApplicationById,
  updateApplication,
  deleteApplication,
  clearCurrentApplication,
} from '../../features/applications/applicationsSlice.js';
import { showToast } from '../../features/ui/uiSlice.js';
import Loader from '../../components/common/Loader.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import StatusBadge from './components/StatusBadge.jsx';
import Badge from '../../components/ui/Badge.jsx';
import {
  ChevronLeft, MapPin, Building2, ExternalLink,
  FileText, Trash2, Save, Clock,
} from 'lucide-react';
import { formatDate, timeAgo } from '../../utils/formatDate.js';

const STATUSES = ['pending', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn'];

const ApplicationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentApplication: app, detailStatus, actionStatus } = useSelector((s) => s.applications);

  const [status, setStatus]       = useState('');
  const [notes, setNotes]         = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    dispatch(fetchApplicationById(id));
    return () => dispatch(clearCurrentApplication());
  }, [dispatch, id]);

  useEffect(() => {
    if (app) {
      setStatus(app.status);
      setNotes(app.notes || '');
      setCoverLetter(app.coverLetter || '');
    }
  }, [app]);

  const isDirty = app && (
    status !== app.status ||
    notes !== (app.notes || '') ||
    coverLetter !== (app.coverLetter || '')
  );

  const handleSave = async () => {
    await dispatch(updateApplication({ id, status, notes, coverLetter }));
    dispatch(showToast({ message: 'Application updated', type: 'success' }));
  };

  const handleDelete = async () => {
    await dispatch(deleteApplication(id));
    dispatch(showToast({ message: 'Application deleted', type: 'success' }));
    navigate('/applications');
  };

  if (detailStatus === 'loading') return <Loader fullPage />;

  if (detailStatus === 'failed' || !app) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-red-500 mb-4">Application not found</p>
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  const job = app.jobId;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/applications" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft size={15} />
        Back to applications
      </Link>

      {/* Header */}
      <Card>
        <Card.Body>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                <Building2 size={22} className="text-gray-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{job?.title || 'Unknown Position'}</h1>
                <p className="text-gray-600">{job?.company || '—'}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                  {job?.location && (
                    <span className="flex items-center gap-1.5"><MapPin size={13} />{job.location}</span>
                  )}
                  {app.appliedAt && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} />Applied {timeAgo(app.appliedAt)}
                    </span>
                  )}
                </div>
                {job?.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {job.skills.slice(0, 6).map((s) => <Badge key={s}>{s}</Badge>)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <StatusBadge status={app.status} size="md" />
              {job?.applyUrl && (
                <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="sm" className="gap-1.5 w-full">
                    <ExternalLink size={13} />View job
                  </Button>
                </a>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Edit form */}
      <Card>
        <Card.Header>
          <h2 className="font-semibold text-gray-900">Update Application</h2>
        </Card.Header>
        <Card.Body className="space-y-5">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Interview date, recruiter name, next steps…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Cover letter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5"><FileText size={14} />Cover Letter</span>
            </label>
            <textarea
              rows={8}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Paste or write your cover letter here…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none font-mono"
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            {/* Delete */}
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">Delete this application?</span>
                <Button
                  variant="danger"
                  size="sm"
                  loading={actionStatus === 'loading'}
                  onClick={handleDelete}
                >
                  Yes, delete
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 gap-1.5"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={14} />Delete
              </Button>
            )}

            {/* Save */}
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!isDirty}
              loading={actionStatus === 'loading'}
              onClick={handleSave}
            >
              <Save size={14} />Save changes
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Meta */}
      <div className="text-xs text-gray-400 text-right">
        Created {formatDate(app.createdAt)} · Last updated {timeAgo(app.updatedAt)}
      </div>
    </div>
  );
};

export default ApplicationDetail;
