import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { requestsAPI, designsAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatRequestType, getRequestTypeBadgeColor, getRequestTypeIcon } from '../utils/requestUtils';

export default function ProjectDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [design, setDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);

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
  
  // --- Installer Check Logic ---
  const isInstaller = user?.role === 'Network Installation Team';
  const installerId = request?.assignedInstaller?._id || request?.assignedInstaller;
  const isAssignedInstaller = isInstaller && installerId && installerId.toString() === user?._id?.toString();
  
  // --- PDF URL Construction ---
  // FIX: Ensure PDF URL is constructed correctly for static file access
  const getApiBaseUrl = () => {
    // In browser, try to get the API base URL from localStorage (set by axios interceptor)
    if (typeof window !== 'undefined') {
      // Try to get from localStorage first (set by API interceptor)
      const storedApiUrl = localStorage.getItem('apiBaseUrl');
      if (storedApiUrl) {
        return storedApiUrl;
      }
      
      // Try environment variable
      if (process.env.NEXT_PUBLIC_API_URL) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        return apiUrl.replace('/api', '');
      }
      
      // Fallback: use server IP directly
      return 'http://192.168.43.206:5000';
    }
    
    // Server-side or fallback
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    return apiUrl.replace('/api', '');
  };
  
  const pdfUrl = design?.reportPdfUrl 
    ? `${getApiBaseUrl()}${design.reportPdfUrl}` 
    : null;
  
  // CRITICAL: Check if design is approved (handle undefined/null as false)
  // Must be defined before showAcceptView uses it
  const isDesignApproved = design?.isApproved === true;
  
  // Show accept view when client can accept the design
  // Show when: status is "Awaiting Client Review" OR design is approved and status allows acceptance
  const showAcceptView = isClient && (
    request?.status === 'Awaiting Client Review' || 
    (isDesignApproved && design?.isApproved && request?.status !== 'Completed' && request?.status !== 'Design Complete')
  );
  
  // Debug logging for PDF visibility
  useEffect(() => {
    if (design && request && user) {
      console.log('PDF Visibility Check:', {
        userRole: user.role,
        isClient: isClient,
        hasDesign: !!design,
        hasPdfUrl: !!pdfUrl,
        isDesignApproved: isDesignApproved,
        designIsApproved: design.isApproved,
        shouldShowForClient: isClient && isDesignApproved && design.isApproved === true,
        shouldShowForNonClient: !isClient && design.reportPdfUrl,
        willShow: (isClient && isDesignApproved && design.isApproved === true) || (!isClient && design.reportPdfUrl)
      });
    }
  }, [design, pdfUrl, isDesignApproved, isClient, request, user]);
  
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
        <Link href="/projects" className="text-primary-600 hover:text-primary-700 flex items-center mb-4">
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
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
                        // If design exists (even if not approved yet), and status indicates installer is assigned, design is likely complete
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
                      {(() => {
                        // For "Both Design and Installation" requests, installation progress should only show 100% if:
                        // 1. Status is "Completed" AND installer is assigned (installation was actually done)
                        // OR
                        // 2. Status is "Installation In Progress" (installation is ongoing)
                        if (request.requestType === 'Both Design and Installation') {
                          if (request.status === 'Completed' && request.assignedInstaller) {
                            return '100%';
                          }
                          if (request.status === 'Installation In Progress') {
                            return `${request.installationProgress || 0}%`;
                          }
                          if (request.installationProgress && request.installationProgress > 0) {
                            return `${request.installationProgress}%`;
                          }
                          if (request.scheduledInstallationDate) {
                            return '10%';
                          }
                          if (request.assignedInstaller) {
                            return '10%';
                          }
                          return '0%';
                        }
                        // For "Installation Only" requests, use the original logic
                        return request.status === 'Completed' ? '100%' :
                               request.status === 'Installation In Progress' ? `${request.installationProgress || 0}%` :
                               request.installationProgress && request.installationProgress > 0 ? `${request.installationProgress}%` :
                               request.scheduledInstallationDate ? '10%' :
                               request.assignedInstaller ? '10%' : '0%';
                      })()}
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
                        width: (() => {
                          // For "Both Design and Installation" requests, installation progress should only show 100% if:
                          // 1. Status is "Completed" AND installer is assigned (installation was actually done)
                          if (request.requestType === 'Both Design and Installation') {
                            if (request.status === 'Completed' && request.assignedInstaller) {
                              return '100%';
                            }
                            if (request.status === 'Installation In Progress') {
                              return `${request.installationProgress || 0}%`;
                            }
                            if (request.installationProgress && request.installationProgress > 0) {
                              return `${request.installationProgress}%`;
                            }
                            if (request.scheduledInstallationDate) {
                              return '10%';
                            }
                            if (request.assignedInstaller) {
                              return '10%';
                            }
                            return '0%';
                          }
                          // For "Installation Only" requests, use the original logic
                          if (request.status === 'Completed') return '100%';
                          if (request.status === 'Installation In Progress') {
                            return `${request.installationProgress || 0}%`;
                          }
                          if (request.installationProgress && request.installationProgress > 0) {
                            return `${request.installationProgress}%`;
                          }
                          if (request.scheduledInstallationDate) return '10%';
                          if (request.assignedInstaller) return '10%';
                          return '0%';
                        })()
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
                      width: (() => {
                        // Always show 100% if status is Completed
                        if (request.status === 'Completed') return '100%';
                        // Show actual progress if installation is in progress
                        if (request.status === 'Installation In Progress') {
                          return `${request.installationProgress || 0}%`;
                        }
                        // Show installationProgress if it's set and > 0
                        if (request.installationProgress && request.installationProgress > 0) {
                          return `${request.installationProgress}%`;
                        }
                        // Show 10% if scheduled
                        if (request.scheduledInstallationDate) return '10%';
                        // Show 10% if installer is assigned
                        if (request.assignedInstaller) return '10%';
                        // Default to 0%
                        return '0%';
                      })()
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
          
          {/* Show message if design exists but not approved yet (only show if design is NOT approved) */}
          {user?.role === 'Client' && design && design.reportPdfUrl && !isDesignApproved && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
              <h4 className="text-md font-bold text-yellow-800 mb-2">Design Pending Approval</h4>
              <p className="text-sm text-yellow-700">
                {request?.status === 'Design In Progress' 
                  ? 'The designer has generated a design for your project, but it has not been submitted to the admin yet. You will be notified once the designer submits it and the admin approves it.'
                  : request?.status === 'Design Submitted'
                  ? 'The designer has submitted the design to the admin for review. You will be notified once the admin approves the design and forwards it to you.'
                  : 'The design is currently pending admin review and approval. You will be notified once the admin approves the design and you can review it.'}
              </p>
            </div>
          )}
          
          {/* Show installation pending message if design is approved but installation hasn't started */}
          {user?.role === 'Client' && design && isDesignApproved && request?.requestType === 'Both Design and Installation' && !request?.scheduledInstallationDate && request?.status !== 'Completed' && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6">
              <h4 className="text-md font-bold text-blue-800 mb-2">Installation Pending</h4>
              <p className="text-sm text-blue-700">
                Your design has been approved! The installer will propose installation dates and start the physical installation work. You will be notified once the installation date is scheduled.
              </p>
            </div>
          )}
          {/* ------------------------------------------------------------------ */}
          
          {/* --- DESIGN REPORT SECTION --- */}
          {/* Show PDF if design exists and has PDF URL */}
          {/* For clients: ONLY show if approved by admin */}
          {/* For designers/admins/installers: show if PDF exists (they can review before approval) */}
          {(() => {
            // Explicitly check if we should show the PDF
            if (!design || !pdfUrl) return false;
            
            // Check user role directly (more reliable than isClient which depends on client ID matching)
            const userIsClient = user?.role === 'Client';
            
            // If user is a client, show PDF if:
            // 1. Design is approved by admin (design.isApproved === true)
            // 2. Design was approved (can view after admin approval, regardless of current status)
            if (userIsClient) {
              const isApproved = isDesignApproved === true && design.isApproved === true;
              // Once approved, client can always view it (even after accepting/completing)
              return isApproved;
            }
            
            // If user is NOT a client (designer, admin, installer), show if PDF exists
            // They can review it even before submission/approval
            if (!userIsClient) {
              return !!design.reportPdfUrl;
            }
            
            // Default: don't show if we can't determine user role
            return false;
          })() && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6">
              <h4 className="text-md font-bold text-blue-800 mb-2">
                {request.status === 'Completed' ? '✅ Project Completed - Design Report' : 
                 isDesignApproved ? '📄 Approved Design Report' : 
                 '📄 Design Report'}
              </h4>
              <p className="text-sm text-blue-700 mb-4">
                {request.status === 'Completed' 
                  ? 'This project has been completed. You can review the final design report below.'
                  : isDesignApproved
                  ? 'The admin has approved this design. Please review the design report below and accept it to proceed.'
                  : 'The design report is available for review.'}
              </p>
              
              <div className="flex items-center space-x-3 flex-wrap gap-2">
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
                
                {/* Accept Design Button - Show when design is approved and client hasn't accepted yet */}
                {/* Show for clients when: design is approved AND status allows acceptance */}
                {user?.role === 'Client' && isDesignApproved && design?.isApproved && 
                 request?.status !== 'Completed' && request?.status !== 'Design Complete' && (
                  <button
                    onClick={() => setShowApproveModal(true)}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Send Approval Request to Admin
                  </button>
                )}
              </div>
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

          {/* Installation Notes - Show when available */}
          {request.installationNotes && !request.scheduledInstallationDate && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
              <h4 className="text-md font-bold text-blue-800 mb-2">Installation Notes</h4>
              <p className="text-sm text-blue-700 whitespace-pre-line">{request.installationNotes}</p>
            </div>
          )}

          {/* Client Verification Section - Show when installation is completed */}
          {/* Show for requests that have installation (Both Design and Installation, or Installation Only) */}
          {/* Also check if installer was assigned, which indicates installation work was done */}
          {user?.role === 'Client' && 
           request?.status === 'Completed' && 
           request?.assignedInstaller &&
           (request?.requestType === 'Both Design and Installation' || 
            request?.requestType === 'Installation Only' ||
            (request?.installationProgress > 0 && request?.scheduledInstallationDate)) && (
            <div className={`border-l-4 p-4 mt-6 ${request.clientVerified ? 'bg-green-50 border-green-400' : 'bg-yellow-50 border-yellow-400'}`}>
              <h4 className={`text-md font-bold mb-2 ${request.clientVerified ? 'text-green-800' : 'text-yellow-800'}`}>
                {request.clientVerified ? '✅ Installation Verified' : '⏳ Installation Verification Required'}
              </h4>
              {request.clientVerified ? (
                <div>
                  <p className="text-sm text-green-700 mb-2">
                    You have verified that the installation has been completed successfully.
                  </p>
                  {request.clientVerificationDate && (
                    <p className="text-xs text-green-600">
                      Verified on: {new Date(request.clientVerificationDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                  {request.clientVerificationNotes && (
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <p className="text-xs font-medium text-green-600 mb-1">Your Verification Notes:</p>
                      <p className="text-sm text-green-700">{request.clientVerificationNotes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-yellow-700 mb-4">
                    The installer has marked the installation as completed. Please verify that the installation work has been completed successfully and confirm below.
                  </p>
                  <button
                    onClick={() => setShowVerifyModal(true)}
                    className="btn-primary bg-green-600 hover:bg-green-700"
                  >
                    Verify Installation Completion
                  </button>
                </div>
              )}
            </div>
          )}

          {/* --- INSTALLER ACTIONS SECTION --- */}
          {isAssignedInstaller && (
            <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 mt-6">
              <h4 className="text-md font-bold text-indigo-800 mb-3">Installation Actions</h4>
              
              {/* Show propose date button for pending projects */}
              {((request.status === 'Design Complete' || 
                 request.status === 'Awaiting Client Review' || 
                 request.status === 'Assigned' ||
                 (request.requestType === 'Installation Only' && (request.status === 'New' || request.status === 'Assigned'))) && 
                !request.scheduledInstallationDate) && (
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="btn-primary bg-green-600 hover:bg-green-700 mb-2 mr-2"
                >
                  Propose Installation Date
                </button>
              )}
              
              {/* Show start installation button for scheduled projects */}
              {request.scheduledInstallationDate && request.status !== 'Installation In Progress' && (
                <button
                  onClick={async () => {
                    try {
                      await requestsAPI.updateInstallationProgress(request._id, {
                        installationProgress: 10,
                        installationNotes: 'Installation started'
                      });
                      toast.success('Installation started!');
                      setRefreshToggle(p => !p);
                    } catch (error) {
                      toast.error('Failed to start installation');
                    }
                  }}
                  className="btn-primary bg-indigo-600 hover:bg-indigo-700 mb-2 mr-2"
                >
                  Start Installation
                </button>
              )}
              
              {/* Show update progress and complete buttons for in-progress installations */}
              {/* Only show complete button if installation date was proposed and work has started */}
              {request.status === 'Installation In Progress' && (
                <>
                  <button
                    onClick={() => setShowProgressModal(true)}
                    className="btn-primary bg-blue-600 hover:bg-blue-700 mb-2 mr-2"
                  >
                    Update Progress
                  </button>
                  {/* Only show Mark Complete if installation date was proposed and progress > 0 */}
                  {request.scheduledInstallationDate && request.installationProgress > 0 && (
                    <button
                      onClick={() => setShowCompleteModal(true)}
                      className="btn-primary bg-green-600 hover:bg-green-700 mb-2"
                    >
                      Mark Complete
                    </button>
                  )}
                  {/* Show warning if prerequisites not met */}
                  {(!request.scheduledInstallationDate || !request.installationProgress || request.installationProgress <= 0) && (
                    <div className="text-xs text-yellow-600 mt-2 mb-2">
                      {!request.scheduledInstallationDate && (
                        <p>⚠️ Please propose an installation date first.</p>
                      )}
                      {request.scheduledInstallationDate && (!request.installationProgress || request.installationProgress <= 0) && (
                        <p>⚠️ Please start the installation work first.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
        </div>
      </div>

      {/* Installer Modals */}
      {showScheduleModal && request && (
        <ScheduleModal
          request={request}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => {
            setRefreshToggle(p => !p);
            setShowScheduleModal(false);
          }}
        />
      )}

      {showProgressModal && request && (
        <ProgressModal
          request={request}
          onClose={() => setShowProgressModal(false)}
          onSuccess={() => {
            setRefreshToggle(p => !p);
            setShowProgressModal(false);
          }}
        />
      )}

      {showCompleteModal && request && (
        <CompleteModal
          request={request}
          onClose={() => setShowCompleteModal(false)}
          onSuccess={() => {
            setRefreshToggle(p => !p);
            setShowCompleteModal(false);
          }}
        />
      )}

      {showVerifyModal && request && (
        <VerifyInstallationModal
          request={request}
          onSuccess={() => {
            setShowVerifyModal(false);
            setRefreshToggle(p => !p);
          }}
          onClose={() => setShowVerifyModal(false)}
        />
      )}

      {showApproveModal && request && (
        <ApproveDesignModal
          request={request}
          design={design}
          onSuccess={() => {
            setShowApproveModal(false);
            setRefreshToggle(p => !p);
          }}
          onClose={() => setShowApproveModal(false)}
        />
      )}
    </div>
  );
}

// Schedule Installation Modal
const ScheduleModal = ({ request, onClose, onSuccess }) => {
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalDate = scheduledDate && scheduledTime 
        ? `${scheduledDate}T${scheduledTime}` 
        : scheduledDate 
        ? `${scheduledDate}T09:00` 
        : null;
      
      if (!finalDate) {
        toast.error('Please select a date and time');
        return;
      }

      await requestsAPI.scheduleInstallation(request._id, {
        scheduledInstallationDate: finalDate,
        installationNotes: notes
      });
      toast.success('Installation date proposed successfully!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to schedule installation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-xl font-medium text-gray-900 mb-2">Propose Installation Date</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Installation Date *
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="input-field"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Time *
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="input-field"
                placeholder="Equipment needed, special requirements, access instructions, etc."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Submitting...' : 'Propose Installation Date'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Update Progress Modal
const ProgressModal = ({ request, onClose, onSuccess }) => {
  const [progress, setProgress] = useState(request.installationProgress || 0);
  const [notes, setNotes] = useState(request.installationNotes || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestsAPI.updateInstallationProgress(request._id, {
        installationProgress: progress,
        installationNotes: notes
      });
      toast.success('Progress updated successfully!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update progress');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-xl font-medium text-gray-900 mb-4">Update Installation Progress</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Installation Progress: {progress}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Progress Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="input-field"
                placeholder="Update on installation progress, issues encountered, next steps, etc."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Updating...' : 'Update Progress'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Approve Design Modal (Client)
const ApproveDesignModal = ({ request, design, onClose, onSuccess }) => {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Check if PDF exists
      if (!design?.reportPdfUrl) {
        toast.error('Cannot approve: PDF report is missing or did not load.');
        setLoading(false);
        return;
      }

      await requestsAPI.markClientComplete(request._id);
      toast.success('Design approval request sent to admin successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send approval request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-medium text-gray-900">Send Design Approval Request to Admin</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
            <p className="text-sm text-blue-700">
              <strong>📋 Project:</strong> {request.requirements?.campusName || 'N/A'}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              <strong>📄 Design Report:</strong> {design?.reportPdfUrl ? 'Available' : 'Not Available'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approval Notes (Optional)
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={4}
                className="input-field"
                placeholder="Add any comments or feedback about the design (optional)..."
              />
              <p className="text-xs text-gray-500 mt-1">
                You can add any comments or feedback about the approved design. This will be sent to the admin.
              </p>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
              <p className="text-sm text-yellow-700">
                <strong>Note:</strong> By submitting this approval, you confirm that you have reviewed the design report and approve it. The admin will be notified of your approval.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !design?.reportPdfUrl}
                className="btn-primary bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Send Approval Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Verify Installation Modal (Client)
const VerifyInstallationModal = ({ request, onClose, onSuccess }) => {
  const [verificationNotes, setVerificationNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestsAPI.verifyInstallation(request._id, {
        verificationNotes: verificationNotes.trim() || undefined
      });
      toast.success('Installation verified successfully! Admin has been notified.');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to verify installation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-xl font-medium text-gray-900 mb-2">Verify Installation Completion</h3>
          <p className="text-sm text-gray-600 mb-4">
            Please confirm that the installation work has been completed successfully. Your verification will be sent to the admin.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
              <p className="text-sm text-blue-700">
                <strong>📋 Campus:</strong> {request.requirements?.campusName || 'N/A'}
              </p>
              {request.assignedInstaller && (
                <p className="text-sm text-blue-700 mt-1">
                  <strong>👷 Installer:</strong> {request.assignedInstaller.name || 'N/A'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Verification Notes (Optional)
              </label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                rows={4}
                className="input-field"
                placeholder="Add any notes about the installation completion, quality, or any observations..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: Add any comments about the installation work quality or completion.
              </p>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
              <p className="text-sm text-yellow-700">
                <strong>Note:</strong> By verifying, you confirm that the installation has been completed successfully. 
                The admin will be notified of your verification.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary bg-green-600 hover:bg-green-700">
                {loading ? 'Verifying...' : 'Verify Installation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Complete Installation Modal
const CompleteModal = ({ request, onClose, onSuccess }) => {
  const [completionNotes, setCompletionNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestsAPI.completeInstallation(request._id, {
        completionNotes: completionNotes
      });
      toast.success('Installation marked as complete!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete installation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-xl font-medium text-gray-900 mb-4">Complete Installation</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Completion Notes (Optional but Recommended)
              </label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={5}
                className="input-field"
                placeholder="Describe what was installed, any issues encountered, final configuration notes, testing results, etc."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary bg-green-600 hover:bg-green-700">
                {loading ? 'Completing...' : 'Mark as Complete'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};