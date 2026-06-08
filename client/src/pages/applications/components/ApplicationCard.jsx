import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { updateApplication } from '../../../features/applications/applicationsSlice.js';
import { showToast } from '../../../features/ui/uiSlice.js';
import StatusBadge from './StatusBadge.jsx';
import Card from '../../../components/ui/Card.jsx';
import { MapPin, Building2, Clock } from 'lucide-react';
import { timeAgo } from '../../../utils/formatDate.js';

const STATUSES = ['pending', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn'];

const SOURCE_LABELS = {
  naukri: 'Naukri', linkedin: 'LinkedIn', indeed: 'Indeed',
  foundit: 'Foundit', wellfound: 'Wellfound', manual: 'Manual',
};

const ApplicationCard = ({ application }) => {
  const dispatch = useDispatch();
  const job = application.jobId;

  const handleStatusChange = async (e) => {
    const status = e.target.value;
    if (status === application.status) return;
    await dispatch(updateApplication({ id: application._id, status }));
    dispatch(showToast({ message: 'Status updated', type: 'success' }));
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <Card.Body>
        <div className="flex items-start justify-between gap-4">
          <Link to={`/applications/${application._id}`} className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-primary-50 border border-primary-100">
                {job?.company && job.company !== 'Unknown'
                  ? <span className="text-primary-700 font-bold text-base leading-none">{job.company.charAt(0).toUpperCase()}</span>
                  : <Building2 size={18} className="text-gray-400" />}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 truncate hover:text-primary-600 transition-colors">
                  {job?.title || 'Unknown Position'}
                </h3>
                <p className="text-sm font-medium text-gray-700 mt-0.5">
                  {job?.company && job.company !== 'Unknown' ? job.company : <span className="text-gray-400 font-normal">Company unknown</span>}
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                  {job?.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} />{job.location}
                    </span>
                  )}
                  {job?.source && (
                    <span className="flex items-center gap-1">
                      {SOURCE_LABELS[job.source] || job.source}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock size={11} />{timeAgo(application.createdAt)}
                  </span>
                  {application.resumeId && (
                    <span className="text-gray-400">
                      Resume: {application.resumeId.fileName}
                    </span>
                  )}
                </div>

                {application.notes && (
                  <p className="mt-2 text-xs text-gray-500 line-clamp-1">
                    {application.notes}
                  </p>
                )}
              </div>
            </div>
          </Link>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusBadge status={application.status} />
            <select
              value={application.status}
              onChange={handleStatusChange}
              onClick={(e) => e.preventDefault()}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ApplicationCard;
