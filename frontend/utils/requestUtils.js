/**
 * Utility functions for formatting request-related data
 */

/**
 * Formats the request type for display
 * @param {string} requestType - The request type from the database
 * @returns {string} - Formatted request type label
 */
export const formatRequestType = (requestType) => {
  if (!requestType) return 'Network Request';
  
  const typeMap = {
    'Installation Only': 'Install Request',
    'Design Only': 'Design Request',
    'Both Design and Installation': 'Design and Install Request'
  };
  
  return typeMap[requestType] || requestType;
};

/**
 * Gets a badge color for the request type
 * @param {string} requestType - The request type from the database
 * @returns {string} - Tailwind CSS classes for the badge
 */
export const getRequestTypeBadgeColor = (requestType) => {
  if (!requestType) return 'bg-gray-100 text-gray-800';
  
  const colorMap = {
    'Installation Only': 'bg-indigo-100 text-indigo-800',
    'Design Only': 'bg-purple-100 text-purple-800',
    'Both Design and Installation': 'bg-blue-100 text-blue-800'
  };
  
  return colorMap[requestType] || 'bg-gray-100 text-gray-800';
};

/**
 * Gets an icon or emoji for the request type
 * @param {string} requestType - The request type from the database
 * @returns {string} - Icon/emoji string
 */
export const getRequestTypeIcon = (requestType) => {
  if (!requestType) return '📋';
  
  const iconMap = {
    'Installation Only': '🔧',
    'Design Only': '📐',
    'Both Design and Installation': '📋'
  };
  
  return iconMap[requestType] || '📋';
};

