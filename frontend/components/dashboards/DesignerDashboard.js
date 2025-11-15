import { useState, useEffect, useCallback, useMemo } from 'react';
import { requestsAPI, notificationsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner';
import DesignerRequestList from '../DesignerRequestList';

// Stat Card Component matching installer dashboard style
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

  // Calculate stats for designer dashboard
  const stats = useMemo(() => {
    if (!Array.isArray(requests)) {
      return { total: 0, new: 0, inProgress: 0, completed: 0 };
    }
    
    const total = requests.length;
    const newRequests = requests.filter(r => 
      r.status === 'New' || r.status === 'Assigned'
    ).length;
    const inProgress = requests.filter(r => 
      r.status === 'Design In Progress'
    ).length;
    // Count as completed if design is complete, submitted, approved, or project is fully completed
    // This includes designs that have been sent to installer
    const completed = requests.filter(r => 
      r.status === 'Design Complete' || 
      r.status === 'Design Submitted' ||
      r.status === 'Awaiting Client Review' ||
      r.status === 'Installation In Progress' ||
      r.status === 'Completed'
    ).length;
    
    return { total, new: newRequests, inProgress, completed };
  }, [requests]);

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

      {/* Stats Overview */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <svg className="h-6 w-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Projects Overview
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total Projects" 
            value={stats.total}
            icon={
              <svg className="h-full w-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            color="blue"
          />
          <StatCard 
            title="New Requests" 
            value={stats.new}
            icon={
              <svg className="h-full w-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            }
            color="yellow"
          />
          <StatCard 
            title="In Progress" 
            value={stats.inProgress}
            icon={
              <svg className="h-full w-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="purple"
          />
          <StatCard 
            title="Completed" 
            value={stats.completed}
            icon={
              <svg className="h-full w-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
          />
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
