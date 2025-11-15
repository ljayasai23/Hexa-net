import { useState, useEffect, useMemo, useCallback } from 'react';
import { requestsAPI, notificationsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner';
import InstallerRequestList from '../InstallerRequestList';
import { useAuth } from '../../contexts/AuthContext';

// Stat Card Component with improved design
const StatCard = ({ title, value, icon, color = 'blue' }) => {
  const colorConfigs = {
    blue: {
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-500',
      iconColor: 'text-white',
      text: 'text-blue-600',
      border: 'border-blue-200'
    },
    green: {
      bg: 'bg-green-50',
      iconBg: 'bg-green-500',
      iconColor: 'text-white',
      text: 'text-green-600',
      border: 'border-green-200'
    },
    yellow: {
      bg: 'bg-yellow-50',
      iconBg: 'bg-yellow-500',
      iconColor: 'text-white',
      text: 'text-yellow-600',
      border: 'border-yellow-200'
    },
    purple: {
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-500',
      iconColor: 'text-white',
      text: 'text-purple-600',
      border: 'border-purple-200'
    },
    indigo: {
      bg: 'bg-indigo-50',
      iconBg: 'bg-indigo-500',
      iconColor: 'text-white',
      text: 'text-indigo-600',
      border: 'border-indigo-200'
    }
  };

  const config = colorConfigs[color] || colorConfigs.blue;

  return (
    <div className={`bg-white overflow-hidden shadow-lg rounded-xl border ${config.border} hover:shadow-xl transition-shadow duration-200`}>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">
              {title}
            </p>
            <p className={`text-3xl font-bold ${config.text}`}>
              {value}
            </p>
          </div>
          <div className={`${config.iconBg} ${config.iconColor} p-3 rounded-xl shadow-md`}>
            <div className="h-8 w-8">
              {icon}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function InstallerDashboard() {
  const { user } = useAuth();
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
  // Include all assigned projects regardless of status (except Completed)
  const activeRequests = useMemo(() => {
    if (!Array.isArray(requests) || !user?._id) return [];
    // Show all requests that are assigned to this installer and not completed
    const filtered = requests.filter(r => {
      if (!r || r.status === 'Completed') return false;
      // Check if assigned to this installer (handle both populated object and ID)
      const installerId = r.assignedInstaller?._id || r.assignedInstaller;
      const isAssigned = installerId && installerId.toString() === user._id.toString();
      return isAssigned;
    });
    // Debug: Log filtered requests
    console.log('InstallerDashboard: Total requests:', requests.length);
    console.log('InstallerDashboard: Current user ID:', user._id);
    console.log('InstallerDashboard: Current user role:', user.role);
    console.log('InstallerDashboard: Filtered active requests:', filtered.length);
    if (filtered.length > 0) {
      console.log('InstallerDashboard: Filtered requests details:', filtered.map(r => ({ 
        id: r._id, 
        status: r.status, 
        campus: r.requirements?.campusName,
        assignedInstaller: r.assignedInstaller?._id || r.assignedInstaller,
        assignedInstallerType: typeof r.assignedInstaller,
        installationProgress: r.installationProgress
      })));
    } else if (requests.length > 0) {
      // Debug: Show why requests were filtered out
      console.log('InstallerDashboard: All requests (for debugging):', requests.map(r => {
        const installerId = r.assignedInstaller?._id || r.assignedInstaller;
        const matchesUser = installerId && installerId.toString() === user._id.toString();
        return {
          id: r._id,
          status: r.status,
          campus: r.requirements?.campusName,
          assignedInstaller: installerId,
          assignedInstallerType: typeof r.assignedInstaller,
          userInstallerId: user._id,
          matchesUser: matchesUser,
          isCompleted: r.status === 'Completed',
          willBeFiltered: !matchesUser || r.status === 'Completed'
        };
      }));
    } else {
      console.log('InstallerDashboard: No requests received from API');
    }
    return filtered;
  }, [requests, user]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!Array.isArray(activeRequests)) {
      return { total: 0, pending: 0, scheduled: 0, inProgress: 0 };
    }
    
    // Count all assigned projects that need installer action (not scheduled or in progress)
    const pending = activeRequests.filter(r => 
      r && !r.scheduledInstallationDate && 
      r.status !== 'Installation In Progress' &&
      (r.status === 'Design Complete' || 
       r.status === 'Awaiting Client Review' ||
       r.status === 'New' ||
       r.status === 'Assigned' ||
       (r.status === 'Design Submitted' && r.requestType !== 'Design Only'))
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

  // Notifications are handled by the NotificationBell component in the top right
  // No need to display them separately in the dashboard

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Installation Dashboard</h1>
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
            </div>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchRequests(false);
              fetchNotifications();
            }}
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

      {/* Stats Overview */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <svg className="h-6 w-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Overview
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total Active" 
            value={stats.total} 
            icon={
              <svg className="h-full w-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            color="blue"
          />
          <StatCard 
            title="Pending Response" 
            value={stats.pending} 
            icon={
              <svg className="h-full w-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="yellow"
          />
          <StatCard 
            title="Scheduled" 
            value={stats.scheduled} 
            icon={
              <svg className="h-full w-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            color="purple"
          />
          <StatCard 
            title="In Progress" 
            value={stats.inProgress} 
            icon={
              <svg className="h-full w-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            color="indigo"
          />
        </div>
      </div>

      {/* Pending/Incomplete Requests List */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <svg className="h-6 w-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Pending Installation Requests
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
        ) : requests.length > 0 ? (
          <div className="card p-6">
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">No projects assigned to you yet.</p>
              <p className="text-sm text-gray-400">
                Total requests in system: {requests.length}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Check console for debugging info (F12)
              </p>
            </div>
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
