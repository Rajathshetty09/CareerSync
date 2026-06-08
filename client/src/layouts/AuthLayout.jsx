import { Outlet, Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import Loader from '../components/common/Loader.jsx';

const AuthLayout = () => {
  const { isAuthenticated, isInitializing } = useAuth();

  // Wait only for the initial page-load session restore, not for login/register calls.
  // Using isInitializing (set only by refreshAuth) prevents the form from unmounting
  // mid-submission when login.pending sets status='loading'.
  if (isInitializing) {
    return <Loader fullPage />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">CareerSync</h1>
          <p className="text-gray-500 mt-1">AI-powered Job Search & Automation</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
