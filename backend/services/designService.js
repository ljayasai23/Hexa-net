const { Netmask } = require('netmask'); // FIX 1: Switched to the stable Netmask library
const Device = require('../models/Device');
// --- IP Conversion Helpers (Define at the top)
// Generate logical design based on request requirements
const generateDesign = async (request) => {
  try {
    const { requirements } = request;
    
    // Step 1: Aggregate hosts by department
    const departmentHosts = aggregateHostsByDepartment(requirements.departments);
    
    // Step 2: Calculate required hardware
    const billOfMaterials = await calculateHardwareRequirements(departmentHosts);
    
    // Step 3: Generate IP plan with VLANs and subnets
    const ipPlan = generateIPPlan(departmentHosts);
    
    // Step 4: Generate topology diagram
    const topologyDiagram = generateTopologyDiagram(departmentHosts, billOfMaterials, ipPlan);    
    if (!topologyDiagram || topologyDiagram.length < 50) {
      console.error("CRITICAL: Topology diagram string is missing or too short!");
  }
    // Step 5: Calculate total cost
    const totalEstimatedCost = billOfMaterials.reduce((total, item) => total + item.totalCost, 0);
    
    return {
      billOfMaterials,
      ipPlan,
      topologyDiagram,
      totalEstimatedCost
    };
  } catch (error) {
    console.error('Design generation error (Final Check):', error);
    throw new Error('Failed to generate design');
  }
};

// Aggregate hosts by department
const aggregateHostsByDepartment = (departments) => {
  const departmentHosts = {};
  
  departments.forEach(dept => {
    let totalWiredHosts = 0;
    let totalWirelessHosts = 0;
    
    dept.rooms.forEach(room => {
      totalWiredHosts += room.wiredHosts || 0;
      totalWirelessHosts += room.wirelessHosts || 0;
    });
    
    departmentHosts[dept.name] = {
      wiredHosts: totalWiredHosts,
      wirelessHosts: totalWirelessHosts,
      totalHosts: totalWiredHosts + totalWirelessHosts
    };
  });
  
  return departmentHosts;
};

// Calculate hardware requirements
const calculateHardwareRequirements = async (departmentHosts) => {
  const billOfMaterials = [];
  
  // Get available devices
  const devices = await Device.find({ isActive: true });
  
  if (!devices || devices.length === 0) {
    throw new Error('Device catalog is empty! Please add devices to the catalog before generating designs. Go to Admin Dashboard > Device Catalog and click "Seed Sample Devices" to populate the catalog.');
  }
  
  const deviceMap = {};
  devices.forEach(device => {
    deviceMap[device.type] = deviceMap[device.type] || [];
    deviceMap[device.type].push(device);
  });
  
  // Calculate total hosts across all departments
  const totalWiredHosts = Object.values(departmentHosts).reduce((sum, dept) => sum + dept.wiredHosts, 0);
  const totalWirelessHosts = Object.values(departmentHosts).reduce((sum, dept) => sum + dept.wirelessHosts, 0);
  
  // Required device types
  const requiredDeviceTypes = ['Router', 'CoreSwitch', 'DistributionSwitch', 'AccessSwitch', 'AccessPoint'];
  const missingDeviceTypes = requiredDeviceTypes.filter(type => !deviceMap[type] || deviceMap[type].length === 0);
  
  if (missingDeviceTypes.length > 0) {
    throw new Error(`Missing required device types in catalog: ${missingDeviceTypes.join(', ')}. Please add at least one device of each type to the Device Catalog.`);
  }
  
  const getDeviceData = (type) => {
    const device = deviceMap[type] && deviceMap[type].length > 0 ? deviceMap[type][0] : null;
    if (!device || !device._id || typeof device.unitPrice !== 'number' || device.unitPrice <= 0) {
        throw new Error(`${type} device found but has invalid data (missing ID or invalid price). Please check the device catalog.`);
    }
    return device;
  };
  
  // Core Router (1 per campus)
  const coreRouter = getDeviceData('Router');
  if (coreRouter) {
    billOfMaterials.push({
      device: coreRouter._id,
      quantity: 1,
      unitPrice: coreRouter.unitPrice,
      totalCost: coreRouter.unitPrice
    });
  }
  
  // Core Switch (1 per campus)
  const coreSwitch = getDeviceData('CoreSwitch');
  if (coreSwitch) {
    billOfMaterials.push({
      device: coreSwitch._id,
      quantity: 1,
      unitPrice: coreSwitch.unitPrice,
      totalCost: coreSwitch.unitPrice
    });
  }
  
  // Distribution Switches (1 per department)
  const distSwitch = getDeviceData('DistributionSwitch');
  if (distSwitch) {
    const numDepartments = Object.keys(departmentHosts).length;
    billOfMaterials.push({
      device: distSwitch._id,
      quantity: numDepartments,
      unitPrice: distSwitch.unitPrice,
      totalCost: distSwitch.unitPrice * numDepartments
    });
  }
  
  // Access Switches (based on wired host count)
  const accessSwitch = getDeviceData('AccessSwitch');
  if (accessSwitch) {
    const portsPerSwitch = accessSwitch.specifications.portCount || 48; // Use 48 as safe fallback
    const numAccessSwitches = Math.ceil(totalWiredHosts / portsPerSwitch);
    
    if (numAccessSwitches > 0) {
      billOfMaterials.push({
        device: accessSwitch._id,
        quantity: numAccessSwitches,
        unitPrice: accessSwitch.unitPrice,
        totalCost: accessSwitch.unitPrice * numAccessSwitches
      });
    }
  }
  
  // Access Points (based on wireless host count)
  const accessPoint = getDeviceData('AccessPoint');
  if (accessPoint) {
    const hostsPerAP = 30; // Assume 30 hosts per AP
    const numAccessPoints = Math.ceil(totalWirelessHosts / hostsPerAP);
    
    if (numAccessPoints > 0) {
      billOfMaterials.push({
        device: accessPoint._id,
        quantity: numAccessPoints,
        unitPrice: accessPoint.unitPrice,
        totalCost: accessPoint.unitPrice * numAccessPoints
      });
    }
  }
  
  return billOfMaterials;
};

