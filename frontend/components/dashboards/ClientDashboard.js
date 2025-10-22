import { useState, useEffect } from 'react';
import { requestsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner';
import RequestForm from '../RequestForm';
import RequestList from '../RequestList';

export default function ClientDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await requestsAPI.getAll();
      setRequests(response.data.requests);
    } catch (error) {
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCreated = () => {
    setShowForm(false);
    fetchRequests();
    toast.success('Request created successfully!');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
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
