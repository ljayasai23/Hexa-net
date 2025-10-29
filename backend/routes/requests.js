const express = require('express');

// --- MODIFIED IMPORT ---
// const Notification = require('../models/Notification'); // DELETE THIS LINE
const { auth, authorize } = require('../middleware/auth');
const { createNotification } = require('./notifications');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Request = require('../models/Request');
const User = require('../models/User');


const Notification = require('../models/Notification');
const router = express.Router();

// @route   POST /api/requests
// @desc    Create a new network request
// @access  Private (Client only)
router.post('/', [
  auth,
  authorize('Client'),
  body('requirements.campusName').notEmpty().withMessage('Campus name is required'),
  body('requirements.departments').isArray({ min: 1 }).withMessage('At least one department is required'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('requestType').isIn(['Design Only', 'Installation Only', 'Both Design and Installation']).withMessage('Invalid request type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { requirements, priority = 'Medium', description, requestType } = req.body;

    const request = new Request({
      client: req.user._id,
      requirements,
      priority,
      description,
      requestType
    });

    await request.save();
    await request.populate('client', 'name email');

    res.status(201).json({
      message: 'Network request created successfully',
      request
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ message: 'Server error creating request' });
  }
});

// @route   GET /api/requests
// @desc    Get requests based on user role
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    let populateFields = ['client', 'assignedDesigner', 'assignedInstaller'];

    // Role-based filtering
    switch (req.user.role) {
      case 'Client':
        query.client = req.user._id;
        break;
      case 'Network Designer':
        query.assignedDesigner = req.user._id;
        break;
      case 'Network Installation Team':
        query.assignedInstaller = req.user._id;
        break;
      case 'Web Admin':
        // Web Admin can see all requests
        break;
      default:
        return res.status(403).json({ message: 'Access denied' });
    }

    const requests = await Request.find(query)
      .populate(populateFields, 'name email role')
      .populate('design')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ message: 'Server error fetching requests' });
  }
});

// @route   GET /api/requests/:id
// @desc    Get a specific request
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('client', 'name email')
      .populate('assignedDesigner', 'name email')
      .populate('assignedInstaller', 'name email')
      .populate('design');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check access permissions
    const canAccess = 
      request.client._id.toString() === req.user._id.toString() ||
      request.assignedDesigner?._id.toString() === req.user._id.toString() ||
      request.assignedInstaller?._id.toString() === req.user._id.toString() ||
      req.user.role === 'Web Admin';

    if (!canAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ request });
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({ message: 'Server error fetching request' });
  }
});

// @route   PUT /api/requests/:id/assign
// @desc    Assign request to designer or installer
// @access  Private (Web Admin only)
router.put('/:id/assign', [
  auth,
  authorize('Web Admin'),
  body('assignedDesigner').optional().custom((value) => {
    if (value && value !== '' && !mongoose.Types.ObjectId.isValid(value)) {
      throw new Error('Invalid designer ID');
    }
    return true;
  }),
  body('assignedInstaller').optional().custom((value) => {
    if (value && value !== '' && !mongoose.Types.ObjectId.isValid(value)) {
      throw new Error('Invalid installer ID');
    }
    return true;
  }),
  // NEW:
body('status').optional().isIn(['New', 'Assigned', 'Design In Progress', 'Design Submitted', 'Awaiting Client Review', 'Design Complete', 'Installation In Progress', 'Completed'])
.withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { assignedDesigner, assignedInstaller, status } = req.body;
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Validate assigned users exist and have correct roles
    if (assignedDesigner && assignedDesigner !== '') {
      const designer = await User.findById(assignedDesigner);
      if (!designer || designer.role !== 'Network Designer') {
        return res.status(400).json({ message: 'Invalid designer assignment' });
      }
    }

    if (assignedInstaller && assignedInstaller !== '') {
      const installer = await User.findById(assignedInstaller);
      if (!installer || installer.role !== 'Network Installation Team') {
        return res.status(400).json({ message: 'Invalid installer assignment' });
      }
    }

    // Update request - handle status changes first to avoid validation errors
    const updateData = {};
    if (status) {
      updateData.status = status;
      // Update progress based on status
      switch (status) {
        case 'New':
          updateData.progress = 0;
          break;
        case 'Assigned':
          updateData.progress = 20;
          break;
        case 'Design In Progress':
          updateData.progress = 40;
          break;
        case 'Design Complete':
          updateData.progress = 60;
          break;
        case 'Installation In Progress':
          updateData.progress = 80;
          break;
        case 'Completed':
          updateData.progress = 100;
          updateData.actualCompletionDate = new Date();
          break;
      }
    }
    if (assignedDesigner && assignedDesigner !== '') updateData.assignedDesigner = assignedDesigner;
    if (assignedInstaller && assignedInstaller !== '') updateData.assignedInstaller = assignedInstaller;

    const updatedRequest = await Request.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate(['client', 'assignedDesigner', 'assignedInstaller'], 'name email role');

    // Create notification for the client
    if (updatedRequest.client) {
      const notification = new Notification({
        user: updatedRequest.client._id,
        project: updatedRequest._id,
        type: 'assignment',
        title: 'Project Assignment Update',
        message: `Your project "${updatedRequest.title || 'Network Request'}" has been assigned to a designer. Status: ${updatedRequest.status}`
      });
      await notification.save();
    }

    res.json({
      message: 'Request updated successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Assign request error:', error);
    res.status(500).json({ message: 'Server error updating request' });
  }
});

