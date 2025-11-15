const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { generateDesign } = require('../services/designService');
const { generatePdfReport } = require('../services/pdfService');
// --- NEW IMPORT ---
const { createNotification } = require('../services/notificationService');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { body, validationResult } = require('express-validator');
const Request = require('../models/Request');
const LogicDesign = require('../models/LogicDesign');
const Device = require('../models/Device');
const { auth, authorize } = require('../middleware/auth');
 // <--- CRITICAL FIX

const router = express.Router();

// @route   POST /api/designs/generate/:requestId
// @desc    Generate logical design for a request
// @access  Private (Network Designer only)
router.post('/generate/:requestId', [
  auth,
  authorize('Network Designer')
], async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId)
      .populate('client', 'name email');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if designer is assigned to this request
    if (request.assignedDesigner?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You are not assigned to this request.' });
    }

    // Check if design already exists
    if (request.design) {
      return res.status(400).json({ message: 'Design already exists for this request' });
    }

    // Generate the design
    const designData = await generateDesign(request);

    // Create the LogicDesign document
    const logicDesign = new LogicDesign({
      request: request._id,
      ...designData
    });

    await logicDesign.save();

    await logicDesign.populate('billOfMaterials.device');
    const designer = req.user; // Assuming req.user is populated by 'auth' middleware
    const pdfUrl = await generatePdfReport(logicDesign, request, designer);
    // ...
    logicDesign.reportPdfUrl = pdfUrl; // <--- FIX: Use the 'pdfUrl' variable
    await logicDesign.save();
    // Update the request with the design reference, status, and progress
    // This ensures the request reflects that design work has started
    // Calculate progress based on requestType
    const requestType = request.requestType || 'Both Design and Installation';
    const progress = requestType === 'Both Design and Installation' ? 25 : 40;
    
    let updatedRequest;
    try {
        updatedRequest = await Request.findByIdAndUpdate(
            request._id,
            { 
                design: logicDesign._id,
                status: 'Design In Progress',
                progress: progress
            },
            { new: true, runValidators: true } // Return the updated document with validation
        );
    } catch (validationError) {
        console.error('Status update validation error during design generation:', validationError);
        // Try without validators for old data compatibility
        if (validationError.name === 'ValidationError') {
            updatedRequest = await Request.findByIdAndUpdate(
                request._id,
                { 
                    design: logicDesign._id,
                    status: 'Design In Progress',
                    progress: 40
                },
                { new: true, runValidators: false } // Skip validators for old data
            );
        } else {
            throw validationError;
        }
    }
  
    if (!updatedRequest) {
        console.error('Failed to update request after design generation');
        // Handle unexpected failure to update request
        return res.status(500).json({ message: 'Design generated, but failed to update main request status.' });
    }
    
    console.log('Request updated after design generation:', {
        id: updatedRequest._id,
        status: updatedRequest.status,
        progress: updatedRequest.progress,
        hasDesign: !!updatedRequest.design
    });

    // Populate the design data for response
    await logicDesign.populate('billOfMaterials.device');

    // Ensure isApproved is explicitly set to false for new designs
    const finalDesign = logicDesign.toObject ? logicDesign.toObject() : logicDesign;
    if (finalDesign.isApproved === undefined || finalDesign.isApproved === null) {
      finalDesign.isApproved = false;
    }
    
    res.status(201).json({
      message: 'Design generated successfully',
      design: finalDesign
    });
  } catch (error) {
    console.error('Generate design error:', error);
    res.status(500).json({ message: 'Server error generating design' });
  }
});

// @route   GET /api/designs/:id
// @desc    Get a specific design
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const design = await LogicDesign.findById(req.params.id)
      .populate('request')
      .populate('billOfMaterials.device')
      .populate('approvedBy', 'name email');

    if (!design) {
      return res.status(404).json({ message: 'Design not found' });
    }

    // Check access permissions
    const request = design.request;
    const canAccess = 
      request.client.toString() === req.user._id.toString() ||
      request.assignedDesigner?.toString() === req.user._id.toString() ||
      request.assignedInstaller?.toString() === req.user._id.toString() ||
      req.user.role === 'Web Admin';

    if (!canAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Ensure isApproved is explicitly set (default to false if undefined/null)
    const designObj = design.toObject ? design.toObject() : design;
    if (designObj.isApproved === undefined || designObj.isApproved === null) {
      designObj.isApproved = false;
    }

    res.json({ design: designObj });
  } catch (error) {
    console.error('Get design error:', error);
    res.status(500).json({ message: 'Server error fetching design' });
  }
});

