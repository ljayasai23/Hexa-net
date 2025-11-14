const express = require('express');
const { body, validationResult } = require('express-validator');
const Device = require('../models/Device');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/admin/devices
// @desc    Get all devices
// @access  Private (Web Admin only)
router.get('/devices', [auth, authorize('Web Admin')], async (req, res) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;
    
    let query = { isActive: true };
    if (type) {
      query.type = type;
    }

    const devices = await Device.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Device.countDocuments(query);

    res.json({
      devices,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ message: 'Server error fetching devices' });
  }
});

// @route   GET /api/admin/devices/:id
// @desc    Get a specific device
// @access  Private (Web Admin only)
router.get('/devices/:id', [auth, authorize('Web Admin')], async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    res.json({ device });
  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({ message: 'Server error fetching device' });
  }
});

// @route   POST /api/admin/devices
// @desc    Create a new device
// @access  Private (Web Admin only)
router.post('/devices', [
  auth,
  authorize('Web Admin'),
  body('modelName').notEmpty().withMessage('Model name is required'),
  body('type').isIn(['Router', 'CoreSwitch', 'DistributionSwitch', 'AccessSwitch', 'AccessPoint'])
    .withMessage('Invalid device type'),
  body('specifications.portCount').isNumeric().withMessage('Port count must be a number'),
  body('unitPrice').isNumeric().withMessage('Unit price must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const device = new Device(req.body);
    await device.save();

    res.status(201).json({
      message: 'Device created successfully',
      device
    });
  } catch (error) {
    console.error('Create device error:', error);
    res.status(500).json({ message: 'Server error creating device' });
  }
});

// @route   PUT /api/admin/devices/:id
// @desc    Update a device
// @access  Private (Web Admin only)
router.put('/devices/:id', [
  auth,
  authorize('Web Admin'),
  body('modelName').optional().notEmpty().withMessage('Model name cannot be empty'),
  body('type').optional().isIn(['Router', 'CoreSwitch', 'DistributionSwitch', 'AccessSwitch', 'AccessPoint'])
    .withMessage('Invalid device type'),
  body('unitPrice').optional().isNumeric().withMessage('Unit price must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const device = await Device.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    res.json({
      message: 'Device updated successfully',
      device
    });
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ message: 'Server error updating device' });
  }
});

