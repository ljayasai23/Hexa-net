import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import ClientDashboard from '../components/dashboards/ClientDashboard';
import AdminDashboard from '../components/dashboards/AdminDashboard';
import DesignerDashboard from '../components/dashboards/DesignerDashboard';
import InstallerDashboard from '../components/dashboards/InstallerDashboard';

export default function Dashboard() {
  const { user } = useAuth();

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
