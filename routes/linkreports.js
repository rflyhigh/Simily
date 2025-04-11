// FILE: /routes/linkreports.js
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const LinkReport = require('../models/LinkReport');
const auth = require('../middleware/auth');
const { reportLimiter } = require('../middleware/rateLimiter');

// Report a link
router.post('/', auth, reportLimiter, async (req, res) => {
  try {
    const { postId, groupIndex, linkIndex, reason } = req.body;
    
    if (!postId || groupIndex === undefined || linkIndex === undefined || !reason) {
      return res.status(400).json({ error: 'Post ID, group index, link index and reason are required' });
    }
    
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Validate group and link indices
    if (groupIndex < 0 || groupIndex >= post.downloadGroups.length ||
        linkIndex < 0 || linkIndex >= post.downloadGroups[groupIndex].links.length) {
      return res.status(400).json({ error: 'Invalid group or link index' });
    }
    
    // Check if user has already reported this link
    const existingReport = await LinkReport.findOne({
      postId,
      groupIndex,
      linkIndex,
      reporter: req.user.id,
      status: 'pending'
    });
    
    if (existingReport) {
      return res.status(400).json({ error: 'You have already reported this link' });
    }
    
    // Create report
    const report = new LinkReport({
      postId,
      groupIndex,
      linkIndex,
      reporter: req.user.id,
      reason
    });
    
    await report.save();
    
    // Notify post author
    const postAuthor = await User.findById(post.author);
    if (postAuthor && postAuthor._id.toString() !== req.user.id) {
      const linkLabel = post.downloadGroups[groupIndex].links[linkIndex].label;
      const groupName = post.downloadGroups[groupIndex].name;
      
      postAuthor.notifications.push({
        type: 'report',
        targetId: post._id,
        targetType: 'link',
        message: `Link "${linkLabel}" in group "${groupName}" of your post "${post.title}" has been reported`,
        postSlug: post.slug
      });
      await postAuthor.save();
    }
    
    res.status(201).json(report);
  } catch (err) {
    console.error('Error reporting link:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get link reports for a post
router.get('/post/:postId', auth, async (req, res) => {
  try {
    const postId = req.params.postId;
    
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Check if user is author or mod
    const user = await User.findById(req.user.id);
    if (post.author.toString() !== req.user.id && !user.isMod) {
      return res.status(403).json({ error: 'Only the post author or moderators can view link reports' });
    }
    
    const reports = await LinkReport.find({ postId })
      .populate('reporter', 'username')
      .sort({ createdAt: -1 });
    
    res.json(reports);
  } catch (err) {
    console.error('Error fetching link reports:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update link after report
router.put('/:id/update-link', auth, async (req, res) => {
  try {
    const { newUrl } = req.body;
    
    if (!newUrl) {
      return res.status(400).json({ error: 'New URL is required' });
    }
    
    const report = await LinkReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Get post
    const post = await Post.findById(report.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Check if user is post author
    if (post.author.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Only the post author can update links' });
    }
    
    // Validate group and link indices
    if (report.groupIndex < 0 || report.groupIndex >= post.downloadGroups.length ||
        report.linkIndex < 0 || report.linkIndex >= post.downloadGroups[report.groupIndex].links.length) {
      return res.status(400).json({ error: 'Invalid group or link index' });
    }
    
    // Update the link URL
    post.downloadGroups[report.groupIndex].links[report.linkIndex].url = newUrl;
    await post.save();
    
    // Update report status
    report.status = 'resolved';
    await report.save();
    
    // Notify reporter
    const reporter = await User.findById(report.reporter);
    if (reporter && reporter._id.toString() !== req.user.id) {
      const linkLabel = post.downloadGroups[report.groupIndex].links[report.linkIndex].label;
      
      reporter.notifications.push({
        type: 'report',
        targetId: post._id,
        targetType: 'link',
        message: `The link "${linkLabel}" you reported in "${post.title}" has been updated`
      });
      await reporter.save();
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating link from report:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Dismiss link report
router.put('/:id/dismiss', auth, async (req, res) => {
  try {
    const report = await LinkReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Get post
    const post = await Post.findById(report.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Check if user is post author or mod
    const user = await User.findById(req.user.id);
    if (post.author.toString() !== req.user.id && !user.isMod) {
      return res.status(403).json({ error: 'Only the post author or moderators can dismiss reports' });
    }
    
    // Update report status
    report.status = 'dismissed';
    await report.save();
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error dismissing link report:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;