const express = require('express');
const fs = require('fs');
const path = require('path');

// --- MODIFIED IMPORT ---
// const Notification = require('../models/Notification'); // DELETE THIS LINE
// ...
const { auth, authorize } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService'); // <--- THIS IS THE FIX
const { body, validationResult } = require('express-validator');
// ...
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
  body('requirements.departments').custom((value, { req }) => {
    // Departments are required only for Design Only or Both Design and Installation
    if (req.body.requestType !== 'Installation Only') {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error('At least one department is required for design requests');
      }
    }
    // For Installation Only, departments can be empty array
    return true;
  }),
  body('description').notEmpty().withMessage('Description is required')
    .isLength({ min: 50, max: 500 }).withMessage('Description must be between 50 and 500 characters'),
  body('requestType').isIn(['Design Only', 'Installation Only', 'Both Design and Installation']).withMessage('Invalid request type'),
  body('uploadedFiles').custom((value, { req }) => {
    // For Installation Only, at least one uploaded file should be present (handled in frontend)
    // Backend validation is lenient here since files might be handled separately
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { requirements, priority = 'Medium', description, requestType, uploadedFiles = [] } = req.body;

    // For Installation Only, set empty departments array if not provided or if empty
    const requestData = {
      client: req.user._id,
      requirements: {
        campusName: requirements.campusName,
        departments: requestType === 'Installation Only' ? [] : (requirements.departments || []),
        additionalRequirements: requirements.additionalRequirements || ''
      },
      priority,
      description,
      requestType,
      uploadedFiles: uploadedFiles || []
    };

    // For Installation Only, validate that files are provided and save them
    if (requestType === 'Installation Only') {
      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({ 
          message: 'Design documents are required for installation-only requests. Please upload at least one PDF file.' 
        });
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'designs');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Process and save uploaded files
      const savedFiles = [];
      for (const fileData of uploadedFiles) {
        try {
          // Generate unique filename
          const timestamp = Date.now();
          const sanitizedCampusName = (requirements.campusName || 'Unknown').replace(/[^a-zA-Z0-9]/g, '-');
          const filename = `Design-${sanitizedCampusName}-${timestamp}-${fileData.originalName || fileData.filename}`;
          const filePath = path.join(uploadsDir, filename);

          // If base64 data is provided, decode and save
          if (fileData.base64Data) {
            const fileBuffer = Buffer.from(fileData.base64Data, 'base64');
            fs.writeFileSync(filePath, fileBuffer);
          } else {
            // If no base64 data, create a placeholder (file upload will be handled separately)
            // For now, we'll just store the metadata
            console.warn('File uploaded without base64 data, storing metadata only');
          }

          // Store file information
          savedFiles.push({
            filename: filename,
            originalName: fileData.originalName || fileData.filename,
            filePath: `/uploads/designs/${filename}`,
            fileSize: fileData.fileSize || 0,
            uploadedAt: new Date()
          });
        } catch (fileError) {
          console.error('Error saving file:', fileError);
          // Continue with other files even if one fails
        }
      }

      if (savedFiles.length === 0) {
        return res.status(400).json({ 
          message: 'Failed to save uploaded files. Please try again.' 
        });
      }

      requestData.uploadedFiles = savedFiles;
    }

    const request = new Request(requestData);
    await request.save();

    await request.populate('client', 'name email');

    // Create notifications after request is saved
    const { createNotification } = require('../services/notificationService');
    const User = require('../models/User');

    // Notify the client (request creator)
    try {
      await createNotification({
        user: req.user._id,
        request: request._id,
        type: 'response',
        title: 'Request Submitted Successfully',
        message: `Your network request for "${request.requirements?.campusName || 'Campus'}" has been submitted and is awaiting review.`
      });
    } catch (notifError) {
      console.error('Failed to create client notification:', notifError);
    }

    // Notify all admins about the new request
    try {
      const admins = await User.find({ role: 'Web Admin' });
      await Promise.all(admins.map(async (admin) => {
        try {
          await createNotification({
            user: admin._id,
            request: request._id,
            type: 'response',
            title: '🆕 New Project Request',
            message: `New ${request.requestType} request received from ${req.user.name} for "${request.requirements?.campusName || 'Campus'}".`
          });
        } catch (notifError) {
          console.error(`Failed to create notification for admin ${admin._id}:`, notifError);
        }
      }));
    } catch (notifError) {
      console.error('Error creating admin notifications:', notifError);
    }

    res.status(201).json({
      message: 'Network request created successfully',
      request
    });
  } catch (error) {
    console.error('Create request error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }
    res.status(500).json({ message: 'Server error creating request', error: error.message });
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

    let requests = await Request.find(query)
      .populate(populateFields, 'name email role')
      .populate('design', 'isApproved reportPdfUrl')
      .sort({ createdAt: -1 });

    // AUTO-FIX: Update existing assigned projects that don't have installationProgress set
    // This fixes projects that were assigned before the installationProgress initialization was added
    const updatePromises = requests
      .filter(request => {
        // Check if installer is assigned but installationProgress is 0 or not set
        const hasInstaller = request.assignedInstaller && (request.assignedInstaller._id || request.assignedInstaller);
        const needsFix = (!request.installationProgress || request.installationProgress === 0) &&
                         request.status !== 'Completed' &&
                         request.status !== 'Installation In Progress';
        
        if (hasInstaller && needsFix) {
          console.log(`🔧 Found project needing fix: ${request._id}, status: ${request.status}, installer: ${hasInstaller}, progress: ${request.installationProgress}`);
        }
        
        return hasInstaller && needsFix;
      })
      .map(async (request) => {
        try {
          const updateData = { installationProgress: 10 };
          
          // Also update status to "Assigned" if it's in a design-complete state or any non-installation state
          if (request.design && request.requestType === 'Both Design and Installation') {
            if (request.status === 'Awaiting Client Review' || request.status === 'Design Complete' || request.status === 'Design Submitted' || request.status === 'Design In Progress') {
              updateData.status = 'Assigned';
              // Update overall progress if needed
              const currentProgress = request.progress || 0;
              if (currentProgress < 60) {
                updateData.progress = Math.min(currentProgress + 10, 100);
              }
            }
          } else if (request.requestType === 'Installation Only') {
            if (request.status === 'New' || !request.status) {
              updateData.status = 'Assigned';
              updateData.progress = 20;
            }
          } else {
            // For any other case, just ensure status is at least "Assigned" if it's "New"
            if (request.status === 'New' || !request.status) {
              updateData.status = 'Assigned';
            }
          }
          
          console.log(`🔄 Updating request ${request._id} with:`, updateData);
          const result = await Request.findByIdAndUpdate(request._id, updateData, { new: true, runValidators: false });
          console.log(`✅ Auto-fixed installation progress for request ${request._id}`, result?.installationProgress);
          
          // Update the request object in memory so the response includes the fix
          Object.assign(request, updateData);
        } catch (error) {
          console.error(`❌ Failed to auto-fix request ${request._id}:`, error);
        }
      });

    // Wait for all updates to complete (but don't block the response)
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      // Re-fetch to ensure we have the latest data
      requests = await Request.find(query)
        .populate(populateFields, 'name email role')
        .populate('design', 'isApproved reportPdfUrl')
        .sort({ createdAt: -1 });
    }

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
    
    // AUTO-FIX: If design exists but status is incorrect (data inconsistency fix)
    if (request.design && request.status !== 'Design In Progress' && 
        request.status !== 'Design Submitted' && 
        request.status !== 'Awaiting Client Review' && 
        request.status !== 'Completed' &&
        request.status !== 'Installation In Progress') {
      console.log('⚠️ Auto-fixing request status: Design exists but status is', request.status);
      try {
        await Request.findByIdAndUpdate(
          request._id,
          { 
            status: 'Design In Progress',
            progress: 40
          },
          { runValidators: false }
        );
        // Re-fetch to get updated status
        const updatedRequest = await Request.findById(req.params.id)
          .populate('client', 'name email')
          .populate('assignedDesigner', 'name email')
          .populate('assignedInstaller', 'name email')
          .populate('design');
        if (updatedRequest) {
          Object.assign(request, updatedRequest.toObject());
          console.log('✅ Auto-fixed request status to: Design In Progress');
        }
      } catch (fixError) {
        console.error('Failed to auto-fix request status:', fixError);
      }
    }

    // AUTO-FIX: Update existing assigned projects that don't have installationProgress set
    const hasInstaller = request.assignedInstaller && (request.assignedInstaller._id || request.assignedInstaller);
    const needsFix = hasInstaller && 
                     (!request.installationProgress || request.installationProgress === 0) &&
                     request.status !== 'Completed' &&
                     request.status !== 'Installation In Progress';
    
    if (needsFix) {
      console.log(`⚠️ Auto-fixing installation progress for request ${request._id}: Installer assigned but progress is 0, status: ${request.status}`);
      try {
        const updateData = { installationProgress: 10 };
        
        // Also update status to "Assigned" if it's in a design-complete state or any non-installation state
        if (request.design && request.requestType === 'Both Design and Installation') {
          if (request.status === 'Awaiting Client Review' || request.status === 'Design Complete' || request.status === 'Design Submitted' || request.status === 'Design In Progress') {
            updateData.status = 'Assigned';
            // Update overall progress if needed
            const currentProgress = request.progress || 0;
            if (currentProgress < 60) {
              updateData.progress = Math.min(currentProgress + 10, 100);
            }
          }
        } else if (request.requestType === 'Installation Only') {
          if (request.status === 'New' || !request.status) {
            updateData.status = 'Assigned';
            updateData.progress = 20;
          }
        } else {
          // For any other case, just ensure status is at least "Assigned" if it's "New"
          if (request.status === 'New' || !request.status) {
            updateData.status = 'Assigned';
          }
        }
        
        console.log(`🔄 Updating request ${request._id} with:`, updateData);
        await Request.findByIdAndUpdate(request._id, updateData, { runValidators: false });
        
        // Re-fetch to get updated data
        const updatedRequest = await Request.findById(req.params.id)
          .populate('client', 'name email')
          .populate('assignedDesigner', 'name email')
          .populate('assignedInstaller', 'name email')
          .populate('design');
        if (updatedRequest) {
          Object.assign(request, updatedRequest.toObject());
          console.log(`✅ Auto-fixed installation progress for request ${request._id}, new progress: ${request.installationProgress}`);
        }
      } catch (fixError) {
        console.error(`❌ Failed to auto-fix installation progress for request ${request._id}:`, fixError);
      }
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
    const request = await Request.findById(req.params.id)
      .populate('design', 'isApproved');

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
      // Update progress based on status and requestType
      // If requestType is "Both Design and Installation", progress is split 50/50
      // If requestType is "Design Only" or "Installation Only", that phase is 100%
      const requestType = request.requestType || 'Both Design and Installation';
      
      switch (status) {
        case 'New':
          updateData.progress = 0;
          break;
        case 'Assigned':
          updateData.progress = requestType === 'Both Design and Installation' ? 10 : 20;
          break;
        case 'Design In Progress':
          updateData.progress = requestType === 'Both Design and Installation' ? 25 : 40;
          break;
        case 'Design Submitted':
          updateData.progress = requestType === 'Both Design and Installation' ? 35 : 50;
          break;
        case 'Awaiting Client Review':
          updateData.progress = requestType === 'Both Design and Installation' ? 40 : 60;
          break;
        case 'Design Complete':
          // If only design is needed, this is 100%. If both are needed, this is 50%
          updateData.progress = requestType === 'Design Only' ? 100 : 
                                requestType === 'Both Design and Installation' ? 50 : 60;
          break;
        case 'Installation In Progress':
          // If only installation is needed, this is 50%. If both are needed, this is 75%
          updateData.progress = requestType === 'Installation Only' ? 50 : 
                                requestType === 'Both Design and Installation' ? 75 : 80;
          break;
        case 'Completed':
          updateData.progress = 100;
          updateData.actualCompletionDate = new Date();
          break;
        default:
          // For other statuses, use default progress calculation
          updateData.progress = request.progress || 0;
          break;
      }
    }
    // Only update assignments if they are provided and different from current
    // Allow unassigning by passing empty string
    if (assignedDesigner !== undefined) {
      if (assignedDesigner === '' || assignedDesigner === null) {
        // Unassign designer
        updateData.assignedDesigner = null;
      } else if (assignedDesigner !== '') {
        // Check if designer is already assigned and trying to assign a different one
        if (request.assignedDesigner && request.assignedDesigner.toString() !== assignedDesigner) {
          return res.status(400).json({ 
            message: 'Designer is already assigned to this request. Please unassign the current designer first.' 
          });
        }
        updateData.assignedDesigner = assignedDesigner;
      }
    }
    
    if (assignedInstaller !== undefined) {
      if (assignedInstaller === '' || assignedInstaller === null) {
        // Unassign installer
        updateData.assignedInstaller = null;
      } else if (assignedInstaller !== '') {
        // Check if installer is already assigned and trying to assign a different one
        if (request.assignedInstaller && request.assignedInstaller.toString() !== assignedInstaller) {
          return res.status(400).json({ 
            message: 'Installer is already assigned to this request. Please unassign the current installer first.' 
          });
        }
        updateData.assignedInstaller = assignedInstaller;
        
        // If assigning installer, update status and progress appropriately
        // Only update status if it's not explicitly being changed
        if (!updateData.status) {
          // Check if design exists (for "Both Design and Installation" requests)
          if (request.design && request.requestType === 'Both Design and Installation') {
            // Design is complete, installer is being assigned - set status to indicate installer assignment
            if (request.status === 'Awaiting Client Review' || request.status === 'Design Complete' || request.status === 'Design Submitted' || request.status === 'Design In Progress') {
              updateData.status = 'Assigned'; // Status indicates installer is now assigned
              // Update progress: add 10% when installer is assigned (design phase is complete)
              const currentProgress = request.progress || 0;
              updateData.progress = Math.min(currentProgress + 10, 100);
              // Set installation progress to 10% to indicate installer assignment
              updateData.installationProgress = 10;
            }
          } else if (request.requestType === 'Installation Only') {
            // For Installation Only, when installer is assigned, set status to Assigned
            if (request.status === 'New' || !request.status) {
              updateData.status = 'Assigned';
              updateData.progress = 20;
              // Set installation progress to 10% to indicate installer assignment
              updateData.installationProgress = 10;
            }
          } else {
            // For any other case where installer is assigned, ensure status is at least "Assigned"
            if (request.status === 'New' || !request.status) {
              updateData.status = 'Assigned';
            }
            // Initialize installation progress if not set
            if (!request.installationProgress || request.installationProgress === 0) {
              updateData.installationProgress = 10;
            }
          }
        } else {
          // Status is being explicitly changed, but still initialize installation progress if needed
          if (!request.installationProgress || request.installationProgress === 0) {
            updateData.installationProgress = 10;
          }
        }
      }
    }

    const updatedRequest = await Request.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate(['client', 'assignedDesigner', 'assignedInstaller'], 'name email role');

    // Create notifications
    if (updatedRequest.client) {
      try {
        await createNotification({
          user: updatedRequest.client._id,
          request: updatedRequest._id,
          type: 'assignment',
          title: 'Project Assignment Update',
          message: `Your project "${updatedRequest.requirements?.campusName || 'Network Request'}" has been updated. Status: ${updatedRequest.status}`
        });
      } catch (notifError) {
        console.error('Failed to create client notification:', notifError);
        // Don't fail the request if notification fails
      }
    }

    // Create notification for assigned installer
    if (assignedInstaller && assignedInstaller !== '' && updatedRequest.assignedInstaller) {
      try {
        await createNotification({
          user: updatedRequest.assignedInstaller._id,
          request: updatedRequest._id,
          type: 'assignment',
          title: 'New Installation Assignment',
          message: `You have been assigned to install the network at "${updatedRequest.requirements?.campusName || 'Campus'}". Please review the design and propose an installation date.`
        });
      } catch (notifError) {
        console.error('Failed to create installer notification:', notifError);
        // Don't fail the request if notification fails
      }
    }

    // Create notification for assigned designer
    if (assignedDesigner && assignedDesigner !== '' && updatedRequest.assignedDesigner) {
      try {
        await createNotification({
          user: updatedRequest.assignedDesigner._id,
          request: updatedRequest._id,
          type: 'assignment',
          title: 'New Design Assignment',
          message: `You have been assigned to design the network for "${updatedRequest.requirements?.campusName || 'Campus'}".`
        });
      } catch (notifError) {
        console.error('Failed to create designer notification:', notifError);
        // Don't fail the request if notification fails
      }
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

    // Calculate progress based on status and requestType
    const requestType = request.requestType || 'Both Design and Installation';
    let progress = request.progress || 0;
    
    switch (status) {
      case 'New':
        progress = 0;
        break;
      case 'Assigned':
        progress = requestType === 'Both Design and Installation' ? 10 : 20;
        break;
      case 'Design In Progress':
        progress = requestType === 'Both Design and Installation' ? 25 : 40;
        break;
      case 'Design Submitted':
        progress = requestType === 'Both Design and Installation' ? 35 : 50;
        break;
      case 'Awaiting Client Review':
        progress = requestType === 'Both Design and Installation' ? 40 : 60;
        break;
      case 'Design Complete':
        progress = requestType === 'Design Only' ? 100 : 
                   requestType === 'Both Design and Installation' ? 50 : 60;
        break;
      case 'Installation In Progress':
        progress = requestType === 'Installation Only' ? 50 : 
                   requestType === 'Both Design and Installation' ? 75 : 80;
        break;
      case 'Completed':
        progress = 100;
        break;
    }

    const updateData = { status, progress };
    if (status === 'Completed') {
      updateData.actualCompletionDate = new Date();
    }

    const updatedRequest = await Request.findByIdAndUpdate(
      req.params.id,
      updateData,
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
      try {
        await createNotification({
          user: updatedRequest.client._id,
          request: updatedRequest._id,
          type: 'response',
          title: 'Admin Response',
          message: `You have received a response from the admin for your project "${updatedRequest.title || 'Network Request'}"`
        });
      } catch (notifError) {
        console.error('Failed to create client notification:', notifError);
        // Don't fail the request if notification fails
      }
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

// @route   PUT /api/requests/:id/schedule-installation
// @desc    Schedule installation date (Installer only)
// @access  Private (Network Installation Team only)
router.put('/:id/schedule-installation', [
  auth,
  authorize('Network Installation Team'),
  body('scheduledInstallationDate').isISO8601().withMessage('Valid date is required'),
  body('installationNotes').optional().isString().withMessage('Installation notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { scheduledInstallationDate, installationNotes } = req.body;
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if installer is assigned to this request
    if (request.assignedInstaller?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You are not assigned to this request.' });
    }

    // Update scheduling information
    request.scheduledInstallationDate = new Date(scheduledInstallationDate);
    if (installationNotes) {
      request.installationNotes = installationNotes;
    }

    await request.save();
    await request.populate(['client', 'assignedDesigner', 'assignedInstaller'], 'name email');

    // Notify admin and client about the proposed installation date
    try {
      const formattedDate = new Date(scheduledInstallationDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Notify client
      if (request.client) {
        await createNotification({
          user: request.client._id,
          request: request._id,
          type: 'assignment',
          title: 'Installation Date Proposed',
          message: `The installation team has proposed ${formattedDate} for installation at "${request.requirements?.campusName || 'your campus'}". Please review and confirm.`
        });
      }

      // Notify all admins
      const webAdmins = await User.find({ role: 'Web Admin' });
      await Promise.all(webAdmins.map(admin => createNotification({
        user: admin._id,
        request: request._id,
        type: 'assignment',
        title: 'Installation Date Proposed',
        message: `Installer has proposed ${formattedDate} for installation at "${request.requirements?.campusName || 'Campus'}".`
      })));
    } catch (notifError) {
      console.error('Failed to create scheduling notifications:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      message: 'Installation date proposed successfully. Admin and client have been notified.',
      request
    });
  } catch (error) {
    console.error('Schedule installation error:', error);
    res.status(500).json({ message: 'Server error scheduling installation' });
  }
});

// @route   PUT /api/requests/:id/installation-progress
// @desc    Update installation progress (Installer only)
// @access  Private (Network Installation Team only)
router.put('/:id/installation-progress', [
  auth,
  authorize('Network Installation Team'),
  body('installationProgress').isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
  body('installationNotes').optional().isString().withMessage('Installation notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { installationProgress, installationNotes } = req.body;
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if installer is assigned to this request
    if (request.assignedInstaller?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You are not assigned to this request.' });
    }

    // Update installation progress
    request.installationProgress = installationProgress;
    if (installationNotes) {
      request.installationNotes = installationNotes;
    }

    // If starting installation, set start date and notify
    const wasJustStarted = request.status !== 'Installation In Progress' && installationProgress > 0;
    if (wasJustStarted) {
      request.status = 'Installation In Progress';
      request.installationStartDate = new Date();
    }

    await request.save();
    await request.populate(['client', 'assignedDesigner', 'assignedInstaller'], 'name email');

    // Send notifications
    try {
      // Notify client when installation starts
      if (wasJustStarted && request.client) {
        try {
          await createNotification({
            user: request.client._id,
            request: request._id,
            type: 'installation_started',
            title: '🚀 Installation Started',
            message: `Installation work has begun for "${request.requirements?.campusName || 'your project'}". Progress: ${installationProgress}%`
          });
          console.log(`✅ Installation started notification sent to client: ${request.client._id}`);
        } catch (clientNotifError) {
          console.error(`❌ Failed to notify client:`, clientNotifError);
        }
      }
      
      // Notify admins when installation starts
      if (wasJustStarted) {
        try {
          const webAdmins = await User.find({ role: 'Web Admin' });
          if (webAdmins && webAdmins.length > 0) {
            await Promise.all(webAdmins.map(async (admin) => {
              try {
                await createNotification({
                  user: admin._id,
                  request: request._id,
                  type: 'installation_started',
                  title: '🚀 Installation Started',
                  message: `Installation work has begun for "${request.requirements?.campusName || 'Campus'}". Progress: ${installationProgress}%`
                });
                console.log(`✅ Installation started notification sent to admin: ${admin._id}`);
              } catch (adminNotifError) {
                console.error(`❌ Failed to notify admin ${admin._id}:`, adminNotifError);
              }
            }));
          } else {
            console.warn('⚠️ No admins found to notify');
          }
        } catch (adminNotifError) {
          console.error('❌ Failed to create admin start notifications:', adminNotifError);
        }
      }
      
      // Notify client on progress updates (if not just started)
      if (!wasJustStarted && request.client && installationProgress > 0) {
        try {
          await createNotification({
            user: request.client._id,
            request: request._id,
            type: 'installation_progress',
            title: '📊 Installation Progress Update',
            message: `Installation progress updated to ${installationProgress}% for "${request.requirements?.campusName || 'your project'}".`
          });
        } catch (clientNotifError) {
          console.error(`❌ Failed to notify client on progress:`, clientNotifError);
        }
      }

      // Notify admins on significant progress updates
      if (installationProgress >= 50 && installationProgress % 25 === 0) {
        try {
          const webAdmins = await User.find({ role: 'Web Admin' });
          if (webAdmins && webAdmins.length > 0) {
            await Promise.all(webAdmins.map(async (admin) => {
              try {
                await createNotification({
                  user: admin._id,
                  request: request._id,
                  type: 'installation_progress',
                  title: '📊 Installation Progress Update',
                  message: `Installation progress: ${installationProgress}% for "${request.requirements?.campusName || 'Campus'}".`
                });
              } catch (adminNotifError) {
                console.error(`❌ Failed to notify admin ${admin._id} on progress:`, adminNotifError);
              }
            }));
          }
        } catch (adminNotifError) {
          console.error('❌ Failed to create admin progress notifications:', adminNotifError);
        }
      }
    } catch (notifError) {
      console.error('Failed to create progress notifications:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      message: 'Installation progress updated successfully',
      request
    });
  } catch (error) {
    console.error('Update installation progress error:', error);
    res.status(500).json({ message: 'Server error updating installation progress' });
  }
});

// @route   PUT /api/requests/:id/complete-installation
// @desc    Complete installation with notes (Installer only)
// @access  Private (Network Installation Team only)
router.put('/:id/complete-installation', [
  auth,
  authorize('Network Installation Team'),
  body('completionNotes').optional().isString().withMessage('Completion notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { completionNotes } = req.body;
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if installer is assigned to this request
    if (request.assignedInstaller?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You are not assigned to this request.' });
    }

    // Check if installation is in progress
    if (request.status !== 'Installation In Progress') {
      return res.status(400).json({ message: 'Installation must be in progress to mark as complete.' });
    }

    // Validate that installation date was proposed
    if (!request.scheduledInstallationDate) {
      return res.status(400).json({ 
        message: 'Cannot complete installation: Installation date must be proposed first. Please propose an installation date before marking as complete.' 
      });
    }

    // Validate that installation has actually started (progress > 0)
    if (!request.installationProgress || request.installationProgress <= 0) {
      return res.status(400).json({ 
        message: 'Cannot complete installation: Installation work must be started first. Please start the installation and update progress before marking as complete.' 
      });
    }

    // Update completion information
    request.status = 'Completed';
    request.actualCompletionDate = new Date();
    request.progress = 100;
    request.installationProgress = 100;
    if (completionNotes) {
      request.completionNotes = completionNotes;
      // Update installation notes to show completion message
      request.installationNotes = completionNotes + (request.installationNotes ? '\n\n' : '') + '✅ Installation completed successfully.';
    } else {
      // Set default completion message if no notes provided
      request.installationNotes = (request.installationNotes ? request.installationNotes + '\n\n' : '') + '✅ Installation completed successfully.';
    }

    await request.save();
    await request.populate(['client', 'assignedDesigner', 'assignedInstaller'], 'name email');

    // Send notifications
    try {
      // Notify client that installation is completed
      if (request.client) {
        await createNotification({
          user: request.client._id,
          request: request._id,
          type: 'installation_completed',
          title: '✅ Installation Completed',
          message: `Installation has been completed for "${request.requirements?.campusName || 'your project'}". Please verify and confirm completion.`
        });
      }

      // Notify all admins
      try {
        const webAdmins = await User.find({ role: 'Web Admin' });
        if (webAdmins && webAdmins.length > 0) {
          await Promise.all(webAdmins.map(async (admin) => {
            try {
              await createNotification({
                user: admin._id,
                request: request._id,
                type: 'installation_completed',
                title: '✅ Installation Completed',
                message: `Installation has been completed for "${request.requirements?.campusName || 'Campus'}". Waiting for client verification.`
              });
              console.log(`✅ Installation completed notification sent to admin: ${admin._id}`);
            } catch (adminNotifError) {
              console.error(`❌ Failed to notify admin ${admin._id}:`, adminNotifError);
            }
          }));
        } else {
          console.warn('⚠️ No admins found to notify');
        }
      } catch (adminNotifError) {
        console.error('❌ Failed to create admin completion notifications:', adminNotifError);
      }
    } catch (notifError) {
      console.error('Failed to create completion notifications:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      message: 'Installation completed successfully. Client has been notified to verify completion.',
      request
    });
  } catch (error) {
    console.error('Complete installation error:', error);
    res.status(500).json({ message: 'Server error completing installation' });
  }
});

// @route   PUT /api/requests/:id/verify-installation
// @desc    Client verifies installation completion (Client only)
// @access  Private (Client only)
router.put('/:id/verify-installation', [
  auth,
  authorize('Client'),
  body('verificationNotes').optional().isString().withMessage('Verification notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { verificationNotes } = req.body;
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if client owns this request
    if (request.client?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. This is not your project.' });
    }

    // Check if installation is completed
    if (request.status !== 'Completed') {
      return res.status(400).json({ 
        message: `Installation must be completed before verification. Current status: ${request.status}` 
      });
    }

    // Check if already verified
    if (request.clientVerified) {
      return res.status(400).json({ message: 'Installation has already been verified.' });
    }

    // Update verification
    request.clientVerified = true;
    request.clientVerificationDate = new Date();
    if (verificationNotes) {
      request.clientVerificationNotes = verificationNotes;
    }

    await request.save();
    await request.populate(['client', 'assignedDesigner', 'assignedInstaller'], 'name email');

    // Send notifications
    try {
      // Notify all admins - handle errors individually so one failure doesn't stop others
      const webAdmins = await User.find({ role: 'Web Admin' });
      if (webAdmins && webAdmins.length > 0) {
        await Promise.all(webAdmins.map(async (admin) => {
          try {
            await createNotification({
              user: admin._id,
              request: request._id,
              type: 'installation_verified',
              title: '✅ Installation Verified by Client',
              message: `Client has verified installation completion for "${request.requirements?.campusName || 'Campus'}". Project is fully complete.`
            });
            console.log(`✅ Notification sent to admin: ${admin._id}`);
          } catch (adminNotifError) {
            console.error(`❌ Failed to notify admin ${admin._id}:`, adminNotifError);
            // Continue with other admins even if one fails
          }
        }));
      } else {
        console.warn('⚠️ No admins found to notify');
      }

      // Notify installer
      if (request.assignedInstaller) {
        try {
          const installerId = request.assignedInstaller._id || request.assignedInstaller;
          await createNotification({
            user: installerId,
            request: request._id,
            type: 'installation_verified',
            title: '✅ Installation Verified',
            message: `Client has verified installation completion for "${request.requirements?.campusName || 'Campus'}".`
          });
          console.log(`✅ Notification sent to installer: ${installerId}`);
        } catch (installerNotifError) {
          console.error(`❌ Failed to notify installer:`, installerNotifError);
          // Don't fail the request if notification fails
        }
      } else {
        console.warn('⚠️ No installer assigned to notify');
      }
    } catch (notifError) {
      console.error('❌ Failed to create verification notifications:', notifError);
      console.error('Error stack:', notifError.stack);
      // Don't fail the request if notification fails
    }

    res.json({
      message: 'Installation verified successfully. Admin has been notified.',
      request
    });
  } catch (error) {
    console.error('Verify installation error:', error);
    res.status(500).json({ message: 'Server error verifying installation' });
  }
});

// @route   POST /api/requests/fix-installation-progress
// @desc    Manually fix installation progress for all assigned projects (Admin only)
// @access  Private (Web Admin only)
router.post('/fix-installation-progress', [
  auth,
  authorize('Web Admin')
], async (req, res) => {
  try {
    // Find all requests with assigned installer but installationProgress is 0 or not set
    const requestsToFix = await Request.find({
      assignedInstaller: { $exists: true, $ne: null },
      $or: [
        { installationProgress: { $exists: false } },
        { installationProgress: 0 }
      ],
      status: { $nin: ['Completed', 'Installation In Progress'] }
    }).populate('design', 'isApproved');

    console.log(`🔧 Found ${requestsToFix.length} requests to fix`);

    const fixedRequests = [];
    for (const request of requestsToFix) {
      try {
        const updateData = { installationProgress: 10 };
        
        // Also update status to "Assigned" if it's in a design-complete state
        if (request.design && request.requestType === 'Both Design and Installation') {
          if (request.status === 'Awaiting Client Review' || request.status === 'Design Complete' || request.status === 'Design Submitted' || request.status === 'Design In Progress') {
            updateData.status = 'Assigned';
            const currentProgress = request.progress || 0;
            if (currentProgress < 60) {
              updateData.progress = Math.min(currentProgress + 10, 100);
            }
          }
        } else if (request.requestType === 'Installation Only') {
          if (request.status === 'New' || !request.status) {
            updateData.status = 'Assigned';
            updateData.progress = 20;
          }
        } else {
          if (request.status === 'New' || !request.status) {
            updateData.status = 'Assigned';
          }
        }
        
        await Request.findByIdAndUpdate(request._id, updateData, { runValidators: false });
        fixedRequests.push({ id: request._id, status: request.status, updateData });
        console.log(`✅ Fixed request ${request._id}`);
      } catch (error) {
        console.error(`❌ Failed to fix request ${request._id}:`, error);
      }
    }

    res.json({
      message: `Fixed ${fixedRequests.length} out of ${requestsToFix.length} requests`,
      fixed: fixedRequests
    });
  } catch (error) {
    console.error('Fix installation progress error:', error);
    res.status(500).json({ message: 'Server error fixing installation progress' });
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
  
     // Determine the correct status and progress based on request type
     const requestType = request.requestType || 'Both Design and Installation';
     
     if (requestType === 'Design Only') {
       // For Design Only requests, mark as fully completed
       request.status = 'Completed';
       request.progress = 100;
       request.actualCompletionDate = new Date();
     } else {
       // For "Both Design and Installation" or "Installation Only" requests, mark design as complete
       // This allows admin to assign installer
       request.status = 'Design Complete';
       request.progress = requestType === 'Both Design and Installation' ? 50 : 60;
     }
     
     await request.save();
     await request.populate(['assignedDesigner', 'assignedInstaller'], 'name email');

      // Notify the Designer that the client accepted the design
      if (request.assignedDesigner) {
        try {
          const designerId = request.assignedDesigner._id || request.assignedDesigner;
          await createNotification({
              user: designerId,
              request: request._id,
              type: 'client_acceptance',
              title: '✅ Design Accepted by Client',
              message: `Your design report for project ${request._id.toString().slice(-4)} has been formally accepted by the client.`
          });
          console.log(`✅ Notification sent to designer: ${designerId}`);
        } catch (designerNotifError) {
          console.error(`❌ Failed to notify designer:`, designerNotifError);
        }
      }
      
      // Notify Admin that client accepted the design
      // For "Both Design and Installation" requests, inform admin that installer can be assigned
      try {
        const webAdmins = await User.find({ role: 'Web Admin' });
        if (webAdmins && webAdmins.length > 0) {
          await Promise.all(webAdmins.map(async (admin) => {
            try {
              let adminMessage;
              let adminTitle;
              
              if (requestType === 'Design Only') {
                adminTitle = '✅ Project Completed by Client';
                adminMessage = `Project ${request._id.toString().slice(-4)} (${request.requirements?.campusName || 'Campus'}) has been marked as completed by the client.`;
              } else {
                adminTitle = '✅ Design Accepted - Installer Assignment Ready';
                adminMessage = `Client has accepted the design for project ${request._id.toString().slice(-4)} (${request.requirements?.campusName || 'Campus'}). You can now assign an installer to begin installation work.`;
              }
              
              await createNotification({
                  user: admin._id,
                  request: request._id,
                  type: requestType === 'Design Only' ? 'project_completed' : 'client_acceptance',
                  title: adminTitle,
                  message: adminMessage
              });
              console.log(`✅ Notification sent to admin: ${admin._id}`);
            } catch (adminNotifError) {
              console.error(`❌ Failed to notify admin ${admin._id}:`, adminNotifError);
            }
          }));
        } else {
          console.warn('⚠️ No admins found to notify');
        }
      } catch (adminNotifError) {
        console.error('❌ Failed to create admin notifications:', adminNotifError);
      }
      
      res.json({
        message: requestType === 'Design Only' 
          ? 'Request successfully marked as Completed by Client'
          : 'Design accepted successfully. Admin will assign installer to begin installation.',
        request
      });
    } catch (error) {
      console.error('Client complete error:', error);
      res.status(500).json({ message: 'Server error marking as complete' });
    }
  });




module.exports = router;
