const express = require('express');
const { body, validationResult } = require('express-validator');
const Request = require('../models/Request');
const LogicDesign = require('../models/LogicDesign');
const Device = require('../models/Device');
const { auth, authorize } = require('../middleware/auth');
const { generateDesign } = require('../services/designService');

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

    // Update the request with the design reference
    request.design = logicDesign._id;
    request.status = 'Design In Progress';
    await request.save();

    // Populate the design data for response
    await logicDesign.populate('billOfMaterials.device');

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

// @route   PUT /api/designs/:id/approve
// @desc    Approve a design
// @access  Private (Network Designer only)
router.put('/:id/approve', [
  auth,
  authorize('Network Designer'),
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

    // Check if designer is assigned to this request
    if (design.request.assignedDesigner?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You are not assigned to this request.' });
    }

    // Update design
    design.isApproved = true;
    design.approvedBy = req.user._id;
    design.approvedAt = new Date();
    if (designNotes) {
      design.designNotes = designNotes;
    }

    await design.save();

    // Update request status
    design.request.status = 'Design Complete';
    await design.request.save();

    res.json({
      message: 'Design approved successfully',
      design
    });
  } catch (error) {
    console.error('Approve design error:', error);
    res.status(500).json({ message: 'Server error approving design' });
  }
});

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
