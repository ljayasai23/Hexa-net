// frontend/components/RequestList.js

import { useRouter } from 'next/router';
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

  const handleViewRequest = (requestId) => {
    router.push(`/project/${requestId}`);
  };

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
                <button
                  onClick={() => handleViewRequest(request._id)}
                  className="text-primary-600 hover:text-primary-900 text-xs font-medium px-1 py-0.5 hover:underline"
                >
                  View Details
                </button>
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}