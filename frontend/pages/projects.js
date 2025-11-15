import { useState, useEffect, useCallback, useMemo } from 'react';
import { requestsAPI } from '../lib/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import useRealTimeUpdates from '../hooks/useRealTimeUpdates';
import Link from 'next/link';
import { formatRequestType, getRequestTypeBadgeColor, getRequestTypeIcon } from '../utils/requestUtils';

// Status badge component
const StatusBadge = ({ status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'New':
        return 'bg-blue-100 text-blue-800';
      case 'Assigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'Design In Progress':
        return 'bg-purple-100 text-purple-800';
      case 'Installation In Progress':
        return 'bg-orange-100 text-orange-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      // ADDED NEW STATUSES for better visibility
      case 'Design Submitted':
        return 'bg-orange-200 text-orange-900';
      case 'Awaiting Client Review':
        return 'bg-teal-200 text-teal-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status}
    </span>
  );
};

// Progress bar component
const ProgressBar = ({ status }) => {
  const getProgress = (status) => {
    switch (status) {
      case 'New':
        return 0;
      case 'Assigned':
        return 20;
      case 'Design In Progress':
        return 40;
      case 'Design Submitted': // New status update
        return 50;
      case 'Awaiting Client Review': // New status update
        return 60;
      case 'Installation In Progress':
        return 80;
      case 'Completed':
        return 100;
      case 'Rejected':
        return 0;
      default:
        return 0;
    }
  };

  const progress = getProgress(status);

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
};

