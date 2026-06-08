import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { saveJob, unsaveJob } from '../../../features/jobs/jobsSlice.js';
import { showToast } from '../../../features/ui/uiSlice.js';
import Badge from '../../../components/ui/Badge.jsx';
import { MapPin, Briefcase, Bookmark, BookmarkCheck, ExternalLink, Clock } from 'lucide-react';
import { timeAgo } from '../../../utils/formatDate.js';

const SOURCE_COLORS = {
  naukri:    'bg-yellow-100 text-yellow-700',
  linkedin:  'bg-blue-100 text-blue-700',
  indeed:    'bg-indigo-100 text-indigo-700',
  foundit:   'bg-orange-100 text-orange-700',
  wellfound: 'bg-green-100 text-green-700',
  adzuna:    'bg-purple-100 text-purple-700',
  jooble:    'bg-teal-100 text-teal-700',
  remoteok:  'bg-emerald-100 text-emerald-700',
  arbeitnow: 'bg-rose-100 text-rose-700',
  himalayas: 'bg-sky-100 text-sky-700',
  jobicy:    'bg-violet-100 text-violet-700',
  themuse:   'bg-pink-100 text-pink-700',
  findwork:  'bg-amber-100 text-amber-700',
  reed:      'bg-red-100 text-red-700',
  manual:    'bg-gray-100 text-gray-700',
};

const JobCard = ({ job }) => {
  const dispatch = useDispatch();
  const savedIds = useSelector((s) => s.jobs.savedJobIds);
  const isSaved = savedIds.includes(job._id);

  const handleSaveToggle = async (e) => {
    e.preventDefault();
    if (isSaved) {
      await dispatch(unsaveJob(job._id));
      dispatch(showToast({ message: 'Job removed from saved', type: 'success' }));
    } else {
      await dispatch(saveJob(job._id));
      dispatch(showToast({ message: 'Job saved', type: 'success' }));
    }
  };

  return (
    <Link
      to={`/jobs/${job._id}`}
      className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-primary-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title & company */}
          <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors truncate">
            {job.title}
          </h3>
          <p className="text-sm text-gray-600 mt-0.5">{job.company}</p>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin size={11} />{job.location}
              </span>
            )}
            {job.employmentType && (
              <span className="flex items-center gap-1">
                <Briefcase size={11} />
                <span className="capitalize">{job.employmentType.replace('-', ' ')}</span>
              </span>
            )}
            {job.postedAt && (
              <span className="flex items-center gap-1">
                <Clock size={11} />{timeAgo(job.postedAt)}
              </span>
            )}
          </div>

          {/* Skills */}
          {job.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {job.skills.slice(0, 5).map((s) => (
                <Badge key={s} variant="gray">{s}</Badge>
              ))}
              {job.skills.length > 5 && (
                <Badge variant="gray">+{job.skills.length - 5}</Badge>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${SOURCE_COLORS[job.source] || SOURCE_COLORS.manual}`}>
            {job.source}
          </span>
          <button
            type="button"
            onClick={handleSaveToggle}
            className={`p-1.5 rounded-lg transition-colors ${
              isSaved
                ? 'text-primary-600 bg-primary-50'
                : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'
            }`}
            aria-label={isSaved ? 'Unsave job' : 'Save job'}
          >
            {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>
        </div>
      </div>

      {/* Salary */}
      {(job.salary?.min || job.salary?.max) && (
        <p className="mt-3 text-sm font-medium text-green-700">
          {job.salary.currency || '$'}
          {job.salary.min ? `${(job.salary.min / 1000).toFixed(0)}k` : ''}
          {job.salary.min && job.salary.max ? ' – ' : ''}
          {job.salary.max ? `${(job.salary.max / 1000).toFixed(0)}k` : ''}
          {' / '}
          {job.salary.period || 'year'}
        </p>
      )}
    </Link>
  );
};

export default JobCard;
