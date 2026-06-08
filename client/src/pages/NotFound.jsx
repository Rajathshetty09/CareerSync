import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
    <h1 className="text-6xl font-bold text-primary-600">404</h1>
    <p className="text-xl text-gray-700 mt-4">Page not found</p>
    <p className="text-gray-500 mt-2">The page you're looking for doesn't exist.</p>
    <Link to="/dashboard" className="mt-6 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
      Back to Dashboard
    </Link>
  </div>
);

export default NotFound;
