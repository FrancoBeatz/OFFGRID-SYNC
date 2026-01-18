
const mongoose = require('mongoose');

const dataRecordSchema = mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: String, required: true },
  lastModified: { type: Number, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('DataRecord', dataRecordSchema);
