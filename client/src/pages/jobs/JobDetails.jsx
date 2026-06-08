import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchJobById, saveJob, unsaveJob } from '../../features/jobs/jobsSlice.js';
import { createApplication } from '../../features/applications/applicationsSlice.js';
import { showToast } from '../../features/ui/uiSlice.js';
import Loader from '../../components/common/Loader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { MapPin, Briefcase, Clock, DollarSign, ExternalLink, Bookmark, BookmarkCheck, ChevronLeft, Building2, ClipboardList } from 'lucide-react';
import { formatDate, timeAgo } from '../../utils/formatDate.js';

const SOURCE_LABELS = {
  naukri: 'Naukri', linkedin: 'LinkedIn', indeed: 'Indeed',
  foundit: 'Foundit', wellfound: 'Wellfound', manual: 'Manual',
};

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentJob: job, jobStatus, error } = useSelector((s) => s.jobs);
  const savedIds = useSelector((s) => s.jobs.savedJobIds);
  const isSaved = savedIds.includes(id);
  const { actionStatus: appActionStatus } = useSelector((s) => s.applications);
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    dispatch(fetchJobById(id));
  }, [dispatch, id]);

  const handleTrack = async () => {
    const result = await dispatch(createApplication({ jobId: id, status: 'applied' }));
    if (!result.error) {
      setTracked(true);
      dispatch(showToast({ message: 'Application tracked', type: 'success' }));
    } else {
      dispatch(showToast({ message: result.payload || 'Failed to track', type: 'error' }));
    }
  };

  const handleSaveToggle = async () => {
    if (isSaved) {
      await dispatch(unsaveJob(id));
      dispatch(showToast({ message: 'Job removed from saved', type: 'success' }));
    } else {
      await dispatch(saveJob(id));
      dispatch(showToast({ message: 'Job saved', type: 'success' }));
    }
  };

  if (jobStatus === 'loading') return <Loader fullPage />;

  if (jobStatus === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-red-500">{error || 'Job not found'}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back nav */}
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft size={15} />
        Back to listings
      </Link>

      {/* Header card */}
      <Card>
        <Card.Body>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                <Building2 size={22} className="text-gray-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
                <p className="text-gray-600 mt-0.5">{job.company}</p>

                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                  {job.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} />{job.location}
                    </span>
                  )}
                  {job.employmentType && (
                    <span className="flex items-center gap-1.5 capitalize">
                      <Briefcase size={14} />{job.employmentType.replace('-', ' ')}
                    </span>
                  )}
                  {(job.salary?.min || job.salary?.max) && (
                    <span className="flex items-center gap-1.5 text-green-700 font-medium">
                      <DollarSign size={14} />
                      {job.salary.min ? `${(job.salary.min / 1000).toFixed(0)}k` : ''}
                      {job.salary.min && job.salary.max ? '–' : ''}
                      {job.salary.max ? `${(job.salary.max / 1000).toFixed(0)}k` : ''}
                      /{job.salary.period || 'yr'}
                    </span>
                  )}
                  {job.postedAt && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} />Posted {timeAgo(job.postedAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveToggle}
                className="gap-1.5"
              >
                {isSaved ? <BookmarkCheck size={15} className="text-primary-600" /> : <Bookmark size={15} />}
                {isSaved ? 'Saved' : 'Save'}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                disabled={tracked}
                loading={appActionStatus === 'loading'}
                onClick={handleTrack}
                className="gap-1.5"
              >
                <ClipboardList size={14} />
                {tracked ? 'Tracked' : 'Track'}
              </Button>

              {job.applyUrl && (
                <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="gap-1.5">
                    Apply now
                    <ExternalLink size={13} />
                  </Button>
                </a>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Description */}
        <div className="lg:col-span-2">
          <Card>
            <Card.Header><h2 className="font-semibold text-gray-900">Job Description</h2></Card.Header>
            <Card.Body>
              {job.description ? (
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line leading-relaxed">
                  {job.description}
                </div>
              ) : (
                <p className="text-gray-400 italic text-sm">No description available.</p>
              )}
            </Card.Body>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {job.skills?.length > 0 && (
            <Card>
              <Card.Header><h2 className="font-semibold text-gray-900">Required Skills</h2></Card.Header>
              <Card.Body>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((s) => <Badge key={s}>{s}</Badge>)}
                </div>
              </Card.Body>
            </Card>
          )}

          <Card>
            <Card.Header><h2 className="font-semibold text-gray-900">Job Info</h2></Card.Header>
            <Card.Body className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Source</span>
                <span className="font-medium capitalize">{SOURCE_LABELS[job.source] || job.source}</span>
              </div>
              {job.experienceRequired?.min !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Experience</span>
                  <span className="font-medium">
                    {job.experienceRequired.min}
                    {job.experienceRequired.max ? `–${job.experienceRequired.max}` : '+'}
                    {' yrs'}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Posted</span>
                <span className="font-medium">{formatDate(job.postedAt)}</span>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;
