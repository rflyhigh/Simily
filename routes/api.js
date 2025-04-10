const express = require('express');
const router = express.Router();
const Software = require('../models/Software');
const Comment = require('../models/Comment');
const Notice = require('../models/Notice');
const auth = require('../middleware/auth');

// Get all software (paginated)
router.get('/software', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    const software = await Software.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Software.countDocuments();
    
    res.json({
      software,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recent software
router.get('/software/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const software = await Software.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    
    res.json(software);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get most downloaded software
router.get('/software/popular', async (req, res) => {
  try {
    const period = req.query.period || 'all';
    const limit = parseInt(req.query.limit) || 8;
    
    let dateFilter = {};
    const now = new Date();
    
    if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { createdAt: { $gte: weekAgo } };
    } else if (period === 'month') {
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      dateFilter = { createdAt: { $gte: monthAgo } };
    } else if (period === 'year') {
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      dateFilter = { createdAt: { $gte: yearAgo } };
    }
    
    const software = await Software.find(dateFilter)
      .sort({ downloads: -1 })
      .limit(limit);
    
    res.json(software);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single software
router.get('/software/:id', async (req, res) => {
  try {
    const software = await Software.findById(req.params.id);
    
    if (!software) {
      return res.status(404).json({ error: 'Software not found' });
    }
    
    // Increment view count
    software.views += 1;
    await software.save();
    
    res.json(software);
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Software not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Search software
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    const tag = req.query.tag;
    
    let searchQuery = {};
    
    if (query) {
      searchQuery = { $text: { $search: query } };
    } else if (tag) {
      searchQuery = { tags: tag };
    } else {
      return res.status(400).json({ error: 'Search query or tag required' });
    }
    
    const software = await Software.find(searchQuery)
      .sort({ createdAt: -1 });
    
    res.json(software);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Record download
router.post('/software/:id/download', async (req, res) => {
  try {
    const software = await Software.findById(req.params.id);
    
    if (!software) {
      return res.status(404).json({ error: 'Software not found' });
    }
    
    // Increment download count
    software.downloads += 1;
    await software.save();
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get comments for software
router.get('/software/:id/comments', async (req, res) => {
    try {
      const comments = await Comment.find({ 
        softwareId: req.params.id,
        parentId: null // Get only top-level comments
      }).sort({ createdAt: -1 });
      
      // Get all replies in a single query
      const replies = await Comment.find({
        softwareId: req.params.id,
        parentId: { $ne: null }
      }).sort({ createdAt: 1 });
      
      // Create a map of parent comment ID to replies
      const repliesMap = {};
      replies.forEach(reply => {
        if (!repliesMap[reply.parentId]) {
          repliesMap[reply.parentId] = [];
        }
        repliesMap[reply.parentId].push(reply);
      });
      
      // Add replies to their parent comments
      const commentsWithReplies = comments.map(comment => {
        const commentObj = comment.toObject();
        commentObj.replies = repliesMap[comment._id] || [];
        return commentObj;
      });
      
      res.json(commentsWithReplies);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });
  
  // Add comment
  router.post('/software/:id/comments', async (req, res) => {
    try {
      const { username, content, parentId } = req.body;
      
      if (!username || !content) {
        return res.status(400).json({ error: 'Username and content are required' });
      }
      
      // Check if software exists
      const software = await Software.findById(req.params.id);
      if (!software) {
        return res.status(404).json({ error: 'Software not found' });
      }
      
      // If it's a reply, check if parent comment exists
      if (parentId) {
        const parentComment = await Comment.findById(parentId);
        if (!parentComment) {
          return res.status(404).json({ error: 'Parent comment not found' });
        }
      }
      
      const newComment = new Comment({
        softwareId: req.params.id,
        username,
        content,
        parentId: parentId || null
      });
      
      await newComment.save();
      res.status(201).json(newComment);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

// Get active notices
router.get('/notices', async (req, res) => {
  try {
    const notices = await Notice.find({ active: true })
      .sort({ createdAt: -1 });
    
    res.json(notices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;