import { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { requestsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner';
import RequestForm from '../RequestForm';
import RequestList from '../RequestList';

// SVG Icons for Stats
const FolderIcon = () => (
  <svg className="h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SparklesIcon = () => (
    <svg className="h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m11-11v4m-2-2h4m2 11h-4m2 2v-4M12 2v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M4.22 19.78l1.42-1.42m12.72-12.72l1.42-1.42" />
    </svg>
);


// Stat Card Component
const StatCard = ({ title, value, icon }) => (
  <div className="bg-white overflow-hidden shadow rounded-lg">
    <div className="p-5">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="text-3xl font-semibold text-gray-900">
              {value}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
);


export default function ClientDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true); // Set loading to true when fetching
    try {
      const response = await requestsAPI.getAll();
      setRequests(response.data.requests || []); // Ensure requests is an array
    } catch (error) {
      toast.error('Failed to fetch requests');
      setRequests([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCreated = () => {
    setShowForm(false);
    fetchRequests(); // Refetch requests
    toast.success('Request created successfully!');
  };

  // Calculate stats using useMemo
  const stats = useMemo(() => {
    if (!Array.isArray(requests)) {
      return { total: 0, inProgress: 0, completed: 0, new: 0 };
    }
    const total = requests.length;
    const inProgress = requests.filter(r => 
      ['Assigned', 'Design In Progress', 'Installation In Progress'].includes(r.status)
    ).length;
    const completed = requests.filter(r => r.status === 'Completed').length;
    const newRequests = requests.filter(r => r.status === 'New').length;
    
    return { total, inProgress, completed, new: newRequests };
  }, [requests]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-3">Projects Overview</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Projects" value={stats.total} icon={<FolderIcon />} />
          <StatCard title="New Requests" value={stats.new} icon={<SparklesIcon />} />
          <StatCard title="In Progress" value={stats.inProgress} icon={<ClockIcon />} />
          <StatCard title="Completed" value={stats.completed} icon={<CheckCircleIcon />} />
        </div>
      </div>

      {/* Main Content: New Request + List */}
      <div className="flex justify-between items-center mt-6">
        <h1 className="text-2xl font-bold text-gray-900">My Network Requests</h1>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          Submit New Request
        </button>
      </div>

      {showForm && (
        <div className="card">
          <RequestForm onSuccess={handleRequestCreated} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <div className="card">
        <RequestList requests={requests} />
      </div>
    </div>
  );
}