// Generate IP plan with VLANs and subnets
// Generate IP plan with VLANs and subnets
// Generate IP plan with VLANs and subnets
const generateIPPlan = (departmentHosts) => {
  const ipPlan = [];
  let vlanId = 10; // Start dynamic VLAN IDs from 10
  
  // Initialize the starting IP components for non-contiguous allocation
  let octet2 = 10; 
  let octet3 = 1; 

  // --- 1. Add Management VLAN (Fixed) ---
  const mgmtCidr = '10.1.1.0/24';
  
  // *** Use Netmask to calculate subnet details ***
  const mgmtMask = new Netmask(mgmtCidr);

  ipPlan.push({
    vlanId: 1,
    departmentName: 'Management',
    subnet: mgmtCidr,
    subnetMask: mgmtMask.mask, // Provided by Netmask
    networkAddress: mgmtMask.base, // Provided by Netmask
    broadcastAddress: mgmtMask.broadcast, // Provided by Netmask
    usableHosts: mgmtMask.size - 2, // Netmask size is total addresses; subtract 2 for usable
    hostCount: 2
  });
  
  // --- 2. Add VLAN for each department ---
  Object.entries(departmentHosts).forEach(([deptName, hosts]) => {
    try {
        const requiredHosts = hosts.totalHosts + 10; // Add buffer
        
        let prefixSize;
        // Logic to determine the smallest necessary prefix size
        if (requiredHosts <= 2) prefixSize = 30;
        else if (requiredHosts <= 6) prefixSize = 29;
        else if (requiredHosts <= 14) prefixSize = 28;
        else if (requiredHosts <= 30) prefixSize = 27;
        else if (requiredHosts <= 62) prefixSize = 26;
        else if (requiredHosts <= 126) prefixSize = 25;
        else if (requiredHosts <= 254) prefixSize = 24;
        else if (requiredHosts <= 510) prefixSize = 23;
        else if (requiredHosts <= 1022) prefixSize = 22;
        else if (requiredHosts <= 2046) prefixSize = 21;
        else prefixSize = 20;

        // SAFE ADDRESS GENERATION (Manual increment ensures uniqueness)
        const networkCidr = `10.${octet2}.${octet3}.0/${prefixSize}`;
        
        // *** Use Netmask for dynamic department subnets ***
        const deptMask = new Netmask(networkCidr);
        
        // NOTE: The Netmask constructor throws if the input is bad, which we let the try/catch handle.

        ipPlan.push({
            vlanId,
            departmentName: deptName,
            subnet: networkCidr,
            subnetMask: deptMask.mask, // Provided by Netmask
            networkAddress: deptMask.base, // Provided by Netmask
            broadcastAddress: deptMask.broadcast, // Provided by Netmask
            usableHosts: deptMask.size - 2, // Netmask size is total addresses; subtract 2
            hostCount: hosts.totalHosts
        });
        
        // Increment to the next IP block (The Safest Non-Contiguous Way)
        octet3++; 
        if (octet3 > 254) { octet3 = 1; octet2++; }
        if (octet2 > 254) { console.error('IP address space exhausted.'); }

    } catch (err) {
        // If Netmask failed, log the specific error
        console.error(`ERROR: Subnet calculation failed for ${deptName}:`, err.message);
        throw new Error(`Failed to generate design: ${err.message}`);
    }
    vlanId++;
  });
  
  return ipPlan;
};

