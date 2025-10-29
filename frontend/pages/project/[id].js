import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { requestsAPI, designsAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ProjectDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [design, setDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1. Fetch Request
      const requestResponse = await requestsAPI.getById(id);
      const req = requestResponse.data.request;
      setRequest(req);
      
      // 2. Fetch Design (if design exists)
      if (req.design) {
        const designResponse = await designsAPI.getByRequest(id); 
        setDesign(designResponse.data.design);
      }
    } catch (error) {
      toast.error('Failed to fetch project data. It may not exist or you lack permission.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (router.isReady && id && user) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, id, user, refreshToggle]);

  const handleClientAccept = async () => {
    // Reality check: Warn user if they proceed without confirming PDF link is okay
    if (!design?.reportPdfUrl) {
      toast.error('Cannot accept: PDF report is missing or did not load.');
      return;
    }
    
    setIsAccepting(true);
    try {
      await requestsAPI.markClientComplete(request._id);
      toast.success('Design accepted! Project marked as Completed.');
      setRefreshToggle(p => !p); // Refresh data
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark as accepted.');
    } finally {
      setIsAccepting(false);
    }
  };

  if (!router.isReady || loading) {
    return (
        <LoadingSpinner />
    );
  }
  
  if (!request) {
      // KEEPING the robust handling for missing projects
      return <div className="max-w-4xl mx-auto p-6 text-red-600">Project data not found or inaccessible.</div>;
  }

  // --- Client Acceptance View Logic ---
  // RESOLUTION: Safest client/user ID comparison (Prevents the crash)
  const isClient = user?.role === 'Client' && (request?.client?._id?.toString() === user?._id?.toString());
  
  const showAcceptView = isClient && request.status === 'Awaiting Client Review';
  
  // RESOLUTION: Corrected pdfUrl construction
  const pdfUrl = design?.reportPdfUrl 
    ? `${process.env.NEXT_PUBLIC_API_URL.replace('/api', '')}${design.reportPdfUrl}` 
    : null;
  // ------------------------------------

  // RESOLUTION: Combining the best parts of the conflicting JSX blocks
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
          Project: {request.requirements?.campusName || 'Details'}
        </h1>
        <p className="text-gray-600">
          Project ID: {id}
        </p>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Information</h2>
        <div className="space-y-4">
          
          {/* Status Display */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Status</h4>
            <p className={`text-lg font-bold ${request.status === 'Awaiting Client Review' ? 'text-teal-600' : 'text-gray-600'}`}>
              {request.status}
            </p>
          </div>
          
          {/* --- CRITICAL: CLIENT ACCEPTANCE SECTION (The PDF/Accept buttons) --- */}
          {showAcceptView && pdfUrl && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mt-6">
              <h4 className="text-md font-bold text-green-800 mb-2">Action Required: Review Design Report</h4>
              <p className="text-sm text-green-700 mb-4">The Admin has approved the final design. Please review the attached PDF report.</p>
              
              <div className="flex items-center space-x-3">
                <a 
                    href={pdfUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    View & Download Approved PDF
                </a>
                
                <button
                  onClick={handleClientAccept}
                  disabled={isAccepting}
                  className="btn-primary bg-green-600 hover:bg-green-700"
                >
                  {isAccepting ? 'Accepting...' : 'Design Accepted'}
                </button>
              </div>
            </div>
          )}
          {/* ------------------------------------------------------------------ */}
          
          {/* Original Project Details (Resolved to be clean) */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
            <p className="text-sm text-gray-600">{request.description || 'N/A'}</p>
          </div>
          
          {/* Display Design Notes from Admin/Designer if available */}
          {design?.designNotes && (
              <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Admin/Designer Notes</h4>
                  <p className="text-sm text-gray-600 italic border-l-2 border-gray-300 pl-2">{design.designNotes}</p>
              </div>
          )}
          
        </div>
      </div>
    </div>
  );
}