import { useState } from 'react';
import { requestsAPI, designsAPI } from '../lib/api';
import toast from 'react-hot-toast';
import MermaidDiagram from './MermaidDiagram';
import BillOfMaterialsTable from './BillOfMaterialsTable';
import IpPlanTable from './IpPlanTable';
import { formatRequestType, getRequestTypeBadgeColor, getRequestTypeIcon } from '../utils/requestUtils';

export default function InstallerRequestList({ requests, onRequestUpdated }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [design, setDesign] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const handleViewDesign = async (requestId) => {
    setLoading(true);
    try {
      // First, get the request to check if it has uploaded files or a generated design
      const requestResponse = await requestsAPI.getById(requestId);
      const requestData = requestResponse.data.request;

      // If request has uploaded files (Installation Only), show those
      if (requestData.uploadedFiles && requestData.uploadedFiles.length > 0 && !requestData.design) {
        // Show uploaded design files
        setDesign({
          _id: requestData._id,
          request: requestData,
          uploadedFiles: requestData.uploadedFiles,
          isUploadedDesign: true
        });
        setShowDesignModal(true);
      } else if (requestData.design) {
        // Fetch generated design
        const response = await designsAPI.getByRequest(requestId);
        setDesign(response.data.design);
        setShowDesignModal(true);
      } else {
        toast.error('No design available for this request');
      }
    } catch (error) {
      toast.error('Failed to fetch design: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleInstallation = (request) => {
    setSelectedRequest(request);
    setShowScheduleModal(true);
  };

  const handleUpdateProgress = (request) => {
    setSelectedRequest(request);
    setShowProgressModal(true);
  };

  const handleCompleteInstallation = (request) => {
    setSelectedRequest(request);
    setShowCompleteModal(true);
  };

  const handleStartInstallation = async (requestId) => {
    try {
      await requestsAPI.updateInstallationProgress(requestId, {
        installationProgress: 10,
        installationNotes: 'Installation started'
      });
      toast.success('Installation started!');
      onRequestUpdated();
    } catch (error) {
      toast.error('Failed to start installation');
    }
  };

  // Filter requests by status for better organization
  // Only show active requests (exclude completed)
  const activeRequests = requests.filter(r => r && r.status !== 'Completed');
  
  // Show all assigned projects that need installer action
  // pendingRequests: Projects assigned but not yet scheduled and not in progress
  // scheduledRequests: Projects with scheduled date but not yet started
  // inProgressRequests: Projects currently being installed
  
  // First, get in-progress requests
  const inProgressRequests = activeRequests.filter(r => 
    r && r.status === 'Installation In Progress'
  );
  
  // Then, get scheduled requests (but not in progress)
  const scheduledRequests = activeRequests.filter(r => 
    r &&
    r.scheduledInstallationDate && 
    r.status !== 'Installation In Progress' &&
    r.status !== 'Completed'
  );
  
  // Pending: All incomplete projects that aren't scheduled or in progress
  // This should catch ALL other incomplete projects
  const pendingRequests = activeRequests.filter(r => 
    r &&
    r.status !== 'Installation In Progress' &&
    r.status !== 'Completed' &&
    !r.scheduledInstallationDate
  );
  
  const completedRequests = requests.filter(r => r.status === 'Completed');

  const renderRequestCard = (request) => (
    <div key={request._id} className="card hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-gray-900">
              {request.requirements.campusName}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              request.status === 'Design Complete' ? 'bg-green-100 text-green-800' :
              request.status === 'Installation In Progress' ? 'bg-indigo-100 text-indigo-800' :
              request.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {request.status}
            </span>
          </div>
          
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center space-x-2 mb-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRequestTypeBadgeColor(request.requestType)}`}>
                {getRequestTypeIcon(request.requestType)} {formatRequestType(request.requestType)}
              </span>
            </div>
            <p>Client: {request.client?.name}</p>
            <p>Designer: {request.assignedDesigner?.name || 'Not assigned'}</p>
            {request.scheduledInstallationDate && (
              <p className="text-indigo-600 font-medium">
                📅 Scheduled: {new Date(request.scheduledInstallationDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            )}
            {request.installationStartDate && (
              <p className="text-gray-500">
                Started: {new Date(request.installationStartDate).toLocaleDateString()}
              </p>
            )}
            {request.installationProgress > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Installation Progress</span>
                  <span>{request.installationProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${request.installationProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {request.installationNotes && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-700">
              <strong>Notes:</strong> {request.installationNotes.substring(0, 100)}
              {request.installationNotes.length > 100 && '...'}
            </div>
          )}
        </div>
        
        <div className="flex flex-col space-y-2 ml-4">
          {/* Show View Design button if design exists (generated) OR if uploaded files exist (Installation Only) */}
          {(request.design || (request.uploadedFiles && request.uploadedFiles.length > 0)) && (
            <button
              onClick={() => handleViewDesign(request._id)}
              className="btn-primary text-sm px-3 py-1"
            >
              {request.design ? 'View Design' : 'View Uploaded Design'}
            </button>
          )}
          
          {/* For Installation Only requests, allow scheduling even without generated design */}
          {request.requestType === 'Installation Only' && 
           (request.status === 'New' || request.status === 'Assigned') && 
           request.uploadedFiles && 
           request.uploadedFiles.length > 0 && 
           !request.scheduledInstallationDate && (
            <button
              onClick={() => handleScheduleInstallation(request)}
              className="btn-primary bg-green-600 hover:bg-green-700 text-sm px-3 py-1"
            >
              Propose Installation Date
            </button>
          )}
          
          {/* Show "Propose Installation Date" button for:
              1. "Both Design and Installation" requests that have design completed and are assigned
              2. Requests with status "Design Complete" or "Awaiting Client Review"
              3. Any assigned request that doesn't have a scheduled date yet */}
          {((request.requestType === 'Both Design and Installation' && 
             request.design && 
             (request.status === 'Assigned' || request.status === 'Design Complete' || request.status === 'Awaiting Client Review' || request.status === 'Design In Progress')) ||
            (request.status === 'Design Complete' || request.status === 'Awaiting Client Review' || request.status === 'Assigned')) && 
           !request.scheduledInstallationDate && (
            <button
              onClick={() => handleScheduleInstallation(request)}
              className="btn-primary bg-green-600 hover:bg-green-700 text-sm px-3 py-1"
            >
              Propose Installation Date
            </button>
          )}
          
          {request.scheduledInstallationDate && request.status !== 'Installation In Progress' && (
            <button
              onClick={() => handleStartInstallation(request._id)}
              className="btn-primary bg-indigo-600 hover:bg-indigo-700 text-sm px-3 py-1"
            >
              Start Installation
            </button>
          )}
          
          {request.status === 'Installation In Progress' && (
            <>
              <button
                onClick={() => handleUpdateProgress(request)}
                className="btn-primary bg-blue-600 hover:bg-blue-700 text-sm px-3 py-1"
              >
                Update Progress
              </button>
              {/* Only show Mark Complete if installation date was proposed and progress > 0 */}
              {request.scheduledInstallationDate && request.installationProgress > 0 && (
                <button
                  onClick={() => handleCompleteInstallation(request)}
                  className="btn-primary bg-green-600 hover:bg-green-700 text-sm px-3 py-1"
                >
                  Mark Complete
                </button>
              )}
              {/* Show warning if prerequisites not met */}
              {(!request.scheduledInstallationDate || !request.installationProgress || request.installationProgress <= 0) && (
                <div className="text-xs text-yellow-600 mt-1">
                  {!request.scheduledInstallationDate && (
                    <p className="mb-1">⚠️ Propose installation date first</p>
                  )}
                  {request.scheduledInstallationDate && (!request.installationProgress || request.installationProgress <= 0) && (
                    <p className="mb-1">⚠️ Start installation work first</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Debug logging
  console.log('InstallerRequestList: Received requests:', requests.length);
  console.log('InstallerRequestList: Active requests:', activeRequests.length);
  console.log('InstallerRequestList: Pending requests:', pendingRequests.length);
  console.log('InstallerRequestList: Scheduled requests:', scheduledRequests.length);
  console.log('InstallerRequestList: In progress requests:', inProgressRequests.length);
  
  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No assigned projects found.</p>
      </div>
    );
  }
  
  // If we have requests but no pending/scheduled/inProgress, show a message
  if (pendingRequests.length === 0 && scheduledRequests.length === 0 && inProgressRequests.length === 0 && activeRequests.length > 0) {
    console.log('InstallerRequestList: Requests exist but none match filters. Active requests:', activeRequests.map(r => ({
      id: r._id,
      status: r.status,
      scheduledDate: r.scheduledInstallationDate,
      installationProgress: r.installationProgress,
      assignedInstaller: r.assignedInstaller?._id || r.assignedInstaller
    })));
    // Show all active requests in pending section if they don't match other filters
    // This ensures projects are always visible
    const allActiveAsPending = activeRequests;
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Assigned Projects</h2>
        <div>
          <h3 className="text-md font-semibold text-gray-700 mb-3">
            📋 Pending Installations ({allActiveAsPending.length})
          </h3>
          <div className="grid gap-4">
            {allActiveAsPending.map(renderRequestCard)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Assigned Projects</h2>
      
      {/* Pending Installations */}
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="text-md font-semibold text-gray-700 mb-3">
            📋 Pending Installations ({pendingRequests.length})
          </h3>
          <div className="grid gap-4">
            {pendingRequests.map(renderRequestCard)}
          </div>
        </div>
      )}

      {/* Scheduled Installations */}
      {scheduledRequests.length > 0 && (
        <div>
          <h3 className="text-md font-semibold text-gray-700 mb-3">
            📅 Scheduled Installations ({scheduledRequests.length})
          </h3>
          <div className="grid gap-4">
            {scheduledRequests.map(renderRequestCard)}
          </div>
        </div>
      )}

      {/* In Progress */}
      {inProgressRequests.length > 0 && (
        <div>
          <h3 className="text-md font-semibold text-gray-700 mb-3">
            🔧 In Progress ({inProgressRequests.length})
          </h3>
          <div className="grid gap-4">
            {inProgressRequests.map(renderRequestCard)}
          </div>
        </div>
      )}

      {/* Completed */}
      {completedRequests.length > 0 && (
        <div>
          <h3 className="text-md font-semibold text-gray-700 mb-3">
            ✅ Completed ({completedRequests.length})
          </h3>
          <div className="grid gap-4">
            {completedRequests.map(renderRequestCard)}
          </div>
        </div>
      )}

      {/* Modals */}
      {showDesignModal && design && (
        <DesignModal
          design={design}
          onClose={() => setShowDesignModal(false)}
        />
      )}

      {showScheduleModal && selectedRequest && (
        <ScheduleModal
          request={selectedRequest}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={onRequestUpdated}
        />
      )}

      {showProgressModal && selectedRequest && (
        <ProgressModal
          request={selectedRequest}
          onClose={() => setShowProgressModal(false)}
          onSuccess={onRequestUpdated}
        />
      )}

      {showCompleteModal && selectedRequest && (
        <CompleteModal
          request={selectedRequest}
          onClose={() => setShowCompleteModal(false)}
          onSuccess={onRequestUpdated}
        />
      )}
    </div>
  );
}

// Design Modal Component
const DesignModal = ({ design, onClose }) => {
  // Check if this is an uploaded design (Installation Only) or generated design
  const isUploadedDesign = design.isUploadedDesign || (design.uploadedFiles && design.uploadedFiles.length > 0 && !design.billOfMaterials);

  // Get API base URL for file access (without /api suffix)
  const getApiBaseUrl = () => {
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
  
  const API_BASE_URL = getApiBaseUrl();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-medium text-gray-900">
              {isUploadedDesign ? 'Uploaded Design Documents' : 'Network Design Report'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <div className="space-y-6">
            {isUploadedDesign ? (
              /* Uploaded Design Files View (Installation Only) */
              <div>
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                  <p className="text-sm text-blue-700">
                    <strong>Installation Only Request:</strong> These design documents were uploaded by the client. 
                    Please review them to plan the installation.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Uploaded Design Documents</h4>
                  <div className="space-y-3">
                    {design.uploadedFiles.map((file, index) => {
                      const fileUrl = `${API_BASE_URL}${file.filePath}`;
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{file.originalName}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                                  {file.uploadedAt && ` • Uploaded: ${new Date(file.uploadedAt).toLocaleDateString()}`}
                                </p>
                              </div>
                            </div>
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-primary text-sm px-4 py-2"
                            >
                              View PDF
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Generated Design View (Design Only / Both) */
              <>
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Bill of Materials</h4>
                  <BillOfMaterialsTable billOfMaterials={design.billOfMaterials} />
                </div>

                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">IP Plan & VLANs</h4>
                  <IpPlanTable ipPlan={design.ipPlan} />
                </div>

                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Network Topology</h4>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <MermaidDiagram diagramString={design.topologyDiagram} />
                  </div>
                </div>

                {design.reportPdfUrl && design.isApproved && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Design Report PDF</h4>
                    <a
                      href={`${API_BASE_URL}${design.reportPdfUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary inline-flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Design Report PDF
                    </a>
                  </div>
                )}
                {design.reportPdfUrl && !design.isApproved && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <p className="text-sm text-yellow-700">
                      <strong>Note:</strong> The design report is pending admin approval. You will be able to view the PDF once the admin approves it.
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end">
              <button onClick={onClose} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Schedule Installation Modal
const ScheduleModal = ({ request, onClose, onSuccess }) => {
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [proposedDates, setProposedDates] = useState(['', '']); // Allow proposing multiple dates
  const [notes, setNotes] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Combine date and time if both are provided
      let finalDate = scheduledDate;
      if (scheduledDate && scheduledTime) {
        finalDate = `${scheduledDate}T${scheduledTime}`;
      } else if (scheduledDate) {
        finalDate = `${scheduledDate}T09:00`; // Default to 9 AM if no time specified
      }

      const installationNotes = [
        notes,
        teamSize && `Team Size: ${teamSize} members`,
        estimatedDuration && `Estimated Duration: ${estimatedDuration} hours`,
        proposedDates.filter(d => d).length > 0 && `Alternative Dates: ${proposedDates.filter(d => d).join(', ')}`
      ].filter(Boolean).join('\n');

      await requestsAPI.scheduleInstallation(request._id, {
        scheduledInstallationDate: finalDate,
        installationNotes: installationNotes
      });
      toast.success('Installation date proposed successfully! Admin and client will be notified.');
      onSuccess();
      onClose();
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
          <p className="text-sm text-gray-600 mb-4">
            Select your preferred date and time to visit the campus for physical installation. You can also propose alternative dates.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
              <p className="text-sm text-blue-700">
                <strong>📋 Campus:</strong> {request.requirements?.campusName || 'N/A'}
              </p>
              {request.client && (
                <p className="text-sm text-blue-700 mt-1">
                  <strong>👤 Client:</strong> {request.client.name}
                </p>
              )}
            </div>

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
              <p className="text-xs text-gray-500 mt-1">When will your team arrive at the campus?</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alternative Dates (Optional)
              </label>
              <div className="space-y-2">
                {proposedDates.map((date, index) => (
                  <input
                    key={index}
                    type="date"
                    value={date}
                    onChange={(e) => {
                      const newDates = [...proposedDates];
                      newDates[index] = e.target.value;
                      setProposedDates(newDates);
                    }}
                    className="input-field"
                    min={new Date().toISOString().split('T')[0]}
                    placeholder={`Alternative date ${index + 1}`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Propose 1-2 alternative dates if the preferred date is not available</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Size
                </label>
                <input
                  type="number"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  className="input-field"
                  min="1"
                  placeholder="e.g., 3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Duration (hours)
                </label>
                <input
                  type="number"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  className="input-field"
                  min="1"
                  placeholder="e.g., 8"
                />
              </div>
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
                placeholder="Equipment needed, special requirements, access instructions, parking information, contact person at campus, etc."
              />
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
              <p className="text-sm text-yellow-700">
                <strong>Note:</strong> Your proposed date will be sent to the admin and client for approval. They will be notified and can confirm or suggest changes.
              </p>
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
      onClose();
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
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
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
      onClose();
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

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Once marked as complete, the installation status will be updated and the client will be notified.
              </p>
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
