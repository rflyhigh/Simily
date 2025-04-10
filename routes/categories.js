// FILE: /routes/categories.js
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

// Get all categories with post counts
router.get('/', async (req, res) => {
  try {
    const categories = await Post.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { name: '$_id', count: 1, _id: 0 } }
    ]);
    
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;