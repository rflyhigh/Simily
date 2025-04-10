// FILE: /routes/notices.js
const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');

// Get active notices
router.get('/', async (req, res) => {
  try {
    const notices = await Notice.find({ active: true })
      .sort({ createdAt: -1 });
    
    res.json(notices);
  } catch (err) {
    console.error('Error fetching notices:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;