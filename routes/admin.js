const express = require('express');
const router = express.Router();
const path = require('path');
const Software = require('../models/Software');
const Comment = require('../models/Comment');
const Notice = require('../models/Notice');
const auth = require('../middleware/auth');

// Serve admin page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'admin.html'));
});

// Admin API routes
// Add software
router.post('/api/software', auth, async (req, res) => {
  try {
    console.log('Request body:', req.body); // Add logging to debug
    
    const { title, description, tags, imageUrl, downloadGroups } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }
    
    // Validate download groups
    if (!downloadGroups || !Array.isArray(downloadGroups) || downloadGroups.length === 0) {
      return res.status(400).json({ error: 'At least one download group is required' });
    }
    
    // Check if each group has a name and at least one link
    for (const group of downloadGroups) {
      if (!group.name || !group.name.trim()) {
        return res.status(400).json({ error: 'Each download group must have a name' });
      }
      
      if (!group.links || !Array.isArray(group.links) || group.links.length === 0) {
        return res.status(400).json({ error: `Download group "${group.name}" must have at least one link` });
      }
      
      for (const link of group.links) {
        if (!link.label || !link.label.trim()) {
          return res.status(400).json({ error: `Each link in group "${group.name}" must have a label` });
        }
        
        if (!link.url || !link.url.trim()) {
          return res.status(400).json({ error: `Each link in group "${group.name}" must have a URL` });
        }
      }
    }
    
    const newSoftware = new Software({
      title,
      description,
      tags: tags || [],
      imageUrl,
      downloadGroups
    });
    
    await newSoftware.save();
    res.status(201).json(newSoftware);
  } catch (err) {
    console.error('Error saving software:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Update software
router.put('/api/software/:id', auth, async (req, res) => {
  try {
    console.log('Update request body:', req.body); // Add logging to debug
    
    const { title, description, tags, imageUrl, downloadGroups } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }
    
    // Validate download groups
    if (!downloadGroups || !Array.isArray(downloadGroups) || downloadGroups.length === 0) {
      return res.status(400).json({ error: 'At least one download group is required' });
    }
    
    // Check if each group has a name and at least one link
    for (const group of downloadGroups) {
      if (!group.name || !group.name.trim()) {
        return res.status(400).json({ error: 'Each download group must have a name' });
      }
      
      if (!group.links || !Array.isArray(group.links) || group.links.length === 0) {
        return res.status(400).json({ error: `Download group "${group.name}" must have at least one link` });
      }
      
      for (const link of group.links) {
        if (!link.label || !link.label.trim()) {
          return res.status(400).json({ error: `Each link in group "${group.name}" must have a label` });
        }
        
        if (!link.url || !link.url.trim()) {
          return res.status(400).json({ error: `Each link in group "${group.name}" must have a URL` });
        }
      }
    }
    
    const software = await Software.findById(req.params.id);
    
    if (!software) {
      return res.status(404).json({ error: 'Software not found' });
    }
    
    software.title = title;
    software.description = description;
    software.tags = tags || [];
    software.imageUrl = imageUrl;
    software.downloadGroups = downloadGroups;
    
    await software.save();
    res.json(software);
  } catch (err) {
    console.error('Error updating software:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Software not found' });
    }
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Delete software
router.delete('/api/software/:id', auth, async (req, res) => {
  try {
    const software = await Software.findById(req.params.id);
    
    if (!software) {
      return res.status(404).json({ error: 'Software not found' });
    }
    
    await software.remove();
    
    // Delete associated comments
    await Comment.deleteMany({ softwareId: req.params.id });
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Software not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Add notice
router.post('/api/notices', auth, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const newNotice = new Notice({
      content
    });
    
    await newNotice.save();
    res.status(201).json(newNotice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update notice
router.put('/api/notices/:id', auth, async (req, res) => {
  try {
    const { content, active } = req.body;
    
    if (content === undefined && active === undefined) {
      return res.status(400).json({ error: 'Content or active status is required' });
    }
    
    const notice = await Notice.findById(req.params.id);
    
    if (!notice) {
      return res.status(404).json({ error: 'Notice not found' });
    }
    
    if (content !== undefined) notice.content = content;
    if (active !== undefined) notice.active = active;
    
    await notice.save();
    res.json(notice);
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Notice not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete notice
router.delete('/api/notices/:id', auth, async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    
    if (!notice) {
      return res.status(404).json({ error: 'Notice not found' });
    }
    
    await notice.remove();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Notice not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete comment
router.delete('/api/comments/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    await comment.remove();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Comment not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all software (for admin)
router.get('/api/software', auth, async (req, res) => {
  try {
    const software = await Software.find().sort({ createdAt: -1 });
    res.json(software);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all notices (for admin)
router.get('/api/notices', auth, async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all comments (for admin)
router.get('/api/comments', auth, async (req, res) => {
  try {
    const comments = await Comment.find()
      .sort({ createdAt: -1 })
      .populate('softwareId', 'title');
    
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;