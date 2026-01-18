
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const dataRoutes = require('./routes/dataRoutes');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB & Start Server
// Use your MongoDB URI in .env as MONGO_URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/offgrid_sync';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected: Vault Secured');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('Connection Failed:', err));
