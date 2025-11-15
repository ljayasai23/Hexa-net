import { useState, useEffect, useCallback } from 'react';
import { requestsAPI, notificationsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner';
import DesignerRequestList from '../DesignerRequestList';

export default function DesignerDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchRequests = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await requestsAPI.getAll();
      setRequests(response.data.requests || []);
      setLastUpdated(new Date());
    } catch (error) {
      if (!silent) toast.error('Failed to fetch requests');
      setRequests([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationsAPI.getAll();
      setUnreadCount(response.data?.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchNotifications();
  }, [fetchRequests, fetchNotifications]);

  const handleRequestUpdated = () => {
    fetchRequests(true);
    fetchNotifications();
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchRequests(false);
    fetchNotifications();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header with gradient banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Designer Dashboard</h1>
            <div className="flex items-center space-x-4 text-indigo-100">
              {lastUpdated && (
                <p className="text-sm">
                  <span className="inline-flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                </p>
              )}
              {unreadCount > 0 && (
                <p className="text-sm font-medium bg-white bg-opacity-20 px-3 py-1 rounded-full">
                  <span className="inline-flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                  </span>
                </p>
              )}
              <p className="text-sm">
                {requests.length} assigned request{requests.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 font-medium"
            title="Refresh data"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Assigned Requests */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <svg className="h-6 w-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Assigned Design Projects
        </h2>
        <div className="card">
          <DesignerRequestList 
            requests={requests} 
            onRequestUpdated={handleRequestUpdated}
          />
        </div>
      </div>
    </div>
  );
}
