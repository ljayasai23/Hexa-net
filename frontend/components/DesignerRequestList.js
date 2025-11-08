import { useState } from 'react';
import { designsAPI, requestsAPI } from '../lib/api';
import toast from 'react-hot-toast';
import MermaidDiagram from './MermaidDiagram';
import BillOfMaterialsTable from './BillOfMaterialsTable';
import IpPlanTable from './IpPlanTable';

export default function DesignerRequestList({ requests, onRequestUpdated }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [design, setDesign] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDesignModal, setShowDesignModal] = useState(false);

  // DesignerRequestList.js (Inside handleGenerateDesign)

  const handleGenerateDesign = async (requestId) => {
    setLoading(true);
    try {
      const response = await designsAPI.generate(requestId);
      
      // CRITICAL FIX: Ensure the state update waits for the response
      const updatedDesign = await LogicDesign.findByIdAndUpdate(
        logicDesign._id,
        { reportPdfUrl: pdfUrl },
        { new: true, runValidators: true } // Run validators just in case
    );
    
    if (!updatedDesign) {
        // If the update fails, throw a clear error to the console
        console.error("CRITICAL: Failed to update LogicDesign document with PDF URL.");
        return res.status(500).json({ message: 'Internal error saving PDF link to database.' });
    }
      
      setDesign(updatedDesign); // Sets the state with the fresh URL
      setShowDesignModal(true);
      onRequestUpdated();
      toast.success('Design generated and PDF created!');
    } catch (error) {
      // Show the explicit error if the PDF URL wasn't returned
      toast.error('Failed to generate design: ' + (error.message || 'Check server logs.'));
    } finally {
      setLoading(false);
    }
  };

  // --- MODIFIED: Renamed and logic changed for submission ---
  // DesignerRequestList.js (Inside the main component function)

  // --- MODIFIED: Renamed and logic changed for submission ---
 // DesignerRequestList.js (Inside the main component function)

  // --- MODIFIED: Renamed and logic changed for submission ---
  // DesignerRequestList.js (Inside the main component function)

  // --- MODIFIED: Renamed and logic changed for submission ---
  // The function now accepts the design ID and the required URL directly.
  const handleSubmitDesign = async (designId, notes, reportPdfUrl) => { // <-- NOTE: Added reportPdfUrl argument
    
    // Safety check (redundant, but good practice)
    if (!reportPdfUrl) {
        toast.error('Submission failed: PDF report URL is missing from data.');
        return; 
    }
    
    try {
      console.log('Submitting design with ID:', designId);
      // Send the request to the backend
      const response = await designsAPI.submitForReview(designId);
      console.log('Submit response:', response);
      toast.success('Design report submitted to Admin for review!');
      setShowDesignModal(false);
      onRequestUpdated();
    } catch (error) {
      console.error('Submit design error:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      // Catch backend validation error if status is incorrect
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit design';
      toast.error(errorMessage);
      
      // Log detailed error for debugging
      if (error.response?.data?.details) {
        console.error('Error details:', error.response.data.details);
      }
    }
  };
  // ---------------------------------------------------------

  // ... rest of the main component code ...
  // ---------------------------------------------------------
  const handleViewDesign = async (requestId) => {
    setLoading(true);
    try {
      // 1. Fetch the Request details (Crucial to get the CURRENT STATUS)
      const requestResponse = await requestsAPI.getById(requestId);
      const requestData = requestResponse.data.request; // This has the status: 'Design In Progress'

      // 2. Fetch the Design linked to the request
      const designResponse = await designsAPI.getByRequest(requestId);
      const designData = designResponse.data.design;
      
      console.log('Fetched design data:', {
        id: designData._id,
        hasReportPdfUrl: !!designData.reportPdfUrl,
        reportPdfUrl: designData.reportPdfUrl,
        allKeys: Object.keys(designData)
      });
      
      // Check if reportPdfUrl is missing
      if (!designData.reportPdfUrl) {
        console.error('⚠️ Design fetched but reportPdfUrl is missing!');
        console.error('Full design object:', JSON.stringify(designData, null, 2));
        // Don't show error toast here - let the modal handle it
      }
      
      // 3. CRITICAL FIX: Attach the full request object to the design object
      //    This makes 'design.request.status' available to the DesignModal's logic.
      designData.request = requestData; 
      
      setDesign(designData);
      // We don't necessarily need setSelectedRequest here, but setting design is key.
      setShowDesignModal(true);
      // Refresh parent list so the card reflects the new 'design' presence/status
      if (typeof onRequestUpdated === 'function') {
        onRequestUpdated();
      }
    } catch (error) {
      toast.error('Failed to fetch design or request details.');
    } finally {
      setLoading(false);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No assigned requests found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Assigned Requests</h2>
      
      <div className="grid gap-6">
        {requests.map((request) => (
          <div key={request._id} className="card">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {request.requirements.campusName}
                </h3>
                <p className="text-sm text-gray-600">
                  Client: {request.client?.name}
                </p>
                <p className="text-sm text-gray-600">
                  Departments: {request.requirements.departments.length}
                </p>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    request.status === 'New' ? 'bg-yellow-100 text-yellow-800' :
                    request.status === 'Assigned' ? 'bg-blue-100 text-blue-800' :
                    request.status === 'Design In Progress' ? 'bg-purple-100 text-purple-800' :
                    request.status === 'Design Complete' ? 'bg-green-100 text-green-800' :
                    request.status === 'Design Submitted' ? 'bg-orange-100 text-orange-800' : // <-- NEW STATUS COLOR
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {request.status}
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {request.design ? (
                  <button
                    onClick={() => handleViewDesign(request._id)}
                    className="btn-primary"
                  >
                    View Design
                  </button>
                ) : (
                  <button
                    onClick={() => handleGenerateDesign(request._id)}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? 'Generating...' : 'Generate Design'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showDesignModal && design && (
        <DesignModal
          design={design}
          // --- MODIFIED PROP NAME ---
          onSubmit={handleSubmitDesign} 
          // --------------------------
          onClose={() => setShowDesignModal(false)}
        />
      )}
    </div>
  );
}

// --- MODIFIED DesignModal Component ---
const DesignModal = ({ design, onSubmit, onClose }) => { // Changed prop from onApprove to onSubmit
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Changed state name

  const handleSubmit = async () => { // Changed handler name
    
    // 1. Frontend Status Check
    if (design.request.status === 'Design Submitted') {
        toast.error('Design already submitted for review.');
        return;
    }

    // 2. Frontend PDF URL Check (CRITICAL)
    if (!design.reportPdfUrl) {
        toast.error('PDF report has not been generated or saved. Please check server logs.');
        return;
    }
    
    setIsSubmitting(true);
    try {
      // CRITICAL: Pass the PDF URL property here to the handler
      await onSubmit(design._id, notes, design.reportPdfUrl); 
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine the button visibility and text
  let buttonText = 'Request to Admin';
  let isActionVisible = false;

  if (design.request.status === 'Design In Progress') {
    // Designer is ready to submit
    isActionVisible = true;
  } else if (design.request.status === 'Design Submitted') {
    // Already submitted, maybe designer wants to save a draft but not re-submit
    buttonText = 'Submitted (Waiting Admin)';
    isActionVisible = false; // Hide the active submission button
  }


  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-medium text-gray-900">
              Network Design Report
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* ... (BOM, IP Plan, Topology remain the same) ... */}
            
            {/* Bill of Materials */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">Bill of Materials</h4>
              <BillOfMaterialsTable billOfMaterials={design.billOfMaterials} />
            </div>

            {/* IP Plan */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">IP Plan & VLANs</h4>
              <IpPlanTable ipPlan={design.ipPlan} />
            </div>

            {/* Topology Diagram */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">Network Topology</h4>
              <div className="border border-gray-200 rounded-lg p-4">
                <MermaidDiagram diagramString={design.topologyDiagram} />
              </div>
            </div>

            {/* Design Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Design Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="input-field"
                placeholder="Add any notes about this design..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Close
              </button>
              {/* --- MODIFIED BUTTON LOGIC AND TEXT --- */}
              {isActionVisible && (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="btn-primary bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSubmitting ? 'Submitting...' : buttonText}
                </button>
              )}
              {/* -------------------------------------- */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};