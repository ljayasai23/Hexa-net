const express = require('express');
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
    // Update the request with the design reference
    // New/Corrected Code (Prevents validation errors by using a direct update)
    // Update the request with the design reference and new status
    const updatedRequest = await Request.findByIdAndUpdate(
      request._id,
      { 
          design: logicDesign._id,
          status: 'Design In Progress'
      },
      { new: true } // Return the updated document
  );
  
  if (!updatedRequest) {
      // Handle unexpected failure to update request
      return res.status(500).json({ message: 'Design generated, but failed to update main request status.' });
  }

    // Populate the design data for response
    await logicDesign.populate('billOfMaterials.device');

  const finalDesign = logicDesign.toObject({ getters: true }); 
    res.status(201).json({
      message: 'Design generated successfully',
      design: logicDesign
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

    res.json({ design });
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
    const design = await LogicDesign.findById(req.params.id).populate('request');

    if (!design) {
      return res.status(404).json({ message: 'Design not found' });
    }
    if (!design.reportPdfUrl) {
        return res.status(400).json({ message: 'PDF report is missing. Please regenerate the design.' });
    }
    
    // Check assignment
    if (design.request.assignedDesigner?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You are not assigned to this request.' });
    }

    // Update the request status
    const updatedRequest = await Request.findByIdAndUpdate(
        design.request._id,
        { status: 'Design Submitted' },
        { new: true }
    );
    
    // Logic to send a notification to the Web Admin (omitted for brevity)
    // 3. Notify the Web Admin
    const webAdmins = await User.find({ role: 'Web Admin' });
    if (webAdmins.length > 0) {
        // Notify all admins
        await Promise.all(webAdmins.map(admin => createNotification({
            user: admin._id,
            request: updatedRequest._id,
            type: 'design_review',
            title: '🟢 New Design Report Received',
            message: `Report for project ${design.request._id.toString().slice(-4)} submitted by ${req.user.name} for your review.`
        })));
    }
    res.json({
      message: 'Design submitted for Admin review successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Submit design error:', error);
    res.status(500).json({ message: 'Server error submitting design' });
  }
});

// ... (Modify the old 'approve' route to be a NEW 'admin-approve' route)
// @route   GET /api/designs/request/:requestId
// @desc    Get design for a specific request
// @access  Private
router.get('/request/:requestId', auth, async (req, res) => {
  try {
    const design = await LogicDesign.findOne({ request: req.params.requestId })
      .populate('billOfMaterials.device')
      .populate('approvedBy', 'name email');

    if (!design) {
      return res.status(404).json({ message: 'Design not found for this request' });
    }

    // Check access permissions through the request
    const request = await Request.findById(req.params.requestId);
    const canAccess = 
      request.client.toString() === req.user._id.toString() ||
      request.assignedDesigner?.toString() === req.user._id.toString() ||
      request.assignedInstaller?.toString() === req.user._id.toString() ||
      req.user.role === 'Web Admin';

    if (!canAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ design });
  } catch (error) {
    console.error('Get design by request error:', error);
    res.status(500).json({ message: 'Server error fetching design' });
  }
});

module.exports = router;
