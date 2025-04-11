// FILE: /routes/mod.js
const express = require('express');
const router = express.Router();
const path = require('path');
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Notice = require('../models/Notice');
const Report = require('../models/Report');
const LinkReport = require('../models/LinkReport');
const PostSuggestion = require('../models/PostSuggestion');
const auth = require('../middleware/auth');
const modAuth = require('../middleware/modAuth');
const checkModPermission = require('../middleware/checkModPermission');

// Serve mod login page
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'mod-login.html'));
});

// Serve mod panel
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'mod.html'));
});

// Check if user is a mod
router.get('/check', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // If the user matches the FIRST_MOD_ID environment variable, make them a mod if they aren't already
    if (user.username === process.env.FIRST_MOD_ID && !user.isMod) {
      user.isMod = true;
      user.modPermissions = {
        deleteUsers: true,
        deletePosts: true,
        deleteComments: true,
        viewReports: true,
        resolveReports: true,
        editPosts: true,
        promoteMods: true
      };
      await user.save();
      console.log(`Promoted ${user.username} to mod as they match FIRST_MOD_ID`);
    }
    
    res.json({ 
      isMod: user.isMod,
      permissions: user.isMod ? user.modPermissions : null
    });
  } catch (err) {
    console.error('Mod check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all posts (for mod)
router.get('/api/posts', modAuth, async (req, res) => {
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
      .populate('author', 'username isMod')
      .sort({ createdAt: -1 });
    
    res.json(posts);
  } catch (err) {
    console.error('Error fetching posts for mod:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
router.get('/api/posts/:id', modAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username isMod');
    
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
// Update post status
router.put('/api/posts/:id/status', modAuth, checkModPermission('deletePosts'), async (req, res) => {
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

// Delete post (mod)
router.delete('/api/posts/:id', modAuth, checkModPermission('deletePosts'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Delete post
    await post.remove();
    
    // Delete associated comments
    await Comment.deleteMany({ postId: req.params.id });
    
    // Delete associated suggestions
    await PostSuggestion.deleteMany({ postId: req.params.id });
    
    // Delete associated reports
    await Report.deleteMany({ targetId: req.params.id, type: 'post' });
    
    // Delete associated link reports
    await LinkReport.deleteMany({ postId: req.params.id });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit post (mod)
router.put('/api/posts/:id', modAuth, checkModPermission('editPosts'), async (req, res) => {
  try {
    const { title, description, category, tags, imageUrl, downloadGroups } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }
    
    // Validate download groups
    if (!downloadGroups || !Array.isArray(downloadGroups) || downloadGroups.length === 0) {
      return res.status(400).json({ error: 'At least one download group is required' });
    }
    
    // Find post
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Update post
    post.title = title;
    post.description = description;
    post.category = category;
    post.tags = tags || [];
    post.imageUrl = imageUrl;
    post.downloadGroups = downloadGroups;
    
    await post.save();
    
    // Populate author information
    await post.populate('author', 'username');
    
    // Add notification to post author
    const postAuthor = await User.findById(post.author);
    if (postAuthor && postAuthor._id.toString() !== req.user.id) {
      const modUser = await User.findById(req.user.id);
      postAuthor.notifications.push({
        type: 'suggestion',
        targetId: post._id,
        targetType: 'post',
        message: `Moderator ${modUser.username} has edited your post "${post.title}"`
      });
      await postAuthor.save();
    }
    
    res.json(post);
  } catch (err) {
    console.error('Error updating post by mod:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (for mod)
router.get('/api/users', modAuth, checkModPermission('deleteUsers'), async (req, res) => {
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
    console.error('Error fetching users for mod:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Block user
router.put('/api/users/:id/block', modAuth, checkModPermission('deleteUsers'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Don't allow blocking other mods
    if (user.isMod) {
      return res.status(403).json({ error: 'Cannot block a moderator' });
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
router.put('/api/users/:id/unblock', modAuth, checkModPermission('deleteUsers'), async (req, res) => {
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

// Promote user to mod
router.put('/api/users/:id/promote', modAuth, checkModPermission('promoteMods'), async (req, res) => {
  try {
    const { permissions } = req.body;
    
    if (!permissions) {
      return res.status(400).json({ error: 'Permissions are required' });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Set mod status and permissions
    user.isMod = true;
    user.modPermissions = {
      deleteUsers: !!permissions.deleteUsers,
      deletePosts: !!permissions.deletePosts,
      deleteComments: !!permissions.deleteComments,
      viewReports: !!permissions.viewReports,
      resolveReports: !!permissions.resolveReports,
      editPosts: !!permissions.editPosts,
      promoteMods: !!permissions.promoteMods
    };
    
    // Add notification with correct targetType
    user.notifications.push({
      type: 'promotion',
      targetId: user._id,
      targetType: 'user', // Make sure this matches an allowed enum value
      message: 'You have been promoted to moderator!'
    });
    
    await user.save();
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error promoting user to mod:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove mod status
router.put('/api/users/:id/demote', modAuth, checkModPermission('promoteMods'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if trying to demote self
    if (user._id.toString() === req.user.id) {
      return res.status(403).json({ error: 'You cannot demote yourself' });
    }
    
    // Reset mod status and permissions
    user.isMod = false;
    user.modPermissions = {
      deleteUsers: false,
      deletePosts: false,
      deleteComments: false,
      viewReports: false,
      resolveReports: false,
      editPosts: false,
      promoteMods: false
    };
    
    // Add notification
    user.notifications.push({
      type: 'promotion',
      targetId: user._id,
      targetType: 'user',
      message: 'Your moderator status has been removed.'
    });
    
    await user.save();
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error demoting mod:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all notices (for mod)
router.get('/api/notices', modAuth, async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) {
    console.error('Error fetching notices for mod:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create notice
router.post('/api/notices', modAuth, async (req, res) => {
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
router.put('/api/notices/:id', modAuth, async (req, res) => {
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
router.delete('/api/notices/:id', modAuth, async (req, res) => {
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

// Get all comments (for mod)
router.get('/api/comments', modAuth, checkModPermission('deleteComments'), async (req, res) => {
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
      .populate('userId', 'isMod')
      .sort({ createdAt: -1 });
    
    res.json(comments);
  } catch (err) {
    console.error('Error fetching comments for mod:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update comment status
router.put('/api/comments/:id/status', modAuth, checkModPermission('deleteComments'), async (req, res) => {
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

// Delete comment (mod)
router.delete('/api/comments/:id', modAuth, checkModPermission('deleteComments'), async (req, res) => {
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
router.post('/api/comments/bulk-delete', modAuth, checkModPermission('deleteComments'), async (req, res) => {
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
router.post('/api/comments/bulk-status', modAuth, checkModPermission('deleteComments'), async (req, res) => {
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

// Get all reports (for mod)
router.get('/api/reports', modAuth, checkModPermission('viewReports'), async (req, res) => {
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
    console.error('Error fetching reports for mod:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all link reports (for mod)
router.get('/api/link-reports', modAuth, checkModPermission('viewReports'), async (req, res) => {
  try {
    const status = req.query.status;
    
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const reports = await LinkReport.find(query)
      .populate('reporter', 'username')
      .populate('postId', 'title slug')
      .sort({ createdAt: -1 });
    
    res.json(reports);
  } catch (err) {
    console.error('Error fetching link reports for mod:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update report status
router.put('/api/reports/:id/status', modAuth, checkModPermission('resolveReports'), async (req, res) => {
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

// Update link report status
router.put('/api/link-reports/:id/status', modAuth, checkModPermission('resolveReports'), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['pending', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }
    
    const report = await LinkReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'Link report not found' });
    }
    
    report.status = status;
    await report.save();
    
    res.json(report);
  } catch (err) {
    console.error('Error updating link report status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all post suggestions (for mod)
router.get('/api/suggestions', modAuth, checkModPermission('editPosts'), async (req, res) => {
  try {
    const status = req.query.status;
    
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const suggestions = await PostSuggestion.find(query)
      .populate('postId', 'title slug')
      .populate('suggestedBy', 'username')
      .sort({ createdAt: -1 });
    
    res.json(suggestions);
  } catch (err) {
    console.error('Error fetching post suggestions for mod:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve post suggestion
router.put('/api/suggestions/:id/approve', modAuth, checkModPermission('editPosts'), async (req, res) => {
  try {
    const suggestion = await PostSuggestion.findById(req.params.id);
    
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    
    if (suggestion.status !== 'pending') {
      return res.status(400).json({ error: 'Suggestion is already processed' });
    }
    
    // Find the post
    const post = await Post.findById(suggestion.postId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Update post with suggestion data
    if (suggestion.title) post.title = suggestion.title;
    if (suggestion.description) post.description = suggestion.description;
    if (suggestion.category) post.category = suggestion.category;
    if (suggestion.tags) post.tags = suggestion.tags;
    if (suggestion.imageUrl) post.imageUrl = suggestion.imageUrl;
    if (suggestion.downloadGroups) post.downloadGroups = suggestion.downloadGroups;
    
    await post.save();
    
    // Update suggestion status
    suggestion.status = 'approved';
    await suggestion.save();
    
    // Notify post author
    const postAuthor = await User.findById(post.author);
    if (postAuthor) {
      postAuthor.notifications.push({
        type: 'suggestion',
        targetId: post._id,
        targetType: 'post',
        message: `A suggestion for your post "${post.title}" has been approved by a moderator.`
      });
      await postAuthor.save();
    }
    
    // Notify suggestion author
    const suggestionAuthor = await User.findById(suggestion.suggestedBy);
    if (suggestionAuthor && suggestionAuthor._id.toString() !== postAuthor._id.toString()) {
      suggestionAuthor.notifications.push({
        type: 'suggestion',
        targetId: post._id,
        targetType: 'post',
        message: `Your suggestion for the post "${post.title}" has been approved by a moderator.`
      });
      await suggestionAuthor.save();
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error approving post suggestion:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reject post suggestion
router.put('/api/suggestions/:id/reject', modAuth, checkModPermission('editPosts'), async (req, res) => {
  try {
    const suggestion = await PostSuggestion.findById(req.params.id);
    
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    
    if (suggestion.status !== 'pending') {
      return res.status(400).json({ error: 'Suggestion is already processed' });
    }
    
    // Update suggestion status
    suggestion.status = 'rejected';
    await suggestion.save();
    
    // Notify suggestion author
    const suggestionAuthor = await User.findById(suggestion.suggestedBy);
    if (suggestionAuthor) {
      const post = await Post.findById(suggestion.postId);
      const postTitle = post ? post.title : 'a post';
      
      suggestionAuthor.notifications.push({
        type: 'suggestion',
        targetId: suggestion.postId,
        targetType: 'post',
        message: `Your suggestion for "${postTitle}" has been rejected by a moderator.`
      });
      await suggestionAuthor.save();
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error rejecting post suggestion:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;