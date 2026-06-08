import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchApplications,
  fetchApplicationStats,
} from '../../features/applications/applicationsSlice.js';
import ApplicationCard from './components/ApplicationCard.jsx';
import Loader from '../../components/common/Loader.jsx';
import { Briefcase, TrendingUp, Star, CheckCircle2 } from 'lucide-react';

const STATUS_TABS = [
  { value: 'all',          label: 'All' },
  { value: 'pending',      label: 'Pending' },
  { value: 'applied',      label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offered',      label: 'Offered' },
  { value: 'rejected',     label: 'Rejected' },
];

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

const ApplicationsDashboard = () => {
  const dispatch = useDispatch();
  const { list, listStatus, stats, pagination } = useSelector((s) => s.applications);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    dispatch(fetchApplicationStats());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchApplications({ status: activeTab === 'all' ? undefined : activeTab }));
  }, [dispatch, activeTab]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <p className="text-sm text-gray-500 mt-1">Track every job application in one place.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Briefcase}     label="Total"        value={stats.total}        color="bg-gray-700" />
        <StatCard icon={TrendingUp}    label="Applied"      value={stats.applied}      color="bg-blue-600" />
        <StatCard icon={Star}          label="Interviewing" value={stats.interviewing} color="bg-yellow-500" />
        <StatCard icon={CheckCircle2}  label="Offered"      value={stats.offered}      color="bg-green-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.value !== 'all' && stats[tab.value] > 0 && (
              <span className="ml-1.5 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                {stats[tab.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {listStatus === 'loading' && <Loader />}

      {listStatus === 'succeeded' && list.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Briefcase size={48} className="text-gray-300 mb-4" />
          <p className="font-medium text-gray-700">No applications yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Browse jobs and start tracking your applications.
          </p>
        </div>
      )}

      {listStatus === 'succeeded' && list.length > 0 && (
        <div className="space-y-3">
          {list.map((app) => (
            <ApplicationCard key={app._id} application={app} />
          ))}
        </div>
      )}

      {pagination?.totalPages > 1 && (
        <p className="text-center text-sm text-gray-400">
          Showing {list.length} of {pagination.total} applications
        </p>
      )}
    </div>
  );
};

export default ApplicationsDashboard;
