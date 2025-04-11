// FILE: /routes/admin.js
const express = require('express');
const router = express.Router();
const path = require('path');
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Notice = require('../models/Notice');
const Report = require('../models/Report');
const adminAuth = require('../middleware/adminAuth');

// Serve admin login page
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'admin-login.html'));
});

// Serve admin panel
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'admin.html'));
});

// Verify admin token
router.post('/api/auth/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error verifying admin token:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all posts (for admin)
router.get('/api/posts', adminAuth, async (req, res) => {
  try {
    const status = req.query.status;
    const category = req.query.category;
    const search = req.query.search;
    
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const posts = await Post.find(query)
      .populate('author', 'username')
      .sort({ createdAt: -1 });
    
    res.json(posts);
  } catch (err) {
    console.error('Error fetching posts for admin:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update post status
router.put('/api/posts/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['active', 'held', 'deleted'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }
    
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    post.status = status;
    await post.save();
    
    res.json(post);
  } catch (err) {
    console.error('Error updating post status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete post (admin)
router.delete('/api/posts/:id', adminAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Delete post
    await post.remove();
    
    // Delete associated comments
    await Comment.deleteMany({ postId: req.params.id });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (for admin)
router.get('/api/users', adminAuth, async (req, res) => {
  try {
    const status = req.query.status;
    const search = req.query.search;
    
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.username = { $regex: search, $options: 'i' };
    }
    
    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    
    // Get post and comment counts for each user
    const usersWithCounts = await Promise.all(users.map(async (user) => {
      const postCount = await Post.countDocuments({ author: user._id });
      const commentCount = await Comment.countDocuments({ userId: user._id });
      
      return {
        ...user.toObject(),
        postCount,
        commentCount
      };
    }));
    
    res.json(usersWithCounts);
  } catch (err) {
    console.error('Error fetching users for admin:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Block user
router.put('/api/users/:id/block', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.status = 'blocked';
    await user.save();
    
    // Update all comments from this user to be blocked
    await Comment.updateMany(
      { userId: user._id },
      { $set: { status: 'blocked' } }
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error blocking user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unblock user
router.put('/api/users/:id/unblock', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.status = 'active';
    await user.save();
    
    // Update all comments from this user to be approved
    await Comment.updateMany(
      { userId: user._id, status: 'blocked' },
      { $set: { status: 'approved' } }
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error unblocking user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all notices (for admin)
router.get('/api/notices', adminAuth, async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) {
    console.error('Error fetching notices for admin:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create notice
router.post('/api/notices', adminAuth, async (req, res) => {
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
    console.error('Error creating notice:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update notice
router.put('/api/notices/:id', adminAuth, async (req, res) => {
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
    console.error('Error updating notice:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete notice
router.delete('/api/notices/:id', adminAuth, async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    
    if (!notice) {
      return res.status(404).json({ error: 'Notice not found' });
    }
    
    await notice.remove();
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting notice:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all comments (for admin)
router.get('/api/comments', adminAuth, async (req, res) => {
  try {
    const status = req.query.status;
    const postId = req.query.postId;
    const search = req.query.search;
    
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (postId) {
      query.postId = postId;
    }
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    const comments = await Comment.find(query)
      .populate('postId', 'title')
      .sort({ createdAt: -1 });
    
    res.json(comments);
  } catch (err) {
    console.error('Error fetching comments for admin:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update comment status
router.put('/api/comments/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['approved', 'held', 'blocked'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }
    
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    comment.status = status;
    await comment.save();
    
    res.json(comment);
  } catch (err) {
    console.error('Error updating comment status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete comment (admin)
router.delete('/api/comments/:id', adminAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    await comment.remove();
    
    // Also delete any replies to this comment
    if (!comment.parentId) {
      await Comment.deleteMany({ parentId: req.params.id });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk delete comments
router.post('/api/comments/bulk-delete', adminAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Comment IDs are required' });
    }
    
    // Delete the comments
    await Comment.deleteMany({ _id: { $in: ids } });
    
    // Also delete any replies to these comments
    await Comment.deleteMany({ parentId: { $in: ids } });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error bulk deleting comments:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk update comment status
router.post('/api/comments/bulk-status', adminAuth, async (req, res) => {
  try {
    const { ids, status } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Comment IDs are required' });
    }
    
    if (!status || !['approved', 'held', 'blocked'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }
    
    await Comment.updateMany(
      { _id: { $in: ids } },
      { $set: { status } }
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error bulk updating comment status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all reports (for admin)
router.get('/api/reports', adminAuth, async (req, res) => {
  try {
    const status = req.query.status;
    const type = req.query.type;
    
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (type && type !== 'all') {
      query.type = type;
    }
    
    const reports = await Report.find(query)
      .populate('reporter', 'username')
      .sort({ createdAt: -1 });
    
    // Add target information
    const reportsWithTargets = await Promise.all(reports.map(async (report) => {
      const reportObj = report.toObject();
      
      if (report.type === 'post') {
        const post = await Post.findById(report.targetId);
        if (post) {
          reportObj.targetTitle = post.title;
        } else {
          reportObj.targetTitle = 'Deleted Post';
        }
      } else if (report.type === 'comment') {
        const comment = await Comment.findById(report.targetId);
        if (comment) {
          reportObj.targetTitle = `Comment by ${comment.username}`;
        } else {
          reportObj.targetTitle = 'Deleted Comment';
        }
      } else if (report.type === 'user') {
        const user = await User.findById(report.targetId);
        if (user) {
          reportObj.targetTitle = user.username;
        } else {
          reportObj.targetTitle = 'Deleted User';
        }
      }
      
      return reportObj;
    }));
    
    res.json(reportsWithTargets);
  } catch (err) {
    console.error('Error fetching reports for admin:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update report status
router.put('/api/reports/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['pending', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }
    
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    report.status = status;
    await report.save();
    
    res.json(report);
  } catch (err) {
    console.error('Error updating report status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/api/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Error fetching user by ID:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/api/posts/:id', adminAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username');
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json(post);
  } catch (err) {
    console.error('Error fetching post by ID:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/api/comments/:id', adminAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
      .populate('postId', 'title slug');
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    res.json(comment);
  } catch (err) {
    console.error('Error fetching comment by ID:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Comment not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;