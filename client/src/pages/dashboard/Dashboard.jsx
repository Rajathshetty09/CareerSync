import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchApplicationStats } from '../../features/applications/applicationsSlice.js';
import { fetchResumes } from '../../features/resume/resumeSlice.js';
import {
  Briefcase, FileText, ClipboardList, Sparkles,
  TrendingUp, BookmarkCheck, ChevronRight, Star,
} from 'lucide-react';

const QuickLink = ({ to, icon: Icon, label, sub, color }) => (
  <Link
    to={to}
    className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-primary-200 transition-all group"
  >
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-gray-900 text-sm">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
    <ChevronRight size={16} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
  </Link>
);

const StatTile = ({ label, value, color }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
    <p className={`text-3xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-gray-500 mt-1 capitalize">{label}</p>
  </div>
);

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { stats } = useSelector((s) => s.applications);
  const { resumes } = useSelector((s) => s.resume);

  useEffect(() => {
    dispatch(fetchApplicationStats());
    dispatch(fetchResumes());
  }, [dispatch]);

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {firstName} 👋</h1>
        <p className="text-sm text-gray-500 mt-1">Here's your job search overview.</p>
      </div>

      {/* Application stats */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Applications</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <StatTile label="Total"        value={stats.total}        color="text-gray-800" />
          <StatTile label="Applied"      value={stats.applied}      color="text-blue-600" />
          <StatTile label="Interviewing" value={stats.interviewing} color="text-yellow-600" />
          <StatTile label="Offered"      value={stats.offered}      color="text-green-600" />
          <StatTile label="Rejected"     value={stats.rejected}     color="text-red-500" />
          <StatTile label="Pending"      value={stats.pending}      color="text-gray-500" />
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickLink to="/jobs"         icon={Briefcase}     label="Browse Jobs"         sub="Find your next opportunity"   color="bg-primary-600" />
          <QuickLink to="/applications" icon={ClipboardList} label="My Applications"     sub={`${stats.total} tracked`}     color="bg-indigo-600" />
          <QuickLink to="/resumes"      icon={FileText}      label="My Resumes"           sub={`${resumes.length} uploaded`} color="bg-teal-600" />
          <QuickLink to="/ai/analyse"   icon={Sparkles}      label="AI Resume Analysis"  sub="Match your resume to a job"   color="bg-purple-600" />
          <QuickLink to="/saved-jobs"   icon={BookmarkCheck} label="Saved Jobs"           sub="Jobs bookmarked for later"    color="bg-amber-600" />
          <QuickLink to="/analytics"    icon={TrendingUp}    label="Analytics"            sub="Track your progress"         color="bg-rose-600" />
        </div>
      </section>

      {/* Tips */}
      <section className="bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Star size={16} className="text-primary-600" />
          <h2 className="text-sm font-semibold text-primary-800">Pro Tips</h2>
        </div>
        <ul className="space-y-2 text-sm text-primary-900">
          <li>• Upload your resume first — AI analysis needs it to match against jobs</li>
          <li>• Run the AI Skill Gap tool to see what to learn for your target role</li>
          <li>• Track every application so the Analytics page shows meaningful data</li>
        </ul>
      </section>
    </div>
  );
};

export default Dashboard;
