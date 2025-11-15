const dotenv = require('dotenv');
const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require('cors');

// Load environment variables with an explicit path
dotenv.config({ path: './.env' });
console.log('MONGO_URI from env:', process.env.MONGO_URI);

const app = express();

// Configure CORS to allow requests from any origin (for development)
// In production, you should specify allowed origins
app.use(cors({
  origin: true, // Allow all origins
  credentials: true, // Allow cookies/credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
// Middleware

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
const designsDir = path.join(uploadsDir, 'designs');
const reportsDir = path.join(uploadsDir, 'reports');
[uploadsDir, designsDir, reportsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});
// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/designs', require('./routes/designs'));
app.use('/api/notifications', require('./routes/notifications'));

// MongoDB connection
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces to accept connections from other machines

app.listen(PORT, HOST, () => {
  console.log(`Server is running on ${HOST}:${PORT}`);
  console.log(`Access from other machines: http://<your-ip>:${PORT}`);
});