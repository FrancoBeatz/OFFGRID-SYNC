
const DataRecord = require('../models/DataRecord');

// @desc    Get all data records for the logged-in user
// @route   GET /api/data
const getRecords = async (req, res) => {
  try {
    const records = await DataRecord.find({ owner: req.user._id });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user data' });
  }
};

// @desc    Add new record to remote linked to user
// @route   POST /api/data
const createRecord = async (req, res) => {
  const { id, title, category, content, timestamp } = req.body;
  try {
    const record = await DataRecord.create({
      owner: req.user._id,
      id, title, category, content, timestamp, lastModified: Date.now()
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ message: 'Error creating data record' });
  }
};

// @desc    Update existing record if owned by user
// @route   PATCH /api/data/:id
const updateRecord = async (req, res) => {
  try {
    const record = await DataRecord.findOne({ id: req.params.id, owner: req.user._id });
    if (record) {
      record.content = req.body.content || record.content;
      record.lastModified = Date.now();
      const updatedRecord = await record.save();
      res.json(updatedRecord);
    } else {
      res.status(404).json({ message: 'Record not found or access denied' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Error updating data record' });
  }
};

module.exports = { getRecords, createRecord, updateRecord };