// Project card component
const ProjectCard = ({ project }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // FIX: Use the correct project title property (campusName is generally more informative)
  const projectTitle = project.requirements?.campusName || project.title || 'Network Request';

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {projectTitle}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRequestTypeBadgeColor(project.requestType)}`}>
              {getRequestTypeIcon(project.requestType)} {formatRequestType(project.requestType)}
            </span>
          </div>
          <div className="flex items-center space-x-4 mb-2">
            <StatusBadge status={project.status} />
            <span className="text-sm text-gray-500">
              Created: {new Date(project.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          {/* RESOLUTION: Keeping the necessary link format for project-detail.js */}
          <Link 
            href={`/project-detail?id=${project._id}`}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View Details
          </Link>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-600 hover:text-gray-700 text-sm font-medium"
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </button>
        </div>
      </div>

      <div className="mb-4">
        {/* Dual progress bars for Both Design and Installation */}
        {project.requestType === 'Both Design and Installation' ? (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-600">Design Progress</span>
                <span className="text-xs text-gray-600">
                  {(() => {
                    // Check if design exists and is approved (design object might not be populated in list view)
                    // If design field exists (even as ID), and status indicates design is complete, show 100%
                    // For list view, we'll rely on status but prioritize design-complete statuses
                    if (project.status === 'Completed' || project.status === 'Design Complete' || project.status === 'Awaiting Client Review') return '100%';
                    // If design exists (ID or object) and installer is assigned, design is likely complete
                    if (project.design && project.assignedInstaller && (project.status === 'Assigned' || project.status === 'Installation In Progress')) return '100%';
                    // If design object is populated and approved
                    if (project.design && typeof project.design === 'object' && project.design.isApproved) return '100%';
                    if (project.status === 'Design Submitted') return '90%';
                    if (project.status === 'Design In Progress') return '50%';
                    if (project.status === 'Assigned') return '10%';
                    return '0%';
                  })()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    // If design exists and is approved, or design exists with installer-assigned status, or design-complete statuses, show green (100%)
                    (project.design && (typeof project.design === 'object' && project.design.isApproved)) ||
                    (project.design && project.assignedInstaller && (project.status === 'Assigned' || project.status === 'Installation In Progress')) || 
                    project.status === 'Completed' || project.status === 'Design Complete' || project.status === 'Awaiting Client Review' ? 'bg-green-600' :
                    project.status === 'Design Submitted' ? 'bg-orange-600' :
                    project.status === 'Design In Progress' ? 'bg-purple-600' :
                    project.status === 'Assigned' ? 'bg-blue-600' :
                    'bg-gray-400'
                  }`}
                  style={{ 
                    width: (() => {
                      // If design exists and is approved, show 100%
                      if (project.design && (typeof project.design === 'object' && project.design.isApproved)) return '100%';
                      // If design exists and installer is assigned, design is likely complete
                      if (project.design && project.assignedInstaller && (project.status === 'Assigned' || project.status === 'Installation In Progress')) return '100%';
                      if (project.status === 'Completed' || project.status === 'Design Complete' || project.status === 'Awaiting Client Review') return '100%';
                      if (project.status === 'Design Submitted') return '90%';
                      if (project.status === 'Design In Progress') return '50%';
                      if (project.status === 'Assigned') return '10%';
                      return '0%';
                    })()
                  }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-600">Installation Progress</span>
                <span className="text-xs text-gray-600">
                  {project.status === 'Completed' ? '100%' :
                   project.status === 'Installation In Progress' ? `${project.installationProgress || 0}%` :
                   project.installationProgress && project.installationProgress > 0 ? `${project.installationProgress}%` :
                   project.scheduledInstallationDate ? '10%' :
                   project.assignedInstaller ? '10%' : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    project.status === 'Completed' ? 'bg-green-600' :
                    project.status === 'Installation In Progress' ? 'bg-indigo-600' :
                    project.installationProgress && project.installationProgress > 0 ? 'bg-yellow-600' :
                    project.scheduledInstallationDate ? 'bg-yellow-600' :
                    project.assignedInstaller ? 'bg-yellow-600' :
                    'bg-gray-400'
                  }`}
                  style={{ 
                    width: project.status === 'Completed' ? '100%' :
                           project.status === 'Installation In Progress' ? `${project.installationProgress || 0}%` :
                           project.installationProgress && project.installationProgress > 0 ? `${project.installationProgress}%` :
                           project.scheduledInstallationDate ? '10%' :
                           project.assignedInstaller ? '10%' : '0%'
                  }}
                ></div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm text-gray-600">
                {project.status === 'Completed' ? '100%' : 
                 project.status === 'New' ? '0%' :
                 project.status === 'Assigned' ? '20%' :
                 project.status === 'Design In Progress' ? '40%' :
                 project.status === 'Installation In Progress' ? `${project.installationProgress || 80}%` : '0%'}
              </span>
            </div>
            <ProgressBar status={project.status} />
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="border-t pt-4 space-y-3">
          {/* RESOLUTION: Keeping the clean description block */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
            <p className="text-sm text-gray-600">
              {project.description || 'No description provided'}
            </p>
          </div>
          
          {project.location && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Location</h4>
              <p className="text-sm text-gray-600">{project.location}</p>
            </div>
          )}

          {project.assignedTo && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Assigned To</h4>
              <p className="text-sm text-gray-600">{project.assignedTo}</p>
            </div>
          )}

          {/* RESOLUTION: Keeping the Admin Response block if it exists */}
          {project.adminResponse && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Admin Response</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-gray-700">{project.adminResponse}</p>
                {project.adminResponseDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    Response Date: {new Date(project.adminResponseDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          )}
          
          {project.updatedAt && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Last Updated</h4>
              <p className="text-sm text-gray-600">
                {new Date(project.updatedAt).toLocaleString()}
              </p>
            </div>
          )}

          {project.designNotes && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Design Notes</h4>
              <p className="text-sm text-gray-600">{project.designNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function Projects() {
  const { user, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Removed forceRender state and useEffect block

  // Real-time data update callback
  const handleDataUpdate = useCallback((newProjects) => {
    setProjects(newProjects);
    setLastUpdated(new Date());
  }, []);

  // Use real-time updates hook
  const { refresh } = useRealTimeUpdates(handleDataUpdate, 30000);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await requestsAPI.getAll();
      const projectsArray = response.data.requests || [];
      setProjects(projectsArray);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication required. Please login again.');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. You don\'t have permission to view projects.');
      } else {
        toast.error('Failed to fetch projects: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesFilter = filter === 'all' || project.status === filter;
    
    // RESOLUTION: Combine search logic to be comprehensive
    const searchString = (
      project.requirements?.campusName + ' ' +
      project.title + ' ' +
      project.description + ' ' +
      project.location
    ).toLowerCase();

    const matchesSearch = searchTerm === '' || searchString.includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  // RESOLUTION: Keeping the comprehensive list of statuses for the filter UI
  const statusCounts = useMemo(() => {
    const counts = { all: projects.length };
    const allStatuses = [
      'New', 'Assigned', 'Design In Progress', 'Design Submitted', 'Awaiting Client Review', 
      'Installation In Progress', 'Completed', 'Rejected'
    ];

    allStatuses.forEach(status => {
      counts[status] = projects.filter(p => p.status === status).length;
    });
    return counts;
  }, [projects]);


  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
            <p className="text-gray-600 mt-2">Track the status and progress of all your network projects</p>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <button
            onClick={refresh}
            className="btn-secondary flex items-center space-x-2"
            title="Refresh data"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="card text-center">
            <div className="text-2xl font-bold text-primary-600">{count}</div>
            <div className="text-sm text-gray-600 capitalize">{status}</div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(statusCounts).filter(s => statusCounts[s] > 0 || s === filter).map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {status} ({statusCounts[status]})
              </button>
            ))}
          </div>
        </div>
      </div>


      {/* Projects List */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-gray-500">
              {searchTerm || filter !== 'all' 
                ? 'No projects match your current filters'
                : 'You haven\'t submitted any projects yet'
              }
            </div>
          </div>
        ) : (
          filteredProjects.map(project => (
            <ProjectCard key={project._id} project={project} />
          ))
        )}
      </div>
    </div>
  );
}