import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSavedJobs } from '../../features/jobs/jobsSlice.js';
import JobCard from './components/JobCard.jsx';
import Loader from '../../components/common/Loader.jsx';
import { BookmarkX } from 'lucide-react';
import { Link } from 'react-router-dom';

const SavedJobs = () => {
  const dispatch = useDispatch();
  const { savedJobs, listStatus } = useSelector((s) => s.jobs);

  useEffect(() => {
    dispatch(fetchSavedJobs());
  }, [dispatch]);

  if (listStatus === 'loading') return <Loader fullPage />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Saved Jobs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Jobs you've bookmarked for later. ({savedJobs.length} saved)
        </p>
      </div>

      {savedJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookmarkX size={48} className="text-gray-300 mb-4" />
          <p className="font-medium text-gray-700">No saved jobs yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Bookmark jobs you're interested in to find them here later.
          </p>
          <Link to="/jobs">
            <button className="mt-4 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
              Browse jobs
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {savedJobs.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedJobs;
