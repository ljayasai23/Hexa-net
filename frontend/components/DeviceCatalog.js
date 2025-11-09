import { useState, useEffect } from 'react';
import { adminAPI } from '../lib/api';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';

export default function DeviceCatalog() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await adminAPI.getDevices({ limit: 1000 }); // Get all devices
      setDevices(response.data.devices);
    } catch (error) {
      toast.error('Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDevices = async () => {
    if (devices.length > 0) {
      const confirmed = window.confirm(
        `Device catalog already contains ${devices.length} device(s). Seeding will only work if the catalog is empty. Do you want to continue?`
      );
      if (!confirmed) return;
    }

    setSeeding(true);
    try {
      const response = await adminAPI.seedDevices();
      toast.success(response.data.message || `Successfully seeded ${response.data.count} devices!`);
      fetchDevices(); // Refresh the list
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to seed devices';
      toast.error(errorMessage);
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateDevice = async (deviceData) => {
    try {
      await adminAPI.createDevice(deviceData);
      toast.success('Device created successfully!');
      setShowForm(false);
      fetchDevices();
    } catch (error) {
      toast.error('Failed to create device');
    }
  };

  const handleUpdateDevice = async (deviceId, deviceData) => {
    try {
      await adminAPI.updateDevice(deviceId, deviceData);
      toast.success('Device updated successfully!');
      setEditingDevice(null);
      fetchDevices();
    } catch (error) {
      toast.error('Failed to update device');
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (window.confirm('Are you sure you want to delete this device?')) {
      try {
        await adminAPI.deleteDevice(deviceId);
        toast.success('Device deleted successfully!');
        fetchDevices();
      } catch (error) {
        toast.error('Failed to delete device');
      }
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Device Catalog</h2>
          <p className="text-sm text-gray-600 mt-1">
            {devices.length === 0 
              ? 'No devices found. Click "Seed Sample Devices" to populate the catalog with sample data for BOM generation.'
              : `${devices.length} device(s) in catalog`
            }
          </p>
        </div>
        <div className="flex space-x-2">
          {devices.length === 0 && (
            <button
              onClick={handleSeedDevices}
              disabled={seeding}
              className="btn-primary bg-green-600 hover:bg-green-700"
            >
              {seeding ? 'Seeding...' : 'Seed Sample Devices'}
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            Add Device
          </button>
        </div>
      </div>

      {devices.length === 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Device catalog is empty!</strong> You need to add devices before generating designs. 
                Click "Seed Sample Devices" to quickly populate the catalog with 13 sample devices (Routers, Switches, Access Points) 
                that will be used for BOM generation.
              </p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <DeviceForm
          onSubmit={handleCreateDevice}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingDevice && (
        <DeviceForm
          device={editingDevice}
          onSubmit={(data) => handleUpdateDevice(editingDevice._id, data)}
          onCancel={() => setEditingDevice(null)}
        />
      )}

      <div className="overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-header">Model Name</th>
              <th className="table-header">Type</th>
              <th className="table-header">Ports</th>
              <th className="table-header">PoE</th>
              <th className="table-header">Unit Price</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {devices.map((device) => (
              <tr key={device._id}>
                <td className="table-cell font-medium">
                  {device.modelName}
                </td>
                <td className="table-cell">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {device.type}
                  </span>
                </td>
                <td className="table-cell">
                  {device.specifications.portCount}
                </td>
                <td className="table-cell">
                  {device.specifications.poeCapable ? 'Yes' : 'No'}
                </td>
                <td className="table-cell">
                  ${device.unitPrice.toLocaleString()}
                </td>
                <td className="table-cell">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingDevice(device)}
                      className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteDevice(device._id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const DeviceForm = ({ device, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    modelName: device?.modelName || '',
    type: device?.type || 'AccessSwitch',
    specifications: {
      portCount: device?.specifications?.portCount || 24,
      poeCapable: device?.specifications?.poeCapable || false,
      maxThroughput: device?.specifications?.maxThroughput || '',
      powerConsumption: device?.specifications?.powerConsumption || '',
      dimensions: device?.specifications?.dimensions || ''
    },
    unitPrice: device?.unitPrice || 0,
    description: device?.description || ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('specifications.')) {
      const specField = name.split('.')[1];
      setFormData({
        ...formData,
        specifications: {
          ...formData.specifications,
          [specField]: type === 'checkbox' ? checked : value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="card">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {device ? 'Edit Device' : 'Add New Device'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Model Name *
            </label>
            <input
              type="text"
              name="modelName"
              value={formData.modelName}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Device Type *
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="input-field"
              required
            >
              <option value="Router">Router</option>
              <option value="CoreSwitch">Core Switch</option>
              <option value="DistributionSwitch">Distribution Switch</option>
              <option value="AccessSwitch">Access Switch</option>
              <option value="AccessPoint">Access Point</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Port Count *
            </label>
            <input
              type="number"
              name="specifications.portCount"
              value={formData.specifications.portCount}
              onChange={handleChange}
              className="input-field"
              min="1"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Unit Price *
            </label>
            <input
              type="number"
              name="unitPrice"
              value={formData.unitPrice}
              onChange={handleChange}
              className="input-field"
              min="0"
              step="0.01"
              required
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="specifications.poeCapable"
            checked={formData.specifications.poeCapable}
            onChange={handleChange}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            PoE Capable
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="input-field"
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
          <button
            type="submit"
            className="btn-primary"
          >
            {device ? 'Update Device' : 'Create Device'}
          </button>
        </div>
      </form>
    </div>
  );
};
