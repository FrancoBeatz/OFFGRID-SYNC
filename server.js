
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const dataRoutes = require('./routes/dataRoutes');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

// Database Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/offgrid_sync';
mongoose.connect(MONGO_URI)
  .then(() => console.log('OS-BACKEND: Registry Connected'))
  .catch(err => console.error('OS-BACKEND: Connection Failed', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`OS-BACKEND: Channel Open on ${PORT}`));