// @route   PUT /api/designs/:id
// @desc    Update a specific design (BOM, IP Plan, Diagram Syntax)
// @access  Private (Network Designer only)
router.put('/admin-approve/:id', [
  auth,
  authorize('Web Admin'), // <--- ONLY ADMIN CAN DO THIS NOW
  body('designNotes').optional().isString().withMessage('Design notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { designNotes } = req.body;
    const design = await LogicDesign.findById(req.params.id).populate('request');

    if (!design) {
      return res.status(404).json({ message: 'Design not found' });
    }
    if (!design.reportPdfUrl) {
        return res.status(400).json({ message: 'Cannot approve: PDF report is missing.' });
    }
    
    // Check if the request is in the correct status to be approved
    if (design.request.status !== 'Design Submitted') {
        return res.status(400).json({ message: 'Design is not currently submitted for review.' });
    }
    if (design.isApproved) {
        return res.status(400).json({ message: 'Design is already approved.' });
    }

    // 1. Update design document fields (Approval)
    design.isApproved = true;
    design.approvedBy = req.user._id;
    design.approvedAt = new Date();
    if (designNotes) {
      design.designNotes = designNotes;
    }
    await design.save(); 

    // 2. Update the Request status to be reviewed by the client
    const requestId = design.request._id;
    const updatedRequest = await Request.findByIdAndUpdate(
        requestId,
        { status: 'Awaiting Client Review' }, // <--- NEW STATUS: Forwarded to Client
        { new: true }
    );

    // 3. Logic to notify Client (omitted for brevity)
    // 3. Notify the Client
    if (updatedRequest.client) {
      await createNotification({
          user: updatedRequest.client,
          request: updatedRequest._id,
          type: 'design_approved',
          title: '🟢 Admin Approved Design Report',
          message: `The design report for project ${updatedRequest._id.toString().slice(-4)} has been approved. Please review and accept.`
      });
  }
    res.json({
      message: 'Design approved and forwarded to Client successfully',
      design,
      request: updatedRequest
    });
  } catch (error) {
    console.error('Admin approve design error:', error);
    res.status(500).json({ message: 'Server error approving design' });
  }
});

// @route   PUT /api/designs/:id/approve
// @desc    Approve a design
// @access  Private (Network Designer only)
// backend/routes/designs.js (Add this at the end of the file, before module.exports)

