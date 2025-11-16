import { useState, useEffect } from 'react';
import { requestsAPI, adminAPI, designsAPI } from '../lib/api';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';
import { formatRequestType, getRequestTypeBadgeColor, getRequestTypeIcon } from '../utils/requestUtils';

// ------------------- MAIN COMPONENT -------------------
export default function AdminRequestList() {
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false); // <-- NEW STATE

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [requestsResponse, usersResponse] = await Promise.all([
        requestsAPI.getAll(),
        adminAPI.getUsers(),
      ]);
      setRequests(requestsResponse.data.requests);
      setUsers(usersResponse.data.users);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (requestId, assignmentData) => {
    try {
      await requestsAPI.assign(requestId, assignmentData);
      toast.success('Request assigned successfully');
      setShowAssignModal(false);
      setSelectedRequest(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to assign request');
    }
  };

  const handleAdminApprove = async (designId) => {
    try {
      await designsAPI.adminApprove(designId);
      toast.success('Design approved and sent to Client!');
      setShowApproveModal(false);
      setSelectedRequest(null);
      fetchData(); // Refresh list
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve design');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">All Requests</h2>

      <div className="overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-header">Campus</th>
              <th className="table-header">Request Type</th>
              <th className="table-header">Client</th>
              <th className="table-header">Status</th>
              <th className="table-header">Designer</th>
              <th className="table-header">Installer</th>
              <th className="table-header">Priority</th>
              <th className="table-header">Review</th> {/* <-- NEW */}
              <th className="table-header">Actions</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((request) => (
              <tr key={request._id}>
                <td className="table-cell font-medium">
                  {request.requirements.campusName}
                </td>
                <td className="table-cell">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRequestTypeBadgeColor(request.requestType)}`}>
                    {getRequestTypeIcon(request.requestType)} {formatRequestType(request.requestType)}
                  </span>
                </td>
                <td className="table-cell">{request.client?.name || 'Unknown'}</td>
                <td className="table-cell">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      request.status === 'New'
                        ? 'bg-yellow-100 text-yellow-800'
                        : request.status === 'Assigned'
                        ? 'bg-blue-100 text-blue-800'
                        : request.status === 'Design In Progress'
                        ? 'bg-purple-100 text-purple-800'
                        : request.status === 'Design Submitted'
                        ? 'bg-orange-100 text-orange-800'
                        : request.status === 'Awaiting Client Review'
                        ? 'bg-teal-100 text-teal-800'
                        : request.status === 'Design Complete'
                        ? 'bg-green-100 text-green-800'
                        : request.status === 'Installation In Progress'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {request.status}
                  </span>
                </td>

                <td className="table-cell">
                  {request.assignedDesigner?.name || 'Unassigned'}
                </td>
                <td className="table-cell">
                  {request.assignedInstaller?.name || 'Unassigned'}
                </td>

                <td className="table-cell">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      request.priority === 'Low'
                        ? 'bg-gray-100 text-gray-800'
                        : request.priority === 'Medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : request.priority === 'High'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {request.priority}
                  </span>
                </td>

                {/* --- NEW Review Cell --- */}
                <td className="table-cell">
                  {request.status === 'Design Submitted' && request.design ? (
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowApproveModal(true);
                      }}
                      className="text-orange-600 hover:text-orange-900 text-sm font-medium"
                    >
                      Review PDF
                    </button>
                  ) : (
                    <span className="text-gray-500 text-sm">-</span>
                  )}
                </td>

                <td className="table-cell">
                  {/* Disable assign button based on request type and current assignments */}
                  {(() => {
                    const requestType = request.requestType;
                    const isFullyAssigned = 
                      (requestType === 'Installation Only' && request.assignedInstaller) ||
                      (requestType === 'Design Only' && request.assignedDesigner) ||
                      (requestType === 'Both Design and Installation' && request.assignedDesigner && request.assignedInstaller);
                    
                    if (isFullyAssigned) {
                      return (
                        <span className="text-gray-400 text-sm font-medium cursor-not-allowed">
                          Fully Assigned
                        </span>
                      );
                    }
                    
                    return (
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowAssignModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                      >
                        {request.assignedDesigner || request.assignedInstaller ? 'Update Assignment' : 'Assign'}
                      </button>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Approve Modal ---- */}
      {showApproveModal && selectedRequest && (
        <ApproveDesignModal
          request={selectedRequest}
          onApprove={handleAdminApprove}
          onClose={() => {
            setShowApproveModal(false);
            setSelectedRequest(null);
          }}
        />
      )}

      {/* ---- Assign Modal ---- */}
      {showAssignModal && selectedRequest && (
        <AssignModal
          request={selectedRequest}
          users={users}
          onAssign={handleAssign}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedRequest(null);
          }}
        />
      )}
    </div>
  );
}

// ------------------- ASSIGN MODAL -------------------
const AssignModal = ({ request, users, onAssign, onClose }) => {
  const [formData, setFormData] = useState({
    assignedDesigner: request.assignedDesigner?._id || '',
    assignedInstaller: request.assignedInstaller?._id || '',
    status: request.status,
  });

  const designers = users.filter((user) => user.role === 'Network Designer');
  const installers = users.filter(
    (user) => user.role === 'Network Installation Team'
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Only send assignments that are not already set
    const assignmentData = {
      status: formData.status,
    };
    
    // Only include designer if it's not already assigned (or if we're changing it)
    if (!request.assignedDesigner && formData.assignedDesigner) {
      assignmentData.assignedDesigner = formData.assignedDesigner;
    }
    
    // Only include installer if it's not already assigned (or if we're changing it)
    if (!request.assignedInstaller && formData.assignedInstaller) {
      assignmentData.assignedInstaller = formData.assignedInstaller;
    }
    
    // Only submit if there's something to assign
    if (assignmentData.assignedDesigner || assignmentData.assignedInstaller || assignmentData.status !== request.status) {
      onAssign(request._id, assignmentData);
    } else {
      toast.error('No changes to assign');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Assign Request: {request.requirements.campusName}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Show request type info */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-indigo-900 mb-1">Request Type:</p>
              <p className="text-sm text-indigo-800 font-semibold">{request.requestType}</p>
            </div>

            {/* Show current assignments */}
            {(request.assignedDesigner || request.assignedInstaller) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-blue-900 mb-2">Current Assignments:</p>
                <div className="space-y-1 text-sm text-blue-800">
                  {request.assignedDesigner && (
                    <p>✓ Designer: <span className="font-semibold">{request.assignedDesigner.name}</span></p>
                  )}
                  {request.assignedInstaller && (
                    <p>✓ Installer: <span className="font-semibold">{request.assignedInstaller.name}</span></p>
                  )}
                </div>
              </div>
            )}

            {/* Designer Assignment - Only show for "Design Only" or "Both Design and Installation" */}
            {(request.requestType === 'Design Only' || request.requestType === 'Both Design and Installation') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign Designer
                </label>
                {request.assignedDesigner ? (
                  <div className="space-y-2">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        <span className="font-semibold">Currently Assigned:</span> {request.assignedDesigner.name}
                      </p>
                    </div>
                    <input type="hidden" value={request.assignedDesigner._id} name="assignedDesigner" />
                    <p className="text-xs text-gray-500">
                      Designer is already assigned. The assignment cannot be changed through this interface.
                    </p>
                  </div>
                ) : (
                  <select
                    value={formData.assignedDesigner}
                    onChange={(e) =>
                      setFormData({ ...formData, assignedDesigner: e.target.value })
                    }
                    className="input-field"
                  >
                    <option value="">Select Designer</option>
                    {designers.map((designer) => (
                      <option key={designer._id} value={designer._id}>
                        {designer.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Installer Assignment - Show for "Installation Only" or "Both Design and Installation" */}
            {(request.requestType === 'Installation Only' || request.requestType === 'Both Design and Installation') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign Installer
                  {request.requestType === 'Both Design and Installation' && request.assignedDesigner && !request.assignedInstaller && (
                    <span className="ml-2 text-xs text-green-600 font-medium">(Designer assigned ✓ - Ready for installer)</span>
                  )}
                </label>
                {request.assignedInstaller ? (
                  <div className="space-y-2">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        <span className="font-semibold">Currently Assigned:</span> {request.assignedInstaller.name}
                      </p>
                    </div>
                    <input type="hidden" value={request.assignedInstaller._id} name="assignedInstaller" />
                    <p className="text-xs text-gray-500">
                      Installer is already assigned. The assignment cannot be changed through this interface.
                    </p>
                  </div>
                ) : (
                  <select
                    value={formData.assignedInstaller}
                    onChange={(e) =>
                      setFormData({ ...formData, assignedInstaller: e.target.value })
                    }
                    className="input-field"
                  >
                    <option value="">Select Installer</option>
                    {installers.map((installer) => (
                      <option key={installer._id} value={installer._id}>
                        {installer.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="input-field"
              >
                <option value="New">New</option>
                <option value="Assigned">Assigned</option>
                <option value="Design In Progress">Design In Progress</option>
                <option value="Design Submitted">Design Submitted</option>
                <option value="Design Complete">Design Complete</option>
                <option value="Installation In Progress">
                  Installation In Progress
                </option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Assign
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ------------------- APPROVE DESIGN MODAL -------------------
const ApproveDesignModal = ({ request, onApprove, onClose }) => {
  const [design, setDesign] = useState(null);
  const [loadingDesign, setLoadingDesign] = useState(true);

  useEffect(() => {
    const fetchDesign = async () => {
      try {
        const response = await designsAPI.getByRequest(request._id);
        const designData = response.data.design;
        
        console.log('Admin - Fetched design:', {
          id: designData._id,
          hasReportPdfUrl: !!designData.reportPdfUrl,
          reportPdfUrl: designData.reportPdfUrl
        });
        
        if (!designData.reportPdfUrl) {
          console.error('⚠️ Admin - Design fetched but reportPdfUrl is missing!');
          toast.error('PDF report URL is missing. The design may need to be regenerated.');
        }
        
        setDesign(designData);
      } catch (error) {
        console.error('Error fetching design for admin:', error);
        toast.error('Could not fetch design details.');
        onClose();
      } finally {
        setLoadingDesign(false);
      }
    };
    fetchDesign();
  }, [request._id, onClose]);

  const handleApproveClick = () => {
    if (design?._id) {
      onApprove(design._id);
    } else {
      toast.error('Design ID not found.');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-8 border w-3/4 max-w-2xl shadow-lg rounded-md bg-white">
        <h3 className="text-xl font-medium text-gray-900 mb-4">
          Review Design Report: {request.requirements.campusName}
        </h3>

        {loadingDesign ? (
          <LoadingSpinner />
        ) : design && design.reportPdfUrl ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                ✅ Design Report Available
              </p>
              <p className="text-sm text-blue-700">
                The designer has submitted the design report. Review the PDF below before approving.
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="text-sm font-medium text-gray-700 mb-3">
                📄 Design Report PDF
              </p>
              
              <div className="space-y-3">
                <a
                  href={`${(() => {
                    if (process.env.NEXT_PUBLIC_API_URL) {
                      return process.env.NEXT_PUBLIC_API_URL.replace('/api', '');
                    }
                    return 'http://localhost:5000';
                  })()}${design.reportPdfUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-md"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Download & Review PDF Report
                </a>
                
                <p className="text-xs text-gray-500 mt-2">
                  PDF URL: {design.reportPdfUrl}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel / Close
              </button>
              <button
                type="button"
                onClick={handleApproveClick}
                className="btn-primary bg-green-600 hover:bg-green-700"
              >
                Approve & Forward to Client
              </button>
            </div>
          </div>
        ) : design ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium mb-2">⚠️ PDF Report Not Available</p>
            <p className="text-sm text-red-700">
              The design was found but the PDF report URL is missing. 
              This may indicate the PDF was not generated properly. 
              Please contact the designer to regenerate the design.
            </p>
            <p className="text-xs text-red-600 mt-2">
              Design ID: {design._id}
            </p>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">❌ Error: Design not found</p>
            <p className="text-sm text-red-700 mt-2">
              Could not retrieve design information for this request.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
