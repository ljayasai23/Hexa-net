import { useEffect } from 'react'; // Import useEffect
import { useRouter } from 'next/router'; // Import useRouter
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import ClientDashboard from '../components/dashboards/ClientDashboard';
import AdminDashboard from '../components/dashboards/AdminDashboard';
import DesignerDashboard from '../components/dashboards/DesignerDashboard';
import InstallerDashboard from '../components/dashboards/InstallerDashboard';

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter(); // Initialize router

  // --- THIS IS THE NEW PROTECTION LOGIC ---
  useEffect(() => {
    // If we're not loading and the user is NOT authenticated...
    // This check now only runs when `loading` or `router` changes.
    // It will NOT run when `isAuthenticated` changes (i.e., on logout).
    if (!loading && !isAuthenticated) {
      // ...redirect to login.
      router.push('/login');
    }
    // This logic only runs on this page, so it can't
    // interfere with the logout redirect anymore.
  }, [loading, router]); // <-- THE FIX: We removed `isAuthenticated` from this array
  // --- END OF NEW LOGIC ---


  // This is important: if we are loading OR if the user is not
  // logged in, we render nothing. This prevents a "flash"
  // of the dashboard content before the redirect happens.
  if (loading || !isAuthenticated) {
    return null;
  }

  const renderDashboard = () => {
    switch (user?.role) {
      case 'Client':
        return <ClientDashboard />;
      case 'Web Admin':
        return <AdminDashboard />;
      case 'Network Designer':
        return <DesignerDashboard />;
      case 'Network Installation Team':
        return <InstallerDashboard />;
      default:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this dashboard.</p>
          </div>
        );
    }
  };

  return (
    <Layout>
      {renderDashboard()}
    </Layout>
  );
}

