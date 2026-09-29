const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middlewares/common/errorHandler');

// Load environment variables
dotenv.config();

// Connect to MongoDB Database
connectDB();

const app = express();

// Middlewares
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files (Category images, etc.)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Ravi Electricals API Server is healthy and running',
    timestamp: new Date(),
  });
});

// Mount API Routes (under /api/v1 and /api - includes /admin and /role modules)
app.use('/api/v1', routes);
app.use('/api', routes);

// Handle 404 Not Found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route Not Found - ${req.originalUrl}`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, async () => {
    console.log(`==================================================`);
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`Admin API URL: http://localhost:${PORT}/api/v1/admin`);
    console.log(`Role API URL:  http://localhost:${PORT}/api/v1/role`);
    console.log(`==================================================`);
  });
}

module.exports = app;