// @route   PUT /api/designs/submit/:id
// @desc    Designer submits the design (and PDF) for Admin approval
// @access  Private (Network Designer only)
router.put('/submit/:id', [
  auth,
  authorize('Network Designer')
], async (req, res) => {
  try {
    console.log('=== SUBMIT DESIGN ENDPOINT CALLED ===');
    console.log('Design ID from params:', req.params.id);
    console.log('User ID:', req.user?._id);
    console.log('User role:', req.user?.role);
    
    // Validate design ID format
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error('Invalid design ID format:', req.params.id);
      return res.status(400).json({ message: 'Invalid design ID format' });
    }
    
    const design = await LogicDesign.findById(req.params.id).populate('request');

    if (!design) {
      console.error('Design not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Design not found' });
    }
    
    console.log('Design found:', design._id);
    console.log('Design request reference:', design.request);
    
    // If populate didn't work, try fetching request separately
    let request = design.request;
    if (!request && design.request) {
      // If request is an ObjectId (not populated), fetch it
      request = await Request.findById(design.request);
    }
    
    if (!request) {
      console.error('Request not found for design:', design._id);
      return res.status(404).json({ message: 'Request associated with design not found' });
    }
    
    console.log('Request found:', request._id);
    console.log('Request status:', request.status);
    console.log('Request assignedDesigner:', request.assignedDesigner);
    
    if (!design.reportPdfUrl) {
        console.error('PDF report URL missing for design:', design._id);
        return res.status(400).json({ message: 'PDF report is missing. Please regenerate the design.' });
    }
    
    // Check assignment
    const assignedDesignerId = request.assignedDesigner?.toString();
    const userId = req.user._id.toString();
    console.log('Checking assignment - Assigned:', assignedDesignerId, 'User:', userId);
    
    if (assignedDesignerId !== userId) {
      console.error('Access denied - designer mismatch');
      return res.status(403).json({ message: 'Access denied. You are not assigned to this request.' });
    }

    // Log current request state for debugging
    console.log('Current request status:', request.status);
    console.log('Request ID:', request._id);
    console.log('Updating to status: Design Submitted');

    // Try to update the request status - use a safer approach for old data
    // Note: findByIdAndUpdate with runValidators doesn't always throw - it might return null
    // So we'll use a two-step approach: try with validators, fallback without
    
    let updatedRequest;
    
    // First, verify the request exists and get current state
    const currentRequest = await Request.findById(request._id);
    if (!currentRequest) {
        console.error('Request not found in database:', request._id);
        return res.status(404).json({ message: 'Request not found in database' });
    }
    
    console.log('Current request before update:', {
        id: currentRequest._id,
        status: currentRequest.status,
        assignedDesigner: currentRequest.assignedDesigner,
        hasDesign: !!currentRequest.design
    });
    
    // Try update with validators first
    try {
        updatedRequest = await Request.findByIdAndUpdate(
            request._id,
            { status: 'Design Submitted' },
            { 
                new: true, 
                runValidators: true,
                context: 'query' // This helps with validation
            }
        );
        
        // Check if update returned null (validation might have failed silently)
        if (!updatedRequest) {
            throw new Error('Update returned null - possible validation failure');
        }
        
        console.log('Status updated successfully with validators');
    } catch (updateError) {
        console.error('Status update error (with validators):', updateError);
        console.error('Error type:', updateError.name);
        console.error('Error message:', updateError.message);
        
        // Try without validators as fallback (for old data compatibility)
        console.log('Attempting update without validators (fallback)...');
        try {
            updatedRequest = await Request.findByIdAndUpdate(
                request._id,
                { status: 'Design Submitted' },
                { 
                    new: true, 
                    runValidators: false // Skip validators for old data
                }
            );
            
            if (!updatedRequest) {
                console.error('Fallback update also returned null');
                return res.status(500).json({ 
                    message: 'Failed to update request status',
                    error: 'Update operation returned null - request may have been deleted'
                });
            }
            
            console.log('Status updated successfully (without validators) - old data compatibility mode');
        } catch (fallbackError) {
            console.error('Fallback update also failed:', fallbackError);
            return res.status(500).json({ 
                message: 'Failed to update request status',
                error: fallbackError.message || 'Unknown error during status update',
                details: fallbackError
            });
        }
    }
    
    if (!updatedRequest) {
        console.error('updatedRequest is null after all attempts');
        return res.status(500).json({ message: 'Failed to update request status - update returned null' });
    }
    
    console.log('Request status updated successfully to:', updatedRequest.status);
    
    // Logic to send a notification to the Web Admin (omitted for brevity)
    // 3. Notify the Web Admin
    try {
        const webAdmins = await User.find({ role: 'Web Admin' });
        if (webAdmins.length > 0) {
            // Notify all admins - catch individual errors but don't fail the whole operation
            await Promise.all(webAdmins.map(async (admin) => {
                try {
                    await createNotification({
                        user: admin._id,
                        request: updatedRequest._id,
                        type: 'design_review',
                        title: '🟢 New Design Report Received',
                        message: `Report for project ${request._id.toString().slice(-4)} submitted by ${req.user?.name || 'Designer'} for your review.`
                    });
                } catch (notifError) {
                    console.error(`Failed to create notification for admin ${admin._id}:`, notifError);
                    // Continue even if notification fails
                }
            }));
        }
    } catch (notifError) {
        console.error('Error creating notifications:', notifError);
        // Don't fail the submission if notifications fail
    }
    res.json({
      message: 'Design submitted for Admin review successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Submit design error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Provide more specific error messages
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error submitting design',
        error: error.message,
        details: error.errors
      });
    }
    
    res.status(500).json({ 
      message: 'Server error submitting design',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ... (Modify the old 'approve' route to be a NEW 'admin-approve' route)
// @route   GET /api/designs/request/:requestId
// @desc    Get design for a specific request
// @access  Private
router.get('/request/:requestId', auth, async (req, res) => {
  try {
    console.log('Fetching design for request ID:', req.params.requestId);
    
    const design = await LogicDesign.findOne({ request: req.params.requestId })
      .populate('billOfMaterials.device')
      .populate('approvedBy', 'name email');

    if (!design) {
      console.error('Design not found for request:', req.params.requestId);
      return res.status(404).json({ message: 'Design not found for this request' });
    }

    console.log('Design found:', {
      id: design._id,
      hasReportPdfUrl: !!design.reportPdfUrl,
      reportPdfUrl: design.reportPdfUrl
    });

    // Check access permissions through the request
    const request = await Request.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // AUTO-FIX: If reportPdfUrl is missing but PDF file exists, update it
    if (!design.reportPdfUrl && request) {
      const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'reports');
      const campusName = request.requirements?.campusName || 'Unknown';
      const fileName = `DesignReport-${campusName.replace(/\s/g, '-')}-${request._id}.pdf`;
      const filePath = path.join(uploadDir, fileName);
      
      if (fs.existsSync(filePath)) {
        console.log('⚠️ PDF file exists but reportPdfUrl is missing. Auto-fixing...');
        const pdfUrl = `/uploads/reports/${fileName}`;
        design.reportPdfUrl = pdfUrl;
        await design.save();
        console.log('✅ Auto-fixed reportPdfUrl:', pdfUrl);
      } else {
        console.log('⚠️ PDF file not found at expected path:', filePath);
      }
    }
    
    // AUTO-FIX: If design exists but status is incorrect (e.g., "Assigned" when design is created)
    // This fixes data inconsistencies where design was created but status wasn't updated
    if (design && request) {
      const hasDesignButWrongStatus = 
        request.design && 
        request.status !== 'Design In Progress' && 
        request.status !== 'Design Submitted' && 
        request.status !== 'Awaiting Client Review' && 
        request.status !== 'Completed' &&
        request.status !== 'Installation In Progress';
      
      if (hasDesignButWrongStatus) {
        console.log('⚠️ Design exists but status is incorrect. Auto-fixing...');
        console.log('Current status:', request.status, 'Expected: Design In Progress');
        
        try {
          await Request.findByIdAndUpdate(
            request._id,
            { 
              status: 'Design In Progress',
              progress: 40
            },
            { runValidators: false } // Skip validators for old data compatibility
          );
          console.log('✅ Auto-fixed request status to: Design In Progress');
          
          // Re-fetch the request to get updated status
          const updatedRequestDoc = await Request.findById(request._id);
          if (updatedRequestDoc) {
            request = updatedRequestDoc;
            // Update the design object's request reference if needed
            if (design.request && typeof design.request === 'object') {
              design.request.status = updatedRequestDoc.status;
              design.request.progress = updatedRequestDoc.progress;
            }
          }
        } catch (fixError) {
          console.error('Failed to auto-fix request status:', fixError);
        }
      }
    }
    
    const canAccess = 
      request.client.toString() === req.user._id.toString() ||
      request.assignedDesigner?.toString() === req.user._id.toString() ||
      request.assignedInstaller?.toString() === req.user._id.toString() ||
      req.user.role === 'Web Admin';

    if (!canAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Ensure we return the design with all fields including reportPdfUrl and isApproved
    const designObj = design.toObject ? design.toObject() : design;
    
    // CRITICAL: Ensure isApproved is explicitly set (default to false if undefined/null)
    if (designObj.isApproved === undefined || designObj.isApproved === null) {
      designObj.isApproved = false;
    }
    
    console.log('Returning design:', {
      id: designObj._id,
      hasReportPdfUrl: !!designObj.reportPdfUrl,
      isApproved: designObj.isApproved,
      reportPdfUrl: designObj.reportPdfUrl
    });
    
    res.json({ design: designObj });
  } catch (error) {
    console.error('Get design by request error:', error);
    res.status(500).json({ message: 'Server error fetching design' });
  }
});

module.exports = router;