// Generate Mermaid topology diagram
const getHostRange = (ipPlan, deptName) => {
  const ipEntry = ipPlan.find(ip => ip.departmentName === deptName);

  if (!ipEntry || ipEntry.usableHosts < 1) {
      console.warn(`[DEBUG-HOST]: Skipping ${deptName}. Hosts < 1 or entry missing.`);
      return '';
  }

  try {
    const netmask = new Netmask(ipEntry.subnet);

    // --- FIX: Use correct Netmask properties to calculate host IPs ---
    const baseOctets = netmask.base.split('.');
    const broadcastOctets = netmask.broadcast.split('.');
    
    // First usable host: Increment the last octet of the network address (base)
    const firstHost = `${baseOctets.slice(0, 3).join('.')}.${parseInt(baseOctets[3]) + 1}`;
    
    // Last usable host: Decrement the last octet of the broadcast address
    const lastHost = `${broadcastOctets.slice(0, 3).join('.')}.${parseInt(broadcastOctets[3]) - 1}`;
    // ------------------------------------------------------------------

    if (netmask.size <= 2 || firstHost === lastHost) {
         console.warn(`[DEBUG-HOST]: Invalid range calculated for ${deptName}. Size: ${netmask.size}.`);
         return '';
    }

    console.log(`[DEBUG-HOST]: SUCCESS - ${deptName}: ${firstHost} - ${lastHost}`);
    return `\nHost Range: ${firstHost} - ${lastHost}`; 

} catch (e) {
    console.error(`[CRITICAL DEBUG]: HOST RANGE FAILED FOR ${deptName} on Subnet ${ipEntry.subnet}`, e.message);
    return `\nIP Range: CALCULATION ERROR`; 
}
};

const generateTopologyDiagram = (departmentHosts, billOfMaterials, ipPlan) => {
  const departments = Object.keys(departmentHosts); // Define departments here!
  let diagram = `graph TB
    %% Core Layer
    Router["Core Router<br/>10.1.1.1"]
    CoreSwitch["Core Switch<br/>10.1.1.2"]
    
    %% Distribution Layer
    Router --> CoreSwitch
`;

  // Add distribution switches for each department
  departments.forEach((dept, index) => {
    const distSwitchId = `Dist${index + 1}`;
    let hostRange = '';

    try {
        // CALL THE EXTERNAL HELPER, passing ipPlan and deptName
        hostRange = getHostRange(ipPlan, dept); 
    } catch (e) {
        console.error(`ERROR: Failed to calculate host range for ${dept}:`, e.message);
        hostRange = `<br/>IP Range: CALCULATION FAILED`;
    }

    const distSwitchName = `Distribution Switch ${index + 1}<br/>${dept}${hostRange}`;    
    diagram += `    ${distSwitchId}["${distSwitchName}"]
    CoreSwitch --> ${distSwitchId}
`;
  });

  // Add access switches and access points
  let accessSwitchCount = 0;
  let accessPointCount = 0;
  
  departments.forEach((dept, deptIndex) => {
    const hosts = departmentHosts[dept];
    const distSwitchId = `Dist${deptIndex + 1}`;
    
    // Add access switches for wired hosts
    if (hosts.wiredHosts > 0) {
      const accessSwitchId = `Access${accessSwitchCount + 1}`;
      const accessSwitchName = `Access Switch ${accessSwitchCount + 1}<br/>${dept} Wired`;
      
      diagram += `    ${accessSwitchId}["${accessSwitchName}"]
    ${distSwitchId} --> ${accessSwitchId}
`;
      accessSwitchCount++;
    }
    
    // Add access points for wireless hosts
    if (hosts.wirelessHosts > 0) {
      const accessPointId = `AP${accessPointCount + 1}`;
      const accessPointName = `Access Point ${accessPointCount + 1}<br/>${dept} Wireless`;
      
      diagram += `    ${accessPointId}["${accessPointName}"]
    ${distSwitchId} --> ${accessPointId}
`;
      accessPointCount++;
    }
  });

  return diagram;
};

module.exports = {
  generateDesign,
 
};