// @route   PUT /api/requests/:id/status
// @desc    Update request status
// @access  Private
router.put('/:id/status', [
  auth,
  // NEW:
body('status').isIn(['New', 'Assigned', 'Design In Progress', 'Design Submitted', 'Awaiting Client Review', 'Design Complete', 'Installation In Progress', 'Completed'])
.withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { status } = req.body;
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check permissions based on role and current assignment
    const canUpdate = 
      (req.user.role === 'Web Admin') ||
      (req.user.role === 'Network Designer' && request.assignedDesigner?.toString() === req.user._id.toString()) ||
      (req.user.role === 'Network Installation Team' && request.assignedInstaller?.toString() === req.user._id.toString());

    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedRequest = await Request.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate(['client', 'assignedDesigner', 'assignedInstaller'], 'name email role');

    res.json({
      message: 'Request status updated successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error updating status' });
  }
});

// @route   PUT /api/requests/:id/response
// @desc    Add admin response to request
// @access  Private (Web Admin only)
router.put('/:id/response', [
  auth,
  authorize('Web Admin'),
  body('adminResponse', 'Admin response is required').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { adminResponse } = req.body;
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const updatedRequest = await Request.findByIdAndUpdate(
      req.params.id,
      { 
        adminResponse,
        adminResponseDate: new Date()
      },
      { new: true, runValidators: true }
    ).populate(['client', 'assignedDesigner', 'assignedInstaller'], 'name email role');

    // Create notification for the client
    if (updatedRequest.client) {
      const notification = new Notification({
        user: updatedRequest.client._id,
        project: updatedRequest._id,
        type: 'response',
        title: 'Admin Response',
        message: `You have received a response from the admin for your project "${updatedRequest.title || 'Network Request'}"`
      });
      await notification.save();
    }

    res.json({
      message: 'Admin response added successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Add response error:', error);
    res.status(500).json({ message: 'Server error adding response' });
  }
});

router.put('/:id/complete-by-client', auth, async (req, res) => {
    try {
      const request = await Request.findById(req.params.id);
  
      if (!request) {
        return res.status(404).json({ message: 'Request not found' });
      }
  
      // Ensure the client field is populated if not already
      // This handles the case where request.client might be an ObjectId, not a full document
      if (!request.client || typeof request.client.toString !== 'function') {
          await request.populate('client');
      }
  
      // Check if user is the client and request is in the right status
      if (request.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied. You are not the client for this request.' });
      }
      
      // Check for the new status 'Awaiting Client Review'
      if (request.status !== 'Awaiting Client Review') {
        return res.status(400).json({ message: `Request status must be 'Awaiting Client Review' to be marked complete. Current status: ${request.status}` });
      }
  
      // Update the request status to Final Completed
      request.status = 'Completed';
      request.actualCompletionDate = new Date();
      // Also update progress to 100%
      request.progress = 100;
      await request.save();
  
      // NOTE: You may want to add logic here to notify the Admin and/or Installer 
      // that the client has approved and marked the project as complete.
      // NOTE: Notify the Designer (and Admin) that the client accepted the design
      if (request.assignedDesigner) {
        await createNotification({
            user: request.assignedDesigner,
            request: request._id,
            type: 'client_acceptance',
            title: '✅ Design Accepted by Client',
            message: `Your design report for project ${request._id.toString().slice(-4)} has been formally accepted by the client.`
        });
      }
      
      // Optional: Notify Admin that client finalized the request
      const webAdmins = await User.find({ role: 'Web Admin' });
      if (webAdmins.length > 0) {
          await Promise.all(webAdmins.map(admin => createNotification({
              user: admin._id,
              request: request._id,
              type: 'project_completed',
              title: 'Project Completed by Client',
              message: `Project ${request._id.toString().slice(-4)} has been marked as completed by the client.`
          })));
      }
      res.json({
        message: 'Request successfully marked as Completed by Client',
        request
      });
    } catch (error) {
      console.error('Client complete error:', error);
      res.status(500).json({ message: 'Server error marking as complete' });
    }
  });




module.exports = router;
