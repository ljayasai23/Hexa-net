import { useState, useEffect, useMemo, useCallback } from 'react';
import { requestsAPI, notificationsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner';
import InstallerRequestList from '../InstallerRequestList';

// Stat Card Component
const StatCard = ({ title, value, icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    purple: 'bg-purple-100 text-purple-800',
    indigo: 'bg-indigo-100 text-indigo-800'
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${colorClasses[color] || colorClasses.blue}`}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {value}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function InstallerDashboard() {
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchRequests = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await requestsAPI.getAll();
      setRequests(response.data?.requests || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      if (!silent) {
        toast.error('Failed to fetch requests: ' + (error.response?.data?.message || error.message || 'Unknown error'));
      }
      setRequests([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationsAPI.getAll();
      setNotifications(response.data?.notifications || []);
      setUnreadCount(response.data?.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Don't show error toast for notifications - it's not critical
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  const handleRequestUpdated = useCallback(() => {
    fetchRequests(true); // Silent refresh
    fetchNotifications();
  }, [fetchRequests, fetchNotifications]);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await fetchRequests();
        await fetchNotifications();
      }
    };
    
    loadData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (isMounted) {
        fetchRequests(true);
        fetchNotifications();
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchRequests, fetchNotifications]);

  // Filter out completed requests - only show pending/active ones
  const activeRequests = useMemo(() => {
    if (!Array.isArray(requests)) return [];
    return requests.filter(r => r && r.status !== 'Completed');
  }, [requests]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!Array.isArray(activeRequests)) {
      return { total: 0, pending: 0, scheduled: 0, inProgress: 0 };
    }
    
    const pending = activeRequests.filter(r => 
      r && (r.status === 'Design Complete' || 
      r.status === 'Awaiting Client Review' ||
      (r.status === 'New' && r.requestType === 'Installation Only'))
    ).length;
    
    const scheduled = activeRequests.filter(r => 
      r && r.scheduledInstallationDate && 
      r.status !== 'Installation In Progress'
    ).length;
    
    const inProgress = activeRequests.filter(r => 
      r && r.status === 'Installation In Progress'
    ).length;
    
    const total = activeRequests.length;

    return { total, pending, scheduled, inProgress };
  }, [activeRequests]);

  // Get recent notifications (assignment notifications)
  const assignmentNotifications = useMemo(() => {
    if (!Array.isArray(notifications)) return [];
    return notifications
      .filter(n => n && n.type === 'assignment' && !n.isRead)
      .slice(0, 5);
  }, [notifications]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Installation Dashboard</h1>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
          {unreadCount > 0 && (
            <p className="text-sm text-blue-600 mt-1 font-medium">
              🔔 {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchRequests(false);
            fetchNotifications();
          }}
          className="btn-secondary flex items-center space-x-2"
          title="Refresh data"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-3">Overview</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total Active" 
            value={stats.total} 
            icon={
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            color="blue"
          />
          <StatCard 
            title="Pending Response" 
            value={stats.pending} 
            icon={
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="yellow"
          />
          <StatCard 
            title="Scheduled" 
            value={stats.scheduled} 
            icon={
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            color="purple"
          />
          <StatCard 
            title="In Progress" 
            value={stats.inProgress} 
            icon={
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            color="indigo"
          />
        </div>
      </div>

      {/* Notifications Section */}
      {assignmentNotifications && assignmentNotifications.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-3">New Assignments</h2>
          <div className="card bg-yellow-50 border-l-4 border-yellow-400">
            <div className="space-y-2">
              {assignmentNotifications.map((notification) => {
                if (!notification || !notification._id) return null;
                return (
                  <div key={notification._id} className="flex items-start justify-between p-3 bg-white rounded-lg border border-yellow-200">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title || 'New Assignment'}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {notification.message || 'You have been assigned to a new project.'}
                      </p>
                      {notification.createdAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {notification.project?._id && (
                      <button
                        onClick={() => {
                          window.location.href = `/project/${notification.project._id}`;
                        }}
                        className="ml-4 text-xs text-primary-600 hover:text-primary-900 font-medium"
                      >
                        View →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Active Requests List */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-3">
          Active Installation Requests
          {activeRequests.length === 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              (No pending requests)
            </span>
          )}
        </h2>
        {activeRequests.length > 0 ? (
          <div className="card">
            <InstallerRequestList 
              requests={activeRequests} 
              onRequestUpdated={handleRequestUpdated}
            />
          </div>
        ) : (
          <div className="card text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have any pending installation requests at the moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
