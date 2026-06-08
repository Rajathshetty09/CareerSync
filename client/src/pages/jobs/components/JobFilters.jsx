import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { setFilters } from '../../../features/jobs/jobsSlice.js';
import Button from '../../../components/ui/Button.jsx';
import { EMPLOYMENT_TYPES, JOB_SOURCES } from '../../../utils/constants.js';
import { SlidersHorizontal, X } from 'lucide-react';

const POSTED_WITHIN = [
  { label: 'Any time',   value: '' },
  { label: 'Today',      value: '1' },
  { label: 'Last 7 days',value: '7' },
  { label: 'Last 30 days',value: '30' },
];

const JobFilters = ({ onClose }) => {
  const dispatch = useDispatch();
  const filters = useSelector((s) => s.jobs.filters);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      source: filters.source || '',
      employmentType: filters.employmentType || '',
      postedWithin: '',
      sort: filters.sort || 'latest',
    },
  });

  const onSubmit = (data) => {
    dispatch(setFilters(data));
    onClose?.();
  };

  const handleClear = () => {
    reset({ source: '', employmentType: '', postedWithin: '', sort: 'latest' });
    dispatch(setFilters({ source: '', employmentType: '', postedWithin: '', sort: 'latest' }));
    onClose?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <SlidersHorizontal size={16} />
          Filters
        </h3>
        {onClose && (
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Sort */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Sort by</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          {...register('sort')}
        >
          <option value="latest">Latest</option>
          <option value="relevance">Most relevant</option>
        </select>
      </div>

      {/* Source */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Source</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          {...register('source')}
        >
          <option value="">All sources</option>
          {JOB_SOURCES.map((s) => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
      </div>

      {/* Employment type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Job type</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" value="" className="text-primary-600" {...register('employmentType')} />
            <span className="text-gray-700">All types</span>
          </label>
          {EMPLOYMENT_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" value={t} className="text-primary-600" {...register('employmentType')} />
              <span className="text-gray-700 capitalize">{t.replace('-', ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Posted within */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Posted within</label>
        <div className="space-y-2">
          {POSTED_WITHIN.map(({ label, value }) => (
            <label key={label} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" value={value} className="text-primary-600" {...register('postedWithin')} />
              <span className="text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleClear} className="flex-1">
          Clear
        </Button>
        <Button type="submit" size="sm" className="flex-1">
          Apply
        </Button>
      </div>
    </form>
  );
};

export default JobFilters;
