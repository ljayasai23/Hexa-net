// backend/services/pdfService.js

const PDFDocument = require('pdfkit'); 
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// --- Define the explicit path to the local binary ---
// CRITICAL: This path goes up one level from 'backend' and looks inside 'node_modules/.bin'
const MMDC_PATH = path.join(__dirname, '..', 'node_modules', '.bin', 'mmdc');
// ----------------------------------------------------
const TEMP_DIR = path.join(__dirname, '..', 'temp'); // path.join(__dirname, '..', 'temp');


// ----------------------------------------------------------------------
// --- NEW HELPER FUNCTION: CONVERT MERMAID TO PNG (Modified) ---
// ----------------------------------------------------------------------
const generateTopologyImage = (mermaidCode, tempImageFile) => {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }
        
        const tempMermaidFile = path.join(TEMP_DIR, 'topology_source.mmd');
        fs.writeFileSync(tempMermaidFile, mermaidCode);
        
        // --- FINAL FIX: Use the explicit path to the executable ---
        const command = `${MMDC_PATH} -i "${tempMermaidFile}" -o "${tempImageFile}" -t neutral --width 800`;
        // ----------------------------------------------------------

        // We run the exec command without relying on npx or explicit cwd settings
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Mermaid CLI Error: ${stderr}`);
                return reject(new Error(`Failed to render topology image: ${error.message}. Stderr: ${stderr}`));
            }
            // Clean up the temporary Mermaid source file
            fs.unlinkSync(tempMermaidFile);
            resolve(true);
        });
    });
};

// ----------------------------------------------------------------------
// --- MAIN PDF GENERATION FUNCTION (MODIFIED) ---
// ----------------------------------------------------------------------

const generatePdfReport = async (designData, request, designer) => {
  const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'reports');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileName = `DesignReport-${request.requirements.campusName.replace(/\s/g, '-')}-${request._id}.pdf`;
  const filePath = path.join(uploadDir, fileName);
  
  const tempImageFile = path.join(TEMP_DIR, `${request._id}_topology.png`);

  try {
      // CRITICAL STEP: RENDER THE TOPOLOGY TO AN IMAGE BEFORE PDF GENERATION
      await generateTopologyImage(designData.topologyDiagram, tempImageFile);

      return new Promise((resolve, reject) => {
          const doc = new PDFDocument();
          doc.pipe(fs.createWriteStream(filePath));

          // --- PDF CONTENT GENERATION ---
          doc.fontSize(25).text('Network Design Report', { align: 'center' });
          // ... (Existing text fields: Request ID, Campus, Designer, Cost) ...
          doc.fontSize(15).text(`Request ID: ${request._id}`);
          doc.fontSize(15).text(`Campus: ${request.requirements.campusName}`);
          doc.fontSize(12).text(`Designed by: ${designer.name}`);
          doc.text(`Estimated Cost: $${designData.totalEstimatedCost.toFixed(2)}`);
          
          
          // ------------------------------------
          // 1. BILL OF MATERIALS (Simplified for brevity)
          // ------------------------------------
          doc.moveDown();
          doc.fontSize(14).text('1. Bill of Materials (BOM):', { underline: true });
          designData.billOfMaterials.forEach(item => {
            // Handle both populated device object and device ID
            let deviceName = 'Unknown Device';
            if (item.device) {
              if (typeof item.device === 'object') {
                // Device is populated - use modelName (Device model uses modelName, not name)
                deviceName = item.device.modelName || item.device.type || 'Unknown Device';
              } else if (typeof item.device === 'string') {
                // Device is just an ID, use modelName or category if available
                deviceName = item.deviceModelName || item.deviceCategory || 'Unknown Device';
              }
            }
            doc.text(`- ${deviceName} | Qty: ${item.quantity} @ $${item.unitPrice.toFixed(2)}`);
          });

          // ------------------------------------
          // 2. IP PLAN SUMMARY (Simplified for brevity)
          // ------------------------------------
          doc.moveDown();
          doc.fontSize(14).text('2. IP Plan Summary:', { underline: true });
          designData.ipPlan.forEach(ip => {
            doc.text(`- VLAN ${ip.vlanId} (${ip.departmentName}): ${ip.subnet}`);
          });

          // ------------------------------------
          // 3. GRAPHICAL TOPOLOGY (IMAGE EMBEDDING)
          // ------------------------------------
          doc.moveDown();
          doc.fontSize(14).text('3. Network Topology Diagram:', { underline: true });
          doc.moveDown(0.5);

          // EMBED THE GENERATED PNG IMAGE
          if (fs.existsSync(tempImageFile)) {
              doc.image(tempImageFile, {
                  fit: [500, 300], // Adjust size to fit PDF page width
                  align: 'center',
                  valign: 'top'
              });
          } else {
              doc.text('ERROR: Topology image could not be embedded.');
          }
          // ------------------------------------

          doc.moveDown();
          doc.fontSize(10).text(`Report Generated at: ${new Date().toLocaleString()}`, { align: 'right' });
          
          doc.end();
          
          // Clean up temporary image file after PDF is finalized
          doc.on('end', () => {
              fs.unlink(tempImageFile, (err) => {
                  if (err) console.error("Error cleaning up temp image:", err);
              });
              const publicPath = `/uploads/reports/${fileName}`; 
              resolve(publicPath);
          });
      });
      
  } catch (error) {
      console.error('PDF generation error (Topology):', error);
      // Ensure any failed temporary file is deleted
      if (fs.existsSync(tempImageFile)) fs.unlinkSync(tempImageFile);
      throw new Error(`Failed to generate design report: ${error.message}`);
  }
};

module.exports = {
  generatePdfReport
};