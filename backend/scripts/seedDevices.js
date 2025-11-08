const mongoose = require('mongoose');
const Device = require('../models/Device');
require('dotenv').config();

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

// Connect to MongoDB and seed devices
const seedDevices = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campus-net-planner', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing devices (optional - comment out if you want to keep existing data)
    // await Device.deleteMany({});
    // console.log('✅ Cleared existing devices');

    // Check if devices already exist
    const existingDevices = await Device.find({});
    if (existingDevices.length > 0) {
      console.log(`⚠️  Found ${existingDevices.length} existing devices. Skipping seed.`);
      console.log('   To re-seed, delete existing devices first or modify this script.');
      process.exit(0);
    }

    // Insert devices
    const insertedDevices = await Device.insertMany(devices);
    console.log(`✅ Successfully seeded ${insertedDevices.length} devices:`);
    
    // Display summary by type
    const devicesByType = {};
    insertedDevices.forEach(device => {
      devicesByType[device.type] = (devicesByType[device.type] || 0) + 1;
    });
    
    console.log('\n📊 Device Summary by Type:');
    Object.entries(devicesByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} device(s)`);
    });

    console.log('\n✅ Device catalog seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding devices:', error);
    process.exit(1);
  }
};

// Run the seed function
seedDevices();

