import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { requestsAPI } from '../../lib/api';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ProjectDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (router.isReady && id) {
      fetchProject();
    }
  }, [router.isReady, id]);

  const fetchProject = async () => {
    setLoading(true);
    try {
      const response = await requestsAPI.getById(id);
      const projectData = response.data.request || response.data;
      setProject(projectData);
    } catch (error) {
      console.error('Failed to fetch project:', error);
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  if (router.isFallback || loading) {
    return <LoadingSpinner />;
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <p className="text-gray-600 mb-6">The project you're looking for doesn't exist or you don't have permission to view it.</p>
          <Link href="/projects" className="btn btn-primary">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <Link href="/projects" className="text-primary-600 hover:text-primary-700 flex items-center mb-4">
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {project.requirements?.campusName || project.title || 'Project Details'}
            </h1>
            <p className="text-gray-600">
              Project ID: {id}
            </p>
          </div>
          <button
            onClick={fetchProject}
            className="btn-secondary flex items-center space-x-2"
            title="Refresh project data"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Information</h2>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Campus Name</h4>
            <p className="text-sm text-gray-600">{project.requirements?.campusName || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Request Type</h4>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              project.requestType === 'Design Only' ? 'bg-blue-100 text-blue-800' :
              project.requestType === 'Installation Only' ? 'bg-green-100 text-green-800' :
              project.requestType === 'Both Design and Installation' ? 'bg-purple-100 text-purple-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {project.requestType || 'N/A'}
            </span>
          </div>
          {project.description && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
              <p className="text-sm text-gray-600">{project.description}</p>
            </div>
          )}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Status</h4>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              project.status === 'New' ? 'bg-blue-100 text-blue-800' :
              project.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
              project.status === 'Completed' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {project.status || 'Unknown'}
            </span>
          </div>
          {project.description && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
              <p className="text-sm text-gray-600">{project.description}</p>
            </div>
          )}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Created</h4>
            <p className="text-sm text-gray-600">
              {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="card mt-6 border-2 border-primary-200 bg-gradient-to-r from-primary-50 to-blue-50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">📊 Project Progress</h2>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary-600">{project?.progress || 0}%</div>
            <div className="text-sm text-gray-600">Complete</div>
          </div>
        </div>
        <div className="space-y-6">
          {/* Main Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-medium text-gray-700">Overall Progress</span>
              <span className="text-lg font-bold text-primary-600">{project?.progress || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-6 rounded-full transition-all duration-500 ease-out relative shadow-lg"
                style={{ width: `${Math.max(0, Math.min(100, project?.progress || 0))}%` }}
              >
                <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg border-2 ${
              (project.progress || 0) >= 0 ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  (project.progress || 0) >= 0 ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <span className="text-sm font-medium">Project Submitted</span>
              </div>
            </div>

            <div className={`p-4 rounded-lg border-2 ${
              (project.progress || 0) >= 20 ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  (project.progress || 0) >= 20 ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <span className="text-sm font-medium">Assigned</span>
              </div>
            </div>

            <div className={`p-4 rounded-lg border-2 ${
              (project.progress || 0) >= 50 ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  (project.progress || 0) >= 50 ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <span className="text-sm font-medium">Design Complete</span>
              </div>
            </div>

            <div className={`p-4 rounded-lg border-2 ${
              (project.progress || 0) >= 100 ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  (project.progress || 0) >= 100 ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <span className="text-sm font-medium">Completed</span>
              </div>
            </div>
          </div>

          {/* Status Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-blue-900">Current Status</span>
            </div>
            <p className="text-sm text-blue-800">
              {project.status === 'New' && 'Your project has been submitted and is awaiting review.'}
              {project.status === 'Assigned' && 'Your project has been assigned to a designer and work is beginning.'}
              {project.status === 'Design In Progress' && 'The design phase is currently in progress.'}
              {project.status === 'Design Complete' && 'The design phase has been completed.'}
              {project.status === 'Installation In Progress' && 'Installation is currently in progress.'}
              {project.status === 'Completed' && 'Your project has been completed successfully!'}
            </p>
          </div>
        </div>
      </div>


      {/* Admin Response Section */}
      {project.adminResponse && (
        <div className="card mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Response</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">{project.adminResponse}</p>
            {project.adminResponseDate && (
              <p className="text-xs text-gray-500 mt-2">
                Response Date: {new Date(project.adminResponseDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Project Timeline */}
      <div className="card mt-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Timeline</h2>
        <div className="space-y-3">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Project Submitted</p>
              <p className="text-xs text-gray-500">
                {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
          
          {project.adminResponse && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Admin Response</p>
                <p className="text-xs text-gray-500">
                  {project.adminResponseDate ? new Date(project.adminResponseDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          )}
          
          {project.status === 'Completed' && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Project Completed</p>
                <p className="text-xs text-gray-500">
                  {project.completedAt ? new Date(project.completedAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}