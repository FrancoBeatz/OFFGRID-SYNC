
const DataRecord = require('../models/DataRecord');

// @desc    Get all data records
// @route   GET /api/data
const getRecords = async (req, res) => {
  const records = await DataRecord.find({});
  res.json(records);
};

// @desc    Add new record to remote
// @route   POST /api/data
const createRecord = async (req, res) => {
  const { id, title, category, content, timestamp } = req.body;
  const record = await DataRecord.create({
    id, title, category, content, timestamp, lastModified: Date.now()
  });
  res.status(201).json(record);
};

// @desc    Update existing record
// @route   PATCH /api/data/:id
const updateRecord = async (req, res) => {
  const record = await DataRecord.findOne({ id: req.params.id });
  if (record) {
    record.content = req.body.content || record.content;
    record.lastModified = Date.now();
    const updatedRecord = await record.save();
    res.json(updatedRecord);
  } else {
    res.status(404).json({ message: 'Record not found' });
  }
};

module.exports = { getRecords, createRecord, updateRecord };
