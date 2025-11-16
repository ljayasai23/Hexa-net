const dotenv = require('dotenv');
const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require('cors');

// --- 1. CONFIGURATION ---

// Load environment variables with an explicit path
dotenv.config({ path: './.env' });
console.log('MONGO_URI from env:', process.env.MONGO_URI);

const app = express();

// The specific production URL of your Vercel frontend.
// It is recommended to pull this from an environment variable (e.g., FRONTEND_URL) 
// for maximum security, but we will hardcode it for this specific deployment fix.
const FRONTEND_URL = 'https://hexa-net.vercel.app';
const allowedOrigins = [
  FRONTEND_URL, 
  'http://localhost:3000', // Still allow local development
  'http://localhost:5000', // If the frontend runs on a different local port
  'http://192.168.43.26:3000', // Allow access from Kali machine IP
  'http://192.168.43.4:3000', // Allow access from Windows 11 machine
  // Allow any origin in the 192.168.43.x network for development
  /^http:\/\/192\.168\.43\.\d+:3000$/, // Pattern for local network access
];

// Configure CORS: Allowing only the specific Vercel URL and local hosts
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            return callback(null, true);
        }
        
        // Check if the requesting origin is in our allowed list (exact match)
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        // Check if the origin matches any regex pattern in allowedOrigins
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            if (allowedOrigin instanceof RegExp) {
                return allowedOrigin.test(origin);
            }
            return false;
        });
        
        if (isAllowed) {
            return callback(null, true);
        }
        
        // For development, allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        if (process.env.NODE_ENV !== 'production') {
            const localNetworkPattern = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+):\d+$/;
            if (localNetworkPattern.test(origin)) {
                console.log(`✅ Allowing local network origin: ${origin}`);
                return callback(null, true);
            }
        }
        
        // Block requests from unauthorized domains
        console.log(`❌ CORS policy violation: Access from ${origin} blocked.`);
        callback(new Error(`CORS policy violation: Access from ${origin} blocked.`));
    },
    credentials: true, // Allow cookies/credentials to be sent (needed for auth)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
// Middleware

// Serve static files from uploads directory
// Note: This assumes 'uploads' is parallel to 'backend' in the root repo structure.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
const designsDir = path.join(uploadsDir, 'designs');
const reportsDir = path.join(uploadsDir, 'reports');

[uploadsDir, designsDir, reportsDir].forEach(dir => {
    // We use try/catch to ensure server starts even if directory creation fails 
    // (though in Render, these folders may not persist).
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    } catch (e) {
        console.error(`Error creating directory ${dir}:`, e);
    }
});

// --- 2. ROUTES ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/designs', require('./routes/designs'));
app.use('/api/notifications', require('./routes/notifications'));

// --- 3. DATABASE CONNECTION ---
const MONGODB_URI = process.env.MONGO_URI;

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'Campus Net Planner API is running!' });
});

// --- 4. ERROR HANDLING AND STARTUP ---

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; 

app.listen(PORT, HOST, () => {
    console.log(`Server is running on ${HOST}:${PORT}`);
    console.log(`Access from Frontend: ${FRONTEND_URL}`);
});
