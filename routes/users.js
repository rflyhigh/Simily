// FILE: /routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');

// Get user by username
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get post and comment counts
    const postCount = await Post.countDocuments({ author: user._id, status: 'active' });
    const commentCount = await Comment.countDocuments({ userId: user._id, status: 'approved' });
    
    const userData = {
      ...user.toObject(),
      postCount,
      commentCount
    };
    
    res.json(userData);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's posts
router.get('/:username/posts', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const posts = await Post.find({ 
      author: user._id,
      status: 'active'
    })
    .populate('author', 'username')
    .sort({ createdAt: -1 });
    
    res.json(posts);
  } catch (err) {
    console.error('Error fetching user posts:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's comments
router.get('/:username/comments', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const comments = await Comment.find({ 
      userId: user._id,
      status: 'approved'
    })
    .populate('postId', 'title slug')
    .sort({ createdAt: -1 })
    .limit(50);
    
    res.json(comments);
  } catch (err) {
    console.error('Error fetching user comments:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user's upvoted posts
router.get('/me/upvoted', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const posts = await Post.find({
      _id: { $in: user.upvotedPosts },
      status: 'active'
    })
    .populate('author', 'username')
    .sort({ createdAt: -1 });
    
    res.json(posts);
  } catch (err) {
    console.error('Error fetching upvoted posts:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;