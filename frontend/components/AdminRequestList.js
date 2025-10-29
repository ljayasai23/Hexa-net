import { useState, useEffect } from 'react';
import { requestsAPI, adminAPI } from '../lib/api';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';

export default function AdminRequestList() {
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [requestsResponse, usersResponse] = await Promise.all([
        requestsAPI.getAll(),
        adminAPI.getUsers()
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
              <th className="table-header">Client</th>
              <th className="table-header">Status</th>
              <th className="table-header">Designer</th>
              <th className="table-header">Installer</th>
              <th className="table-header">Priority</th>
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
                  {request.client?.name || 'Unknown'}
                </td>
                <td className="table-cell">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    request.status === 'New' ? 'bg-yellow-100 text-yellow-800' :
                    request.status === 'Assigned' ? 'bg-blue-100 text-blue-800' :
                    request.status === 'Design In Progress' ? 'bg-purple-100 text-purple-800' :
                    request.status === 'Design Complete' ? 'bg-green-100 text-green-800' :
                    request.status === 'Installation In Progress' ? 'bg-indigo-100 text-indigo-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
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
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    request.priority === 'Low' ? 'bg-gray-100 text-gray-800' :
                    request.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    request.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {request.priority}
                  </span>
                </td>
                <td className="table-cell">
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowAssignModal(true);
                    }}
                    className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                  >
                    Assign
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

const AssignModal = ({ request, users, onAssign, onClose }) => {
  const [formData, setFormData] = useState({
    assignedDesigner: request.assignedDesigner?._id || '',
    assignedInstaller: request.assignedInstaller?._id || '',
    status: request.status
  });

  const designers = users.filter(user => user.role === 'Network Designer');
  const installers = users.filter(user => user.role === 'Network Installation Team');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAssign(request._id, formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Assign Request: {request.requirements.campusName}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Assign Designer
              </label>
              <select
                value={formData.assignedDesigner}
                onChange={(e) => setFormData({...formData, assignedDesigner: e.target.value})}
                className="input-field"
              >
                <option value="">Select Designer</option>
                {designers.map(designer => (
                  <option key={designer._id} value={designer._id}>
                    {designer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Assign Installer
              </label>
              <select
                value={formData.assignedInstaller}
                onChange={(e) => setFormData({...formData, assignedInstaller: e.target.value})}
                className="input-field"
              >
                <option value="">Select Installer</option>
                {installers.map(installer => (
                  <option key={installer._id} value={installer._id}>
                    {installer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="input-field"
              >
                <option value="New">New</option>
                <option value="Assigned">Assigned</option>
                <option value="Design In Progress">Design In Progress</option>
                <option value="Design Complete">Design Complete</option>
                <option value="Installation In Progress">Installation In Progress</option>
                <option value="Completed">Completed</option>
              </select>
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
                className="btn-primary"
              >
                Assign
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
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
}
// -----------------------------------------------------------------

// --- NEW MODAL COMPONENT (Add this outside the main component) ---
const ApproveDesignModal = ({ request, onApprove, onClose }) => {
const [design, setDesign] = useState(null);
const [loadingDesign, setLoadingDesign] = useState(true);

useEffect(() => {
  const fetchDesign = async () => {
    try {
      const response = await designsAPI.getByRequest(request._id);
      setDesign(response.data.design);
    } catch (error) {
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
}

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
          <p><strong>Status:</strong> Submitted for Review</p>
          
          <a 
              href={`${process.env.NEXT_PUBLIC_API_URL}${design.reportPdfUrl}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              Download & Review PDF
          </a>

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
      ) : (
          <p className="text-red-600">Error: Design or PDF URL is missing.</p>
      )}
    </div>
  </div>
);
};
