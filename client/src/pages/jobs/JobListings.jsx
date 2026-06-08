import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchJobs, fetchSavedJobIds, setFilters, setPage } from '../../features/jobs/jobsSlice.js';
import useDebounce from '../../hooks/useDebounce.js';
import JobCard from './components/JobCard.jsx';
import JobFilters from './components/JobFilters.jsx';
import Loader from '../../components/common/Loader.jsx';
import Button from '../../components/ui/Button.jsx';
import { Search, SlidersHorizontal, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';

const JobListings = () => {
  const dispatch = useDispatch();
  const { listings, listStatus, filters, pagination, error } = useSelector((s) => s.jobs);
  const savedIds = useSelector((s) => s.jobs.savedJobIds);

  const [search, setSearch] = useState(filters.keyword || '');
  const [location, setLocation] = useState(filters.location || '');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 500);
  const debouncedLocation = useDebounce(location, 500);

  // Load saved IDs once on mount
  useEffect(() => {
    dispatch(fetchSavedJobIds());
  }, [dispatch]);

  // Pull individual primitives so the effect doesn't re-run on object reference changes
  const { keyword, location: filterLocation, employmentType, source, sort } = filters;
  const { page, limit } = pagination;

  useEffect(() => {
    dispatch(fetchJobs({ keyword, location: filterLocation, employmentType, source, sort, page, limit }));
  }, [dispatch, keyword, filterLocation, employmentType, source, sort, page, limit]);

  // Sync debounced search inputs → Redux filters
  useEffect(() => {
    dispatch(setFilters({ keyword: debouncedSearch, location: debouncedLocation }));
  }, [dispatch, debouncedSearch, debouncedLocation]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Find Jobs</h1>
        <p className="text-sm text-gray-500 mt-1">Browse and search jobs from multiple platforms.</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Job title, skill, or keyword…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="relative w-48 hidden sm:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="gap-2"
        >
          <SlidersHorizontal size={16} />
          <span className="hidden sm:inline">Filters</span>
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Filters sidebar */}
        {filtersOpen && (
          <aside className="w-64 shrink-0">
            <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-6">
              <JobFilters onClose={() => setFiltersOpen(false)} />
            </div>
          </aside>
        )}

        {/* Results */}
        <div className="flex-1 min-w-0">
          {listStatus === 'loading' && <Loader />}

          {listStatus === 'failed' && (
            <div className="text-center py-12">
              <p className="text-red-500 text-sm">{error || 'Failed to load jobs'}</p>
              <Button variant="secondary" size="sm" className="mt-3"
                onClick={() => dispatch(fetchJobs({ ...filters, page: pagination.page }))}>
                Retry
              </Button>
            </div>
          )}

          {listStatus === 'succeeded' && listings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Briefcase size={48} className="text-gray-300 mb-4" />
              <p className="font-medium text-gray-700">No jobs found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try different keywords or check back after the scrapers have run.
              </p>
            </div>
          )}

          {listStatus === 'succeeded' && listings.length > 0 && (
            <>
              <p className="text-sm text-gray-500 mb-4">
                {pagination.total.toLocaleString()} jobs found
              </p>

              <div className="space-y-3">
                {listings.map((job) => (
                  <JobCard key={job._id} job={job} />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-8">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!pagination.hasPrevPage}
                    onClick={() => dispatch(setPage(pagination.page - 1))}
                  >
                    <ChevronLeft size={15} />
                    Prev
                  </Button>
                  <span className="text-sm text-gray-500">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!pagination.hasNextPage}
                    onClick={() => dispatch(setPage(pagination.page + 1))}
                  >
                    Next
                    <ChevronRight size={15} />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobListings;
