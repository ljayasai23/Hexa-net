import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
// We REMOVED useEffect
import LoadingSpinner from './LoadingSpinner';

const LogoutButton = () => {
  const { logout } = useAuth();
  return (
    <button
      onClick={logout}
      className="text-sm text-gray-500 hover:text-gray-700"
    >
      Logout
    </button>
  );
};

const Layout = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  // The problematic useEffect hook has been COMPLETELY REMOVED from this file.
  // This stops the redirect-to-login-page "fight".

  if (loading) {
    return <LoadingSpinner />;
  }

  // This is still important. It prevents the UI from flashing
  // while the redirect (now in dashboard.js) happens.
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Campus Net Planner
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.name}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                {user?.role}
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;

