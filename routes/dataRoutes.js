
const express = require('express');
const router = express.Router();
const { getRecords, createRecord, updateRecord } = require('../controllers/dataController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(getRecords)
  .post(protect, createRecord);

router.route('/:id')
  .patch(protect, updateRecord);

module.exports = router;
