# Device Catalog Documentation

## Overview

The device catalog contains network hardware devices that are used during design generation to create the Bill of Materials (BOM). The system automatically selects appropriate devices based on the network requirements.

## Device Types

The system supports the following device types:

1. **Router** - Core routing devices (1 per campus)
2. **CoreSwitch** - Core layer switches (1 per campus)
3. **DistributionSwitch** - Distribution layer switches (1 per department)
4. **AccessSwitch** - Access layer switches (calculated based on wired host count)
5. **AccessPoint** - Wireless access points (calculated based on wireless host count)

## Device Schema

Each device in the catalog must have the following fields:

```javascript
{
  modelName: String,           // Required: Device model name (e.g., "Cisco ISR 4331")
  type: String,                // Required: One of ['Router', 'CoreSwitch', 'DistributionSwitch', 'AccessSwitch', 'AccessPoint']
  specifications: {
    portCount: Number,         // Required: Number of ports
    poeCapable: Boolean,       // Optional: Power over Ethernet capability (default: false)
    maxThroughput: String,     // Optional: Maximum throughput (default: 'N/A')
    powerConsumption: String,  // Optional: Power consumption (default: 'N/A')
    dimensions: String         // Optional: Physical dimensions (default: 'N/A')
  },
  unitPrice: Number,           // Required: Price per unit (must be >= 0)
  description: String,        // Optional: Device description
  isActive: Boolean           // Optional: Whether device is active (default: true)
}
```

## Seeding Device Catalog

### Using the Seed Script

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Run the seed script:**
   ```bash
   node scripts/seedDevices.js
   ```

   Or using npm:
   ```bash
   npm run seed:devices
   ```

3. **The script will:**
   - Connect to MongoDB using the `MONGO_URI` from your `.env` file
   - Check if devices already exist (to prevent duplicates)
   - Insert sample devices if the catalog is empty
   - Display a summary of seeded devices

### Sample Devices Included

The seed script includes the following sample devices:

#### Routers (2 devices)
- Cisco ISR 4331 - $1,200.00
- Cisco ISR 4351 - $1,800.00

#### Core Switches (2 devices)
- Cisco Catalyst 9300-48P - $8,500.00
- Cisco Catalyst 9500-48Y4C - $15,000.00

#### Distribution Switches (2 devices)
- Cisco Catalyst 2960-X-48TS-L - $3,200.00
- Cisco Catalyst 2960-X-48FPS-L - $4,500.00

#### Access Switches (4 devices)
- Cisco Catalyst 2960-X-24TS-L - $1,800.00
- Cisco Catalyst 2960-X-48TS-L - $3,200.00
- Cisco Catalyst 2960-X-24FPS-L - $2,800.00
- Cisco Catalyst 2960-X-48FPS-L - $4,500.00

#### Access Points (3 devices)
- Cisco Aironet 2802I - $650.00
- Cisco Aironet 3802I - $950.00
- Cisco Aironet 1852I - $450.00

**Total: 13 devices**

## How BOM Generation Works

When a design is generated, the system:

1. **Calculates hardware requirements** based on:
   - Total wired hosts → determines number of Access Switches needed
   - Total wireless hosts → determines number of Access Points needed
   - Number of departments → determines number of Distribution Switches needed

2. **Selects devices** from the catalog:
   - For each device type, selects the first available active device
   - Uses device specifications (e.g., portCount) for calculations
   - Uses unitPrice for cost calculations

3. **Generates BOM** with:
   - Device name and model
   - Quantity required
   - Unit price
   - Total cost per device type
   - Overall project cost

## Managing Devices

### Adding Devices via Admin Interface

1. Log in as **Web Admin**
2. Navigate to **Device Catalog** in the admin dashboard
3. Click **Add Device**
4. Fill in all required fields:
   - Model Name
   - Device Type
   - Port Count
   - Unit Price
   - (Optional) PoE Capable, Throughput, Power Consumption, Dimensions, Description
5. Click **Save**

### Adding Devices via API

```bash
POST /api/admin/devices
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "modelName": "Cisco Catalyst 2960-X-24TS-L",
  "type": "AccessSwitch",
  "specifications": {
    "portCount": 24,
    "poeCapable": false,
    "maxThroughput": "44 Gbps",
    "powerConsumption": "30W",
    "dimensions": "1.75\" x 17.3\" x 10.2\""
  },
  "unitPrice": 1800.00,
  "description": "Cisco Catalyst 2960-X Series 24-port access switch"
}
```

### Updating Devices

Devices can be updated via the admin interface or API. Only active devices (`isActive: true`) are used during design generation.

### Deactivating Devices

To remove a device from design generation without deleting it:
1. Edit the device in the admin interface
2. Set `isActive` to `false`
3. Save

## Important Notes

1. **At least one device of each type must exist** for BOM generation to work properly
2. **Device prices should be kept up-to-date** for accurate cost estimates
3. **Port counts are critical** for calculating the number of switches needed
4. **PoE capability** is important for devices that need to power access points or phones
5. **The system selects the first available device** of each type, so order matters if you have multiple devices of the same type

## Troubleshooting

### BOM Generation Fails

- **Check device catalog**: Ensure at least one active device exists for each required type
- **Check device prices**: All devices must have valid unitPrice > 0
- **Check device specifications**: Port count must be specified for switches

### Incorrect Device Selection

- **Device order**: The system selects the first available device of each type
- **Active status**: Only devices with `isActive: true` are considered
- **Device type**: Ensure device type matches exactly (case-sensitive)

### Cost Calculations Wrong

- **Verify unit prices**: Check that all devices have correct unitPrice values
- **Check quantities**: Verify that quantity calculations are correct based on host counts

## Example: Adding Custom Devices

If you want to add devices from other manufacturers or custom configurations:

```javascript
{
  modelName: "HP ProCurve 2920-48G",
  type: "AccessSwitch",
  specifications: {
    portCount: 48,
    poeCapable: true,
    maxThroughput: "88 Gbps",
    powerConsumption: "740W",
    dimensions: "1.75\" x 17.3\" x 15.2\""
  },
  unitPrice: 2800.00,
  description: "HP ProCurve 2920 Series 48-port PoE+ switch"
}
```

Make sure to:
- Use correct device type enum values
- Provide accurate port counts
- Set realistic prices
- Include all required specifications

