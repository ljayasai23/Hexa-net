// frontend/components/RequestList.js

import { useState, useEffect } from 'react'; // <-- 1. FIX (useEffect was missing)
import { useRouter } from 'next/router';
import { requestsAPI, designsAPI } from '../lib/api'; 
import toast from 'react-hot-toast'; 
import LoadingSpinner from './LoadingSpinner';
import { formatRequestType, getRequestTypeBadgeColor, getRequestTypeIcon } from '../utils/requestUtils'; 

const statusColors = {
  'New': 'bg-yellow-100 text-yellow-800',
  'Assigned': 'bg-blue-100 text-blue-800',
  'Design In Progress': 'bg-purple-100 text-purple-800',
  'Design Submitted': 'bg-orange-100 text-orange-800',
  'Awaiting Client Review': 'bg-teal-100 text-teal-800',
  'Design Complete': 'bg-green-100 text-green-800',
  'Installation In Progress': 'bg-indigo-100 text-indigo-800',
  'Completed': 'bg-gray-100 text-gray-800',
};

const priorityColors = {
  'Low': 'bg-gray-100 text-gray-800',
  'Medium': 'bg-yellow-100 text-yellow-800',
  'High': 'bg-orange-100 text-orange-800',
  'Urgent': 'bg-red-100 text-red-800',
};

export default function RequestList({ requests }) {
  const router = useRouter();

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showClientReviewModal, setShowClientReviewModal] = useState(false);

  const handleViewRequest = (requestId) => {
    router.push(`/project/${requestId}`);
  };

  // --- UPDATED HANDLER FUNCTION ---
  // It now re-throws the error so the modal can catch it
  const handleClientAccept = async (requestId) => {
    try {
      await requestsAPI.markClientComplete(requestId);
      toast.success('Project accepted and marked as complete!');
      setShowClientReviewModal(false);
      setSelectedRequest(null);
      router.reload(); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept design');
      throw error; // <-- 2. FIX: Re-throw error for the modal
    }
  };
  // ---------------------------

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No requests found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Campus</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Type</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Status</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Priority</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Depts</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Created</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {requests.map((request) => (
            <tr key={request._id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-sm font-medium text-gray-900 truncate" title={request.requirements.campusName}>
                {request.requirements.campusName}
              </td>
              <td className="px-2 py-2 text-sm">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getRequestTypeBadgeColor(request.requestType)}`}>
                  <span className="mr-1">{getRequestTypeIcon(request.requestType)}</span>
                  <span className="hidden sm:inline">{formatRequestType(request.requestType)}</span>
                  <span className="sm:hidden">{formatRequestType(request.requestType).split(' ')[0]}</span>
                </span>
              </td>
              <td className="px-2 py-2 text-sm">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[request.status]}`}>
                  {request.status}
                </span>
              </td>
              <td className="px-2 py-2 text-sm">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${priorityColors[request.priority]}`}>
                  {request.priority}
                </span>
              </td>
              <td className="px-2 py-2 text-sm text-gray-600">
                {request.requestType === 'Installation Only' 
                  ? 'N/A' 
                  : `${request.requirements.departments.length} dept${request.requirements.departments.length !== 1 ? 's' : ''}`}
              </td>
              <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">
                {new Date(request.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </td>
              
              <td className="px-3 py-2 text-sm whitespace-nowrap">
                {request.status === 'Awaiting Client Review' ? (
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowClientReviewModal(true);
                    }}
                    className="text-green-600 hover:text-green-900 text-xs font-medium px-1 py-0.5 hover:underline"
                  >
                    Review PDF
                  </button>
                ) : (
                  <button
                    onClick={() => handleViewRequest(request._id)}
                    className="text-primary-600 hover:text-primary-900 text-xs font-medium px-1 py-0.5 hover:underline"
                  >
                    View Details
                  </button>
                )}
              </td>

            </tr>
          ))}
        </tbody>
      </table>

      {showClientReviewModal && selectedRequest && (
        <ClientReviewModal
          request={selectedRequest}
          onAccept={handleClientAccept}
          onClose={() => {
            setShowClientReviewModal(false);
            setSelectedRequest(null);
          }}
        />
      )}

    </div>
  );
}


// -----------------------------------------------------------------
// --- NEW: CLIENT REVIEW MODAL (Copied from AdminRequestList) ---
// -----------------------------------------------------------------
const ClientReviewModal = ({ request, onAccept, onClose }) => {
  const [design, setDesign] = useState(null);
  const [loadingDesign, setLoadingDesign] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false); // <-- 2. FIX: Add loading state

  // This fetches the design details (which has the PDF URL)
  // using the request._id
  useEffect(() => { // <-- 1. FIX: Changed 'useState' to 'useEffect'
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

  // --- 2. FIX: Updated click handler ---
  const handleAcceptClick = async () => {
    setIsAccepting(true); // Disable button
    try {
      // We pass the REQUEST ID
      await onAccept(request._id); 
      // On success, modal closes, no need to reset state
    } catch (error) {
      // If onAccept fails, re-enable the button
      setIsAccepting(false);
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
        ) : design && design.reportPdfUrl && design.isApproved ? (
          <div className="space-y-4">
            <p>
              <strong>Status:</strong> Awaiting Your Review
            </p>
            <p className="text-sm text-gray-600">
              The admin has approved this design. Please review the final PDF 
              and accept to mark the project as complete.
            </p>

            <a
              href={`${process.env.NEXT_PUBLIC_API_URL.replace(
                '/api',
                ''
              )}${design.reportPdfUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center btn-secondary" // Styled as a button
            >
              <svg
                className="-ml-1 mr-2 h-5 w-5"
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
              Download & Review PDF
            </a>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isAccepting} // <-- 2. FIX
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleAcceptClick}
                className="btn-primary bg-green-600 hover:bg-green-700 disabled:opacity-50" // <-- 2. FIX
                disabled={isAccepting} // <-- 2. FIX
              >
                {isAccepting ? 'Accepting...' : 'Accept & Complete Project'} {/* <-- 2. FIX */}
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