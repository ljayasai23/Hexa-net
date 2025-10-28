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
<<<<<<< HEAD
    priority: 'Medium',
    description: '',
    requestType: 'Both Design and Installation',
    uploadedFiles: []
=======
    priority: 'Medium'
>>>>>>> 220ba6f (design updated)
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

<<<<<<< HEAD
  const handleDescriptionChange = (e) => {
    setFormData({
      ...formData,
      description: e.target.value
    });
  };

  const handleRequestTypeChange = (e) => {
    setFormData({
      ...formData,
      requestType: e.target.value,
      uploadedFiles: [] // Clear uploaded files when request type changes
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

=======
>>>>>>> 220ba6f (design updated)
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

<<<<<<< HEAD
    if (!formData.description.trim()) {
      toast.error('Project description is required');
      return;
    }

    if (formData.description.trim().length < 50) {
      toast.error('Please provide a more detailed description (at least 50 characters)');
      return;
    }

    // Validate file uploads for Installation Only requests
    if (formData.requestType === 'Installation Only' && formData.uploadedFiles.length === 0) {
      toast.error('Please upload design documents for installation-only requests');
      return;
    }

=======
>>>>>>> 220ba6f (design updated)
    const hasValidDepartments = formData.requirements.departments.every(dept => 
      dept.name.trim() && dept.rooms.some(room => room.name.trim())
    );

    if (!hasValidDepartments) {
      toast.error('All departments must have a name and at least one room');
      return;
    }

    // setIsSubmitting(true); // <-- 3. REMOVED THIS

    try {
      await requestsAPI.create(formData);
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create request');
    } 
    // finally {
    //   setIsSubmitting(false); // <-- 4. REMOVED THIS
    // }
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

<<<<<<< HEAD
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Design Documents *
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.dwg,.jpg,.jpeg,.png"
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
              <p className="text-xs text-gray-500">PDF, DOC, DWG, JPG, PNG files (Max 10MB each)</p>
            </label>
          </div>
          
          {/* Display uploaded files */}
          {formData.uploadedFiles.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files:</h4>
              <div className="space-y-2">
                {formData.uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div className="flex items-center space-x-2">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
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

=======
>>>>>>> 220ba6f (design updated)
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Requirements
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
