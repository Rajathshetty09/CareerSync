import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import ProtectedRoute from '../components/common/ProtectedRoute.jsx';
import Login from '../pages/auth/Login.jsx';
import Register from '../pages/auth/Register.jsx';
import VerifyEmail from '../pages/auth/VerifyEmail.jsx';
import Dashboard from '../pages/dashboard/Dashboard.jsx';
import Profile from '../pages/profile/Profile.jsx';
import ResumeDashboard from '../pages/resume/ResumeDashboard.jsx';
import JobListings from '../pages/jobs/JobListings.jsx';
import JobDetails from '../pages/jobs/JobDetails.jsx';
import SavedJobs from '../pages/jobs/SavedJobs.jsx';
import ApplicationsDashboard from '../pages/applications/ApplicationsDashboard.jsx';
import ApplicationDetail from '../pages/applications/ApplicationDetail.jsx';
import ResumeAnalysis from '../pages/ai/ResumeAnalysis.jsx';
import CoverLetterGenerator from '../pages/ai/CoverLetterGenerator.jsx';
import SkillGap from '../pages/ai/SkillGap.jsx';
import Analytics from '../pages/analytics/Analytics.jsx';
import Automation from '../pages/automation/Automation.jsx';
import NotFound from '../pages/NotFound.jsx';

const AppRouter = () => (
  <Routes>
    {/* Public auth routes */}
    <Route element={<AuthLayout />}>
      <Route path="/login"        element={<Login />} />
      <Route path="/register"     element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
    </Route>

    {/* Protected dashboard routes */}
    <Route element={<ProtectedRoute />}>
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard"  element={<Dashboard />} />
        <Route path="/profile"    element={<Profile />} />
        <Route path="/resumes"    element={<ResumeDashboard />} />
        <Route path="/jobs"       element={<JobListings />} />
        <Route path="/jobs/:id"   element={<JobDetails />} />
        <Route path="/saved-jobs"           element={<SavedJobs />} />
        <Route path="/applications"         element={<ApplicationsDashboard />} />
        <Route path="/applications/:id"     element={<ApplicationDetail />} />
        <Route path="/ai/analyse"           element={<ResumeAnalysis />} />
        <Route path="/ai/cover-letter"      element={<CoverLetterGenerator />} />
        <Route path="/ai/skill-gap"         element={<SkillGap />} />
        <Route path="/analytics"            element={<Analytics />} />
        <Route path="/automation"           element={<Automation />} />
      </Route>
    </Route>

    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRouter;