// @route   DELETE /api/admin/devices/:id
// @desc    Delete a device (soft delete)
// @access  Private (Web Admin only)
router.delete('/devices/:id', [auth, authorize('Web Admin')], async (req, res) => {
  try {
    const device = await Device.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    res.json({
      message: 'Device deleted successfully',
      device
    });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ message: 'Server error deleting device' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Web Admin only)
router.get('/users', [auth, authorize('Web Admin')], async (req, res) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;
    
    let query = { isActive: true };
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// @route   POST /api/admin/devices/seed
// @desc    Seed device catalog with sample data
// @access  Private (Web Admin only)
router.post('/devices/seed', [auth, authorize('Web Admin')], async (req, res) => {
  try {
    // Sample device catalog data
    const devices = [
      // Routers
      {
        modelName: 'Cisco ISR 4331',
        type: 'Router',
        specifications: {
          portCount: 3,
          poeCapable: false,
          maxThroughput: '100 Mbps',
          powerConsumption: '60W',
          dimensions: '1.75" x 17.5" x 13.5"'
        },
        unitPrice: 1200.00,
        description: 'Cisco Integrated Services Router with 3 Gigabit Ethernet ports, suitable for small to medium campuses'
      },
      {
        modelName: 'Cisco ISR 4351',
        type: 'Router',
        specifications: {
          portCount: 4,
          poeCapable: false,
          maxThroughput: '200 Mbps',
          powerConsumption: '80W',
          dimensions: '1.75" x 17.5" x 13.5"'
        },
        unitPrice: 1800.00,
        description: 'Cisco Integrated Services Router with 4 Gigabit Ethernet ports, suitable for medium to large campuses'
      },
      // Core Switches
      {
        modelName: 'Cisco Catalyst 9300-48P',
        type: 'CoreSwitch',
        specifications: {
          portCount: 48,
          poeCapable: true,
          maxThroughput: '176 Gbps',
          powerConsumption: '740W',
          dimensions: '1.75" x 17.3" x 21.5"'
        },
        unitPrice: 8500.00,
        description: 'Cisco Catalyst 9300 Series 48-port PoE+ switch with 10G uplinks, ideal for core network infrastructure'
      },
      {
        modelName: 'Cisco Catalyst 9500-48Y4C',
        type: 'CoreSwitch',
        specifications: {
          portCount: 48,
          poeCapable: false,
          maxThroughput: '1.28 Tbps',
          powerConsumption: '150W',
          dimensions: '1.75" x 17.3" x 21.5"'
        },
        unitPrice: 15000.00,
        description: 'Cisco Catalyst 9500 Series high-performance core switch with 48 ports and 4x100G uplinks'
      },
      // Distribution Switches
      {
        modelName: 'Cisco Catalyst 2960-X-48TS-L',
        type: 'DistributionSwitch',
        specifications: {
          portCount: 48,
          poeCapable: false,
          maxThroughput: '88 Gbps',
          powerConsumption: '60W',
          dimensions: '1.75" x 17.3" x 15.2"'
        },
        unitPrice: 3200.00,
        description: 'Cisco Catalyst 2960-X Series 48-port distribution switch with Gigabit Ethernet'
      },
      {
        modelName: 'Cisco Catalyst 2960-X-48FPS-L',
        type: 'DistributionSwitch',
        specifications: {
          portCount: 48,
          poeCapable: true,
          maxThroughput: '88 Gbps',
          powerConsumption: '740W',
          dimensions: '1.75" x 17.3" x 15.2"'
        },
        unitPrice: 4500.00,
        description: 'Cisco Catalyst 2960-X Series 48-port PoE+ distribution switch for powering access points and phones'
      },
      // Access Switches
      {
        modelName: 'Cisco Catalyst 2960-X-24TS-L',
        type: 'AccessSwitch',
        specifications: {
          portCount: 24,
          poeCapable: false,
          maxThroughput: '44 Gbps',
          powerConsumption: '30W',
          dimensions: '1.75" x 17.3" x 10.2"'
        },
        unitPrice: 1800.00,
        description: 'Cisco Catalyst 2960-X Series 24-port access switch for connecting end devices'
      },
      {
        modelName: 'Cisco Catalyst 2960-X-48TS-L',
        type: 'AccessSwitch',
        specifications: {
          portCount: 48,
          poeCapable: false,
          maxThroughput: '88 Gbps',
          powerConsumption: '60W',
          dimensions: '1.75" x 17.3" x 15.2"'
        },
        unitPrice: 3200.00,
        description: 'Cisco Catalyst 2960-X Series 48-port access switch for high-density access layer'
      },
      {
        modelName: 'Cisco Catalyst 2960-X-24FPS-L',
        type: 'AccessSwitch',
        specifications: {
          portCount: 24,
          poeCapable: true,
          maxThroughput: '44 Gbps',
          powerConsumption: '370W',
          dimensions: '1.75" x 17.3" x 10.2"'
        },
        unitPrice: 2800.00,
        description: 'Cisco Catalyst 2960-X Series 24-port PoE+ access switch for powering devices'
      },
      {
        modelName: 'Cisco Catalyst 2960-X-48FPS-L',
        type: 'AccessSwitch',
        specifications: {
          portCount: 48,
          poeCapable: true,
          maxThroughput: '88 Gbps',
          powerConsumption: '740W',
          dimensions: '1.75" x 17.3" x 15.2"'
        },
        unitPrice: 4500.00,
        description: 'Cisco Catalyst 2960-X Series 48-port PoE+ access switch for high-density PoE deployments'
      },
      // Access Points
      {
        modelName: 'Cisco Aironet 2802I',
        type: 'AccessPoint',
        specifications: {
          portCount: 0,
          poeCapable: false,
          maxThroughput: '1.3 Gbps',
          powerConsumption: '12.95W (PoE)',
          dimensions: '7.87" x 7.87" x 1.34"'
        },
        unitPrice: 650.00,
        description: 'Cisco Aironet 2802I indoor access point with 802.11ac Wave 2, supports up to 30 concurrent users'
      },
      {
        modelName: 'Cisco Aironet 3802I',
        type: 'AccessPoint',
        specifications: {
          portCount: 0,
          poeCapable: false,
          maxThroughput: '2.6 Gbps',
          powerConsumption: '15.4W (PoE+)',
          dimensions: '7.87" x 7.87" x 1.34"'
        },
        unitPrice: 950.00,
        description: 'Cisco Aironet 3802I high-performance indoor access point with 802.11ac Wave 2, supports up to 50 concurrent users'
      },
      {
        modelName: 'Cisco Aironet 1852I',
        type: 'AccessPoint',
        specifications: {
          portCount: 0,
          poeCapable: false,
          maxThroughput: '867 Mbps',
          powerConsumption: '12.95W (PoE)',
          dimensions: '7.87" x 7.87" x 1.34"'
        },
        unitPrice: 450.00,
        description: 'Cisco Aironet 1852I entry-level indoor access point with 802.11ac, suitable for small deployments'
      }
    ];

    // Check if devices already exist
    const existingDevices = await Device.find({});
    if (existingDevices.length > 0) {
      return res.status(400).json({ 
        message: `Device catalog already contains ${existingDevices.length} device(s). Please delete existing devices first or add devices manually.`,
        existingCount: existingDevices.length
      });
    }

    // Insert devices
    const insertedDevices = await Device.insertMany(devices);
    
    // Count devices by type
    const devicesByType = {};
    insertedDevices.forEach(device => {
      devicesByType[device.type] = (devicesByType[device.type] || 0) + 1;
    });

    res.status(201).json({
      message: `Successfully seeded ${insertedDevices.length} devices`,
      count: insertedDevices.length,
      devicesByType
    });
  } catch (error) {
    console.error('Seed devices error:', error);
    res.status(500).json({ message: 'Server error seeding devices', error: error.message });
  }
});

// @route   GET /api/admin/stats
// @desc    Get admin dashboard statistics
// @access  Private (Web Admin only)
router.get('/stats', [auth, authorize('Web Admin')], async (req, res) => {
  try {
    const Request = require('../models/Request');
    const LogicDesign = require('../models/LogicDesign');

    const [
      totalRequests,
      newRequests,
      inProgressRequests,
      completedRequests,
      totalUsers,
      totalDevices,
      totalDesigns
    ] = await Promise.all([
      Request.countDocuments(),
      Request.countDocuments({ status: 'New' }),
      Request.countDocuments({ 
        status: { $in: ['Assigned', 'Design In Progress', 'Installation In Progress'] } 
      }),
      Request.countDocuments({ status: 'Completed' }),
      User.countDocuments({ isActive: true }),
      Device.countDocuments({ isActive: true }),
      LogicDesign.countDocuments()
    ]);

    res.json({
      requests: {
        total: totalRequests,
        new: newRequests,
        inProgress: inProgressRequests,
        completed: completedRequests
      },
      users: {
        total: totalUsers
      },
      devices: {
        total: totalDevices
      },
      designs: {
        total: totalDesigns
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error fetching statistics' });
  }
});

module.exports = router;
