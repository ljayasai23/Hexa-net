import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { requestsAPI } from '../../lib/api';
import { toast } from 'react-hot-toast';

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
      setProject(response.data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  if (router.isFallback || loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project details...</p>
        </div>
      </div>
    );
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {project.title || 'Project Details'}
        </h1>
        <p className="text-gray-600">
          Project ID: {id}
        </p>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Information</h2>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Title</h4>
            <p className="text-sm text-gray-600">{project.title || 'N/A'}</p>
          </div>
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
      <div className="card mt-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Progress</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm text-gray-600">{project.progress || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${project.progress || 0}%` }}
              ></div>
            </div>
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