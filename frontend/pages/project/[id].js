import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { requestsAPI, designsAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatRequestType, getRequestTypeBadgeColor, getRequestTypeIcon } from '../../utils/requestUtils';

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
      
      // 2. Fetch Design (if design exists - could be ID or object)
      if (req.design) {
        try {
          const designResponse = await designsAPI.getByRequest(id); 
          const fetchedDesign = designResponse.data.design;
          setDesign(fetchedDesign);
          console.log('ProjectDetail: Fetched design:', {
            hasReportPdfUrl: !!fetchedDesign?.reportPdfUrl,
            isApproved: fetchedDesign?.isApproved,
            reportPdfUrl: fetchedDesign?.reportPdfUrl
          });
        } catch (error) {
          console.error('ProjectDetail: Failed to fetch design:', error);
          // Don't show error toast - design might not exist yet
        }
      } else {
        console.log('ProjectDetail: No design field in request');
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

  // --- Client Acceptance View Logic ---
  // FIX: Use safe navigation on user._id to prevent crashes while state initializes
  const isClient = user?.role === 'Client' && (request?.client?._id?.toString() === user?._id?.toString());
  
  const showAcceptView = isClient && request?.status === 'Awaiting Client Review';
  
  // FIX: Ensure PDF URL is constructed correctly for static file access (stripping /api)
  const pdfUrl = design?.reportPdfUrl 
    ? `${process.env.NEXT_PUBLIC_API_URL.replace('/api', '')}${design.reportPdfUrl}` 
    : null;
  
  // CRITICAL: Check if design is approved (handle undefined/null as false)
  const isDesignApproved = design?.isApproved === true;
  
  // Debug logging - must be called before any early returns
  useEffect(() => {
    if (design && request) {
      console.log('ProjectDetail: Design visibility check:', {
        hasDesign: !!design,
        hasPdfUrl: !!pdfUrl,
        isApproved: isDesignApproved,
        status: request.status,
        shouldShow: design && pdfUrl && isDesignApproved && (
          request.status === 'Completed' || 
          request.status === 'Awaiting Client Review' || 
          request.status === 'Design Complete' ||
          request.status === 'Design Submitted' ||
          request.status === 'Assigned' ||
          request.status === 'Installation In Progress'
        )
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, pdfUrl, isDesignApproved, request]);

  if (!router.isReady || loading) {
    return (
        <LoadingSpinner />
    );
  }
  
  if (!request) {
      return <div className="max-w-4xl mx-auto p-6 text-red-600">Project data not found or inaccessible.</div>;
  }
  // ------------------------------------

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <Link href="/dashboard" className="text-primary-600 hover:text-primary-700 flex items-center mb-4">
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        <div className="flex items-center space-x-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Project: {request.requirements.campusName}
          </h1>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRequestTypeBadgeColor(request.requestType)}`}>
            {getRequestTypeIcon(request.requestType)} {formatRequestType(request.requestType)}
          </span>
        </div>
        <p className="text-gray-600">
          Project ID: {id}
        </p>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Information</h2>
        <div className="space-y-4">
          
          {/* Request Type Display */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Request Type</h4>
            <p className="text-lg font-semibold text-gray-900">
              {formatRequestType(request.requestType)}
            </p>
          </div>
          
          {/* Status Display */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Status</h4>
            <p className={`text-lg font-bold ${
              request.status === 'Awaiting Client Review' ? 'text-teal-600' : 
              request.status === 'Completed' ? 'text-green-600' :
              'text-gray-600'
            }`}>
              {request.status}
            </p>
          </div>
          
          {/* Progress Display - Always show progress bars */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Project Progress</h4>
            
            {/* Dual bars for Both Design and Installation */}
            {request.requestType === 'Both Design and Installation' ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <h5 className="text-xs font-medium text-gray-600">Design Progress</h5>
                    <span className="text-xs text-gray-600">
                      {(() => {
                        // If design exists and is approved, design is 100% complete (regardless of status)
                        if (design && design.isApproved) return '100%';
                        // If design exists and installer is assigned, design is likely complete
                        if (request.design && request.assignedInstaller && (request.status === 'Assigned' || request.status === 'Installation In Progress')) return '100%';
                        // Otherwise, check status
                        if (request.status === 'Completed' || request.status === 'Design Complete' || request.status === 'Awaiting Client Review') return '100%';
                        if (request.status === 'Design Submitted') return '90%';
                        if (request.status === 'Design In Progress') return '50%';
                        if (request.status === 'Assigned') return '10%';
                        return '0%';
                      })()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all ${
                        // If design exists and is approved, design is 100% complete (green)
                        (design && design.isApproved) || request.status === 'Completed' || request.status === 'Design Complete' || request.status === 'Awaiting Client Review' ? 'bg-green-600' :
                        request.status === 'Design Submitted' ? 'bg-orange-600' :
                        request.status === 'Design In Progress' ? 'bg-purple-600' :
                        request.status === 'Assigned' ? 'bg-blue-600' :
                        'bg-gray-400'
                      }`}
                      style={{ 
                        width: (() => {
                          // If design exists and is approved, design is 100% complete (regardless of status)
                          if (design && design.isApproved) return '100%';
                          // If design exists and installer is assigned, design is likely complete
                          if (request.design && request.assignedInstaller && (request.status === 'Assigned' || request.status === 'Installation In Progress')) return '100%';
                          // Otherwise, check status
                          if (request.status === 'Completed' || request.status === 'Design Complete' || request.status === 'Awaiting Client Review') return '100%';
                          if (request.status === 'Design Submitted') return '90%';
                          if (request.status === 'Design In Progress') return '50%';
                          if (request.status === 'Assigned') return '10%';
                          return '0%';
                        })()
                      }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <h5 className="text-xs font-medium text-gray-600">Installation Progress</h5>
                    <span className="text-xs text-gray-600">
                      {request.status === 'Completed' ? '100%' :
                       request.status === 'Installation In Progress' ? `${request.installationProgress || 0}%` :
                       request.installationProgress && request.installationProgress > 0 ? `${request.installationProgress}%` :
                       request.scheduledInstallationDate ? '10%' :
                       request.assignedInstaller ? '10%' : '0%'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all ${
                        request.status === 'Completed' ? 'bg-green-600' :
                        request.status === 'Installation In Progress' ? 'bg-indigo-600' :
                        request.installationProgress && request.installationProgress > 0 ? 'bg-yellow-600' :
                        request.scheduledInstallationDate ? 'bg-yellow-600' :
                        request.assignedInstaller ? 'bg-yellow-600' :
                        'bg-gray-400'
                      }`}
                      style={{ 
                        width: request.status === 'Completed' ? '100%' :
                               request.status === 'Installation In Progress' ? `${request.installationProgress || 0}%` :
                               request.installationProgress && request.installationProgress > 0 ? `${request.installationProgress}%` :
                               request.scheduledInstallationDate ? '10%' :
                               request.assignedInstaller ? '10%' : '0%'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : request.requestType === 'Installation Only' ? (
              /* Installation Progress bar for Installation Only requests */
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Installation Progress</span>
                  <span className="text-xs text-gray-600">
                    {request.status === 'Completed' ? '100%' :
                     request.status === 'Installation In Progress' ? `${request.installationProgress || 0}%` :
                     request.installationProgress && request.installationProgress > 0 ? `${request.installationProgress}%` :
                     request.scheduledInstallationDate ? '10%' :
                     request.assignedInstaller ? '10%' : '0%'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all ${
                      request.status === 'Completed' ? 'bg-green-600' :
                      request.status === 'Installation In Progress' ? 'bg-indigo-600' :
                      request.installationProgress && request.installationProgress > 0 ? 'bg-yellow-600' :
                      request.scheduledInstallationDate ? 'bg-yellow-600' :
                      request.assignedInstaller ? 'bg-yellow-600' :
                      'bg-gray-400'
                    }`}
                    style={{ 
                      width: request.status === 'Completed' ? '100%' :
                             request.status === 'Installation In Progress' ? `${request.installationProgress || 0}%` :
                             request.installationProgress && request.installationProgress > 0 ? `${request.installationProgress}%` :
                             request.scheduledInstallationDate ? '10%' :
                             request.assignedInstaller ? '10%' : '0%'
                    }}
                  ></div>
                </div>
              </div>
            ) : (
              /* Design Progress bar for Design Only requests */
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Design Progress</span>
                  <span className="text-xs text-gray-600">
                    {(() => {
                      // If design exists and is approved, design is 100% complete (regardless of status)
                      if (design && design.isApproved) return '100%';
                      // If design exists and installer is assigned, design is likely complete
                      if (request.design && request.assignedInstaller && (request.status === 'Assigned' || request.status === 'Installation In Progress')) return '100%';
                      // Otherwise, check status
                      if (request.status === 'Completed' || request.status === 'Design Complete' || request.status === 'Awaiting Client Review') return '100%';
                      if (request.status === 'Design Submitted') return '90%';
                      if (request.status === 'Design In Progress') return '50%';
                      if (request.status === 'Assigned') return '10%';
                      return '0%';
                    })()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all ${
                      // If design exists and is approved, design is 100% complete (green)
                      (design && design.isApproved) || request.status === 'Completed' || request.status === 'Design Complete' || request.status === 'Awaiting Client Review' ? 'bg-green-600' :
                      request.status === 'Design Submitted' ? 'bg-orange-600' :
                      request.status === 'Design In Progress' ? 'bg-purple-600' :
                      request.status === 'Assigned' ? 'bg-blue-600' :
                      'bg-gray-400'
                    }`}
                    style={{ 
                      width: (() => {
                        // If design exists and is approved, design is 100% complete (regardless of status)
                        if (design && design.isApproved) return '100%';
                        // If design exists and installer is assigned, design is likely complete
                        if (request.design && request.assignedInstaller && (request.status === 'Assigned' || request.status === 'Installation In Progress')) return '100%';
                        // Otherwise, check status
                        if (request.status === 'Completed' || request.status === 'Design Complete' || request.status === 'Awaiting Client Review') return '100%';
                        if (request.status === 'Design Submitted') return '90%';
                        if (request.status === 'Design In Progress') return '50%';
                        if (request.status === 'Assigned') return '10%';
                        return '0%';
                      })()
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          
          {/* --- CRITICAL: CLIENT ACCEPTANCE SECTION (Only shows after admin approval) --- */}
          {showAcceptView && pdfUrl && isDesignApproved && (
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
          
          {/* Show message if design exists but not approved yet */}
          {isClient && design && design.reportPdfUrl && !isDesignApproved && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
              <h4 className="text-md font-bold text-yellow-800 mb-2">Design Pending Approval</h4>
              <p className="text-sm text-yellow-700">
                The designer has generated a design for your project, but it is currently pending admin review and approval. 
                You will be notified once the admin approves the design and you can review it.
              </p>
            </div>
          )}
          {/* ------------------------------------------------------------------ */}
          
          {/* --- DESIGN REPORT SECTION (Shows only after admin approval) --- */}
          {/* Show PDF if design exists, has PDF URL, is approved, and status indicates design is complete */}
          {design && pdfUrl && isDesignApproved && (
            request.status === 'Completed' || 
            request.status === 'Awaiting Client Review' || 
            request.status === 'Design Complete' ||
            request.status === 'Design Submitted' ||
            request.status === 'Assigned' ||
            request.status === 'Installation In Progress'
          ) && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6">
              <h4 className="text-md font-bold text-blue-800 mb-2">
                {request.status === 'Completed' ? '✅ Project Completed - Design Report' : '📄 Approved Design Report'}
              </h4>
              <p className="text-sm text-blue-700 mb-4">
                {request.status === 'Completed' 
                  ? 'This project has been completed. You can review the final design report below.'
                  : 'The admin has approved this design. Please review the design report below.'}
              </p>
              
              <a 
                  href={pdfUrl}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View & Download Design Report
              </a>
            </div>
          )}
          
          {/* Original Project Details */}
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

          {/* Installation Schedule Information */}
          {request.scheduledInstallationDate && (
            <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 mt-4">
              <h4 className="text-md font-bold text-indigo-800 mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Installation Team Arrival
              </h4>
              <p className="text-sm text-indigo-700 mb-2">
                The installation team is scheduled to arrive on:
              </p>
              <p className="text-lg font-semibold text-indigo-900">
                {new Date(request.scheduledInstallationDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              {request.installationNotes && (
                <div className="mt-3 pt-3 border-t border-indigo-200">
                  <p className="text-xs font-medium text-indigo-600 mb-1">Installation Notes:</p>
                  <p className="text-sm text-indigo-700">{request.installationNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Installation Progress - Show when scheduled or in progress */}
          {(request.scheduledInstallationDate || request.status === 'Installation In Progress' || request.installationProgress > 0) && (
            <div className="bg-purple-50 border-l-4 border-purple-400 p-4 mt-4">
              <h4 className="text-md font-bold text-purple-800 mb-2">Installation Progress</h4>
              <div className="w-full bg-purple-200 rounded-full h-3 mb-2">
                <div 
                  className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${request.installationProgress || 0}%` }}
                ></div>
              </div>
              <p className="text-sm text-purple-700">
                {request.status === 'Completed' ? '100% Complete' :
                 request.status === 'Installation In Progress' ? `${request.installationProgress || 0}% Complete` :
                 request.scheduledInstallationDate ? 'Scheduled - Not Started' :
                 '0% Complete'}
              </p>
              {request.installationNotes && (
                <p className="text-sm text-purple-600 mt-2 italic">{request.installationNotes}</p>
              )}
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
