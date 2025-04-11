// FILE: /routes/reports.js
const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const auth = require('../middleware/auth');
const { reportLimiter } = require('../middleware/rateLimiter');

// Create a report
router.post('/', auth, reportLimiter, async (req, res) => {
  try {
    const { targetId, type, reason } = req.body;
    
    if (!targetId || !type || !reason) {
      return res.status(400).json({ error: 'Target ID, type, and reason are required' });
    }
    
    if (!['post', 'comment', 'user'].includes(type)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }
    
    // Check if user has already reported this item
    const existingReport = await Report.findOne({
      targetId,
      type,
      reporter: req.user.id,
      status: 'pending'
    });
    
    if (existingReport) {
      return res.status(400).json({ error: 'You have already reported this item' });
    }
    
    const newReport = new Report({
      targetId,
      type,
      reason,
      reporter: req.user.id
    });
    
    await newReport.save();
    
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;