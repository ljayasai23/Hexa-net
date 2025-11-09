import { useState } from 'react';
import { requestsAPI } from '../lib/api';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import LoadingButton from './LoadingButton'; // <-- 1. IMPORT LOADING BUTTON

export default function RequestForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    requirements: {
      campusName: '',
      departments: [
        {
          name: '',
          rooms: [{ name: '', wiredHosts: 0, wirelessHosts: 0 }]
        }
      ],
      additionalRequirements: ''
    },
    priority: 'Medium',
    description: '',
    requestType: 'Both Design and Installation',
    uploadedFiles: []
  });
  // const [isSubmitting, setIsSubmitting] = useState(false); // <-- 2. REMOVED THIS STATE

  const handleCampusNameChange = (e) => {
    setFormData({
      ...formData,
      requirements: {
        ...formData.requirements,
        campusName: e.target.value
      }
    });
  };

  const handleAdditionalRequirementsChange = (e) => {
    setFormData({
      ...formData,
      requirements: {
        ...formData.requirements,
        additionalRequirements: e.target.value
      }
    });
  };

  const handlePriorityChange = (e) => {
    setFormData({
      ...formData,
      priority: e.target.value
    });
  };

  const handleDescriptionChange = (e) => {
    setFormData({
      ...formData,
      description: e.target.value
    });
  };

  const handleRequestTypeChange = (e) => {
    const newRequestType = e.target.value;
    setFormData({
      ...formData,
      requestType: newRequestType,
      uploadedFiles: [], // Clear uploaded files when request type changes
      // Clear departments if switching to Installation Only
      requirements: newRequestType === 'Installation Only' 
        ? { ...formData.requirements, departments: [] }
        : formData.requirements.departments.length === 0
          ? {
              ...formData.requirements,
              departments: [{
                name: '',
                rooms: [{ name: '', wiredHosts: 0, wirelessHosts: 0 }]
              }]
            }
          : formData.requirements
    });
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map(file => ({
      file: file,
      name: file.name,
      size: file.size,
      id: Date.now() + Math.random()
    }));
    
    setFormData({
      ...formData,
      uploadedFiles: [...formData.uploadedFiles, ...newFiles]
    });
  };

  const removeFile = (fileId) => {
    setFormData({
      ...formData,
      uploadedFiles: formData.uploadedFiles.filter(file => file.id !== fileId)
    });
  };

  const addDepartment = () => {
    setFormData({
      ...formData,
      requirements: {
        ...formData.requirements,
        departments: [
          ...formData.requirements.departments,
          {
            name: '',
            rooms: [{ name: '', wiredHosts: 0, wirelessHosts: 0 }]
          }
        ]
      }
    });
  };

  const removeDepartment = (deptIndex) => {
    if (formData.requirements.departments.length > 1) {
      setFormData({
        ...formData,
        requirements: {
          ...formData.requirements,
          departments: formData.requirements.departments.filter((_, index) => index !== deptIndex)
        }
      });
    }
  };

  const updateDepartment = (deptIndex, field, value) => {
    const updatedDepartments = [...formData.requirements.departments];
    updatedDepartments[deptIndex] = {
      ...updatedDepartments[deptIndex],
      [field]: value
    };
    setFormData({
      ...formData,
      requirements: {
        ...formData.requirements,
        departments: updatedDepartments
      }
    });
  };

  const addRoom = (deptIndex) => {
    const updatedDepartments = [...formData.requirements.departments];
    updatedDepartments[deptIndex].rooms.push({
      name: '',
      wiredHosts: 0,
      wirelessHosts: 0
    });
    setFormData({
      ...formData,
      requirements: {
        ...formData.requirements,
        departments: updatedDepartments
      }
    });
  };

  const removeRoom = (deptIndex, roomIndex) => {
    const updatedDepartments = [...formData.requirements.departments];
    if (updatedDepartments[deptIndex].rooms.length > 1) {
      updatedDepartments[deptIndex].rooms = updatedDepartments[deptIndex].rooms.filter(
        (_, index) => index !== roomIndex
      );
      setFormData({
        ...formData,
        requirements: {
          ...formData.requirements,
          departments: updatedDepartments
        }
      });
    }
  };

  const updateRoom = (deptIndex, roomIndex, field, value) => {
    const updatedDepartments = [...formData.requirements.departments];
    updatedDepartments[deptIndex].rooms[roomIndex] = {
      ...updatedDepartments[deptIndex].rooms[roomIndex],
      [field]: value
    };
    setFormData({
      ...formData,
      requirements: {
        ...formData.requirements,
        departments: updatedDepartments
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.requirements.campusName.trim()) {
      toast.error('Campus name is required');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Project description is required');
      return;
    }

    if (formData.description.trim().length < 50) {
      toast.error('Please provide a more detailed description (at least 50 characters)');
      return;
    }

    // Validate file uploads for Installation Only requests
    if (formData.requestType === 'Installation Only') {
      if (formData.uploadedFiles.length === 0) {
        toast.error('Please upload design PDF document for installation-only requests');
        return;
      }
      // Check if at least one file is a PDF
      const hasPdf = formData.uploadedFiles.some(file => {
        const fileName = file.file?.name || file.name || '';
        return fileName.toLowerCase().endsWith('.pdf');
      });
      if (!hasPdf) {
        toast.error('Please upload at least one PDF file containing the design document');
        return;
      }
    }

    // Validate departments only for Design Only or Both Design and Installation
    if (formData.requestType !== 'Installation Only') {
      const hasValidDepartments = formData.requirements.departments.every(dept => 
        dept.name.trim() && dept.rooms.some(room => room.name.trim())
      );

      if (!hasValidDepartments) {
        toast.error('All departments must have a name and at least one room');
        return;
      }
    }

    try {
      // Prepare submission data
      let submissionData = {
        ...formData,
        requirements: {
          ...formData.requirements,
          // For Installation Only, send empty departments array
          departments: formData.requestType === 'Installation Only' 
            ? [] 
            : formData.requirements.departments
        },
        uploadedFiles: []
      };

      // For Installation Only, convert files to base64 and prepare for upload
      if (formData.requestType === 'Installation Only' && formData.uploadedFiles.length > 0) {
        const filePromises = formData.uploadedFiles.map(async (fileObj) => {
          const file = fileObj.file || fileObj;
          if (file instanceof File) {
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const base64String = reader.result.split(',')[1]; // Remove data:application/pdf;base64, prefix
                resolve({
                  filename: file.name,
                  originalName: file.name,
                  fileSize: file.size,
                  fileType: file.type,
                  base64Data: base64String
                });
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          } else {
            // If file is already processed, return metadata
            return {
              filename: fileObj.name,
              originalName: fileObj.name,
              fileSize: fileObj.size,
              fileType: 'application/pdf'
            };
          }
        });

        submissionData.uploadedFiles = await Promise.all(filePromises);
      }

      await requestsAPI.create(submissionData);
      toast.success('Request submitted successfully!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create request');
    }
  };

  return (
    // 5. REMOVED onSubmit from <form>
    <form className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Network Request Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Campus Name *
            </label>
            <input
              type="text"
              value={formData.requirements.campusName}
              onChange={handleCampusNameChange}
              className="input-field"
              placeholder="Enter campus name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={handlePriorityChange}
              className="input-field"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Request Type Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Request Type *
        </label>
        <select
          value={formData.requestType}
          onChange={handleRequestTypeChange}
          className="input-field"
          required
        >
          <option value="Design Only">1. Design Only</option>
          <option value="Installation Only">2. Installation Only (Upload existing design documents)</option>
          <option value="Both Design and Installation">3. Both Design and Installation</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {formData.requestType === 'Design Only' && 'We will create a network design for your campus.'}
          {formData.requestType === 'Installation Only' && 'Upload your existing design documents so our installation team can provide cost estimates and scheduling.'}
          {formData.requestType === 'Both Design and Installation' && 'We will handle both design and installation for your campus network.'}
        </p>
      </div>

      {/* File Upload Section - Only for Installation Only */}
      {formData.requestType === 'Installation Only' && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Installation Only Request:</strong> Please upload your existing network design PDF document. 
                Our installation team will review it and provide cost estimates and scheduling options.
              </p>
            </div>
          </div>
        </div>
      )}

      {formData.requestType === 'Installation Only' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Design PDF Document * <span className="text-red-500">(Required)</span>
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium text-primary-600 hover:text-primary-500">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PDF files only (Max 10MB per file)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Upload your network design PDF document that contains BOM, IP plan, topology, etc.
              </p>
            </label>
          </div>
          
          {/* Display uploaded files */}
          {formData.uploadedFiles.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Design Documents:</h4>
              <div className="space-y-2">
                {formData.uploadedFiles.map((file) => {
                  const fileName = file.file?.name || file.name;
                  const fileSize = file.file?.size || file.size;
                  return (
                    <div key={file.id} className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <span className="text-sm font-medium text-gray-700">{fileName}</span>
                          <span className="text-xs text-gray-500 ml-2">({(fileSize / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove file"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Description Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Description *
        </label>
        <textarea
          value={formData.description}
          onChange={handleDescriptionChange}
          className="input-field"
          rows={4}
          placeholder="Please describe your network requirements, what you want to achieve, why you need this network design and installation, etc. (100-200 words)"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Explain your campus network needs, goals, and requirements. This helps our team understand your project better.
        </p>
      </div>

      {/* Departments & Rooms Section - Hidden for Installation Only */}
      {formData.requestType !== 'Installation Only' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Departments & Rooms</h3>
            <button
              type="button"
              onClick={addDepartment}
              className="btn-secondary flex items-center"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Department
            </button>
          </div>

        {formData.requirements.departments.map((department, deptIndex) => (
          <div key={deptIndex} className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <input
                type="text"
                value={department.name}
                onChange={(e) => updateDepartment(deptIndex, 'name', e.target.value)}
                className="input-field flex-1 mr-3"
                placeholder="Department name (e.g., Computer Science, Administration)"
                required
              />
              {formData.requirements.departments.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDepartment(deptIndex)}
                  className="text-red-600 hover:text-red-800"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="space-y-2">
              {department.rooms.map((room, roomIndex) => (
                <div key={roomIndex} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={room.name}
                    onChange={(e) => updateRoom(deptIndex, roomIndex, 'name', e.target.value)}
                    className="input-field flex-1"
                    placeholder="Room name (e.g., Lab 101, Office 205)"
                    required
                  />
                  <input
                    type="number"
                    value={room.wiredHosts}
                    onChange={(e) => updateRoom(deptIndex, roomIndex, 'wiredHosts', parseInt(e.target.value) || 0)}
                    className="input-field w-24"
                    placeholder="Wired"
                    min="0"
                  />
                  <input
                    type="number"
                    value={room.wirelessHosts}
                    onChange={(e) => updateRoom(deptIndex, roomIndex, 'wirelessHosts', parseInt(e.target.value) || 0)}
                    className="input-field w-24"
                    placeholder="Wireless"
                    min="0"
                  />
                  {department.rooms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRoom(deptIndex, roomIndex)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => addRoom(deptIndex)}
                className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Room
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Requirements {formData.requestType === 'Installation Only' && '(Optional)'}
        </label>
        <textarea
          value={formData.requirements.additionalRequirements}
          onChange={handleAdditionalRequirementsChange}
          rows={3}
          className="input-field"
          placeholder="Any specific requirements or constraints..."
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
        >
          Cancel
        </button>
        {/* 6. REPLACED <button> with <LoadingButton> */}
        <LoadingButton
          type="submit"
          onClick={handleSubmit}
          className="btn-primary"
          loadingText="Submitting..."
        >
          Submit Request
        </LoadingButton>
      </div>
    </form>
  );
}
