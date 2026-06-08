import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile } from '../../features/profile/profileSlice.js';
import Tabs from '../../components/ui/Tabs.jsx';
import Loader from '../../components/common/Loader.jsx';
import PersonalInfoForm from './components/PersonalInfoForm.jsx';
import SkillsManager from './components/SkillsManager.jsx';
import ExperienceManager from './components/ExperienceManager.jsx';
import PreferencesForm from './components/PreferencesForm.jsx';
import { User, Star, Briefcase, Settings, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const TABS = [
  { id: 'personal',    label: 'Personal Info', icon: User },
  { id: 'skills',      label: 'Skills',        icon: Star },
  { id: 'experience',  label: 'Experience',    icon: Briefcase },
  { id: 'preferences', label: 'Preferences',   icon: Settings },
];

const Profile = () => {
  const dispatch = useDispatch();
  const { data: profile, fetchStatus, error } = useSelector((s) => s.profile);
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    if (!profile) dispatch(fetchProfile());
  }, [dispatch, profile]);

  if (fetchStatus === 'loading' || fetchStatus === 'idle') {
    return <Loader fullPage />;
  }

  if (fetchStatus === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-red-500 text-sm">{error || 'Failed to load profile'}</p>
        <button
          onClick={() => dispatch(fetchProfile())}
          className="mt-4 text-sm text-primary-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Keep your profile updated to get better job matches.
        </p>
      </div>

      {/* Resume prompt banner */}
      <div className="flex items-center gap-3 p-4 bg-primary-50 border border-primary-100 rounded-xl text-sm">
        <FileText size={18} className="text-primary-600 shrink-0" />
        <span className="text-gray-700">
          Upload your resume to unlock AI match scoring and auto-apply.{' '}
        </span>
        <Link
          to="/resumes"
          className="ml-auto font-medium text-primary-600 hover:text-primary-700 whitespace-nowrap"
        >
          Manage resumes →
        </Link>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <div>
        {activeTab === 'personal'    && <PersonalInfoForm />}
        {activeTab === 'skills'      && <SkillsManager />}
        {activeTab === 'experience'  && <ExperienceManager />}
        {activeTab === 'preferences' && <PreferencesForm />}
      </div>
    </div>
  );
};

export default Profile;
