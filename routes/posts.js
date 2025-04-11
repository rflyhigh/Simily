// FILE: /routes/posts.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); 
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Report = require('../models/Report');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const { commentLimiter, voteLimiter } = require('../middleware/rateLimiter');

// Get all posts (paginated)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || 'newest';
    
    let sortOptions = {};
    if (sort === 'newest') {
      sortOptions = { createdAt: -1 };
    } else if (sort === 'popular') {
      sortOptions = { upvotes: -1 };
    }
    
    const posts = await Post.find({ status: 'active' })
      .populate('author', 'username')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
    
    const total = await Post.countDocuments({ status: 'active' });
    
    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recent posts
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const posts = await Post.find({ status: 'active' })
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .limit(limit);
    
    res.json(posts);
  } catch (err) {
    console.error('Error fetching recent posts:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get most popular posts
router.get('/popular', async (req, res) => {
  try {
    const period = req.query.period || 'all';
    const limit = parseInt(req.query.limit) || 8;
    
    let dateFilter = { status: 'active' };
    const now = new Date();
    
    if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter.createdAt = { $gte: weekAgo };
    } else if (period === 'month') {
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      dateFilter.createdAt = { $gte: monthAgo };
    } else if (period === 'year') {
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      dateFilter.createdAt = { $gte: yearAgo };
    }
    
    const posts = await Post.find(dateFilter)
      .populate('author', 'username')
      .sort({ upvotes: -1, downvotes: 1 })
      .limit(limit);
    
    res.json(posts);
  } catch (err) {
    console.error('Error fetching popular posts:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search posts
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    const tag = req.query.tag;
    const category = req.query.category;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || 'newest';
    
    let searchQuery = { status: 'active' };
    
    if (query) {
      searchQuery.$text = { $search: query };
    } else if (tag) {
      searchQuery.tags = tag;
    } else if (category) {
      searchQuery.category = category;
    }
    
    let sortOptions = {};
    if (sort === 'newest') {
      sortOptions = { createdAt: -1 };
    } else if (sort === 'popular') {
      sortOptions = { upvotes: -1 };
    }
    
    const posts = await Post.find(searchQuery)
      .populate('author', 'username')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
    
    const total = await Post.countDocuments(searchQuery);
    
    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (err) {
    console.error('Error searching posts:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/id/:id', async (req, res) => {
  try {
    // Get user ID if authenticated
    let userId = null;
    if (req.headers['x-auth-token']) {
      try {
        const decoded = jwt.verify(req.headers['x-auth-token'], process.env.JWT_SECRET);
        userId = decoded.user.id;
      } catch (err) {
        // Invalid token, but we'll still show the post
        console.error('Invalid token:', err);
      }
    }
    
    const post = await Post.findById(req.params.id)
      .populate('author', 'username');
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Add user's vote status if authenticated
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        if (user.upvotedPosts.includes(post._id)) {
          post.userVote = 'up';
        } else if (user.downvotedPosts.includes(post._id)) {
          post.userVote = 'down';
        }
      }
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

// Get single post by slug
router.get('/:slug', async (req, res) => {
  try {
    // Get user ID if authenticated
    let userId = null;
    if (req.headers['x-auth-token']) {
      try {
        const decoded = jwt.verify(req.headers['x-auth-token'], process.env.JWT_SECRET);
        userId = decoded.user.id;
      } catch (err) {
        // Invalid token, but we'll still show the post
        console.error('Invalid token:', err);
      }
    }
    
    const post = await Post.findOne({ slug: req.params.slug })
      .populate('author', 'username');
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Add user's vote status if authenticated
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        if (user.upvotedPosts.includes(post._id)) {
          post.userVote = 'up';
        } else if (user.downvotedPosts.includes(post._id)) {
          post.userVote = 'down';
        }
      }
    }
    
    // Increment view count
    post.views += 1;
    await post.save();
    
    res.json(post);
  } catch (err) {
    console.error('Error fetching post:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new post
router.post('/', auth, async (req, res) => {
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
    
    const newPost = new Post({
      title,
      description,
      category,
      tags: tags || [],
      imageUrl,
      downloadGroups,
      author: req.user.id
    });
    
    await newPost.save();
    
    // Populate author information
    await newPost.populate('author', 'username');
    
    res.status(201).json(newPost);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update post
router.put('/:id', auth, async (req, res) => {
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
    
    // Get user to check if they're a mod with edit permissions
    const user = await User.findById(req.user.id);
    
    // Check if user is the author or a mod with edit permissions
    if (post.author.toString() !== req.user.id && 
        !(user.isMod && user.modPermissions.editPosts)) {
      return res.status(403).json({ error: 'Not authorized to update this post' });
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
    
    // If a mod is editing someone else's post, send a notification to the author
    if (user.isMod && post.author.toString() !== req.user.id) {
      const postAuthor = await User.findById(post.author);
      if (postAuthor) {
        postAuthor.notifications.push({
          type: 'suggestion',
          targetId: post._id,
          targetType: 'post',
          message: `Moderator ${user.username} has edited your post "${post.title}"`,
          postSlug: post.slug
        });
        await postAuthor.save();
      }
    }
    
    res.json(post);
  } catch (err) {
    console.error('Error updating post:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Check if user is the author or an admin
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }
    
    // Delete post
    await post.remove();
    
    // Delete associated comments
    await Comment.deleteMany({ postId: req.params.id });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting post:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Record view
router.post('/:id/view', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Increment view count
    post.views += 1;
    await post.save();
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error recording view:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Vote on post
router.post('/:id/vote', auth, voteLimiter, async (req, res) => {
  try {
    const { vote } = req.body;
    
    if (!vote || !['up', 'down'].includes(vote)) {
      return res.status(400).json({ error: 'Valid vote type is required' });
    }
    
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const user = await User.findById(req.user.id);
    
    // Check if user has already voted
    const hasUpvoted = user.upvotedPosts.includes(post._id);
    const hasDownvoted = user.downvotedPosts.includes(post._id);
    
    // Handle upvote
    if (vote === 'up') {
      if (hasUpvoted) {
        // Remove upvote
        post.upvotes -= 1;
        user.upvotedPosts = user.upvotedPosts.filter(id => id.toString() !== post._id.toString());
        
        // Update post author's reputation
        if (post.author.toString() !== req.user.id) {
          const author = await User.findById(post.author);
          author.reputation -= 1;
          await author.save();
        }
      } else {
        // Add upvote
        post.upvotes += 1;
        user.upvotedPosts.push(post._id);
        
        // Remove downvote if exists
        if (hasDownvoted) {
          post.downvotes -= 1;
          user.downvotedPosts = user.downvotedPosts.filter(id => id.toString() !== post._id.toString());
        }
        
        // Update post author's reputation
        if (post.author.toString() !== req.user.id) {
          const author = await User.findById(post.author);
          author.reputation += 1;
          
          // If user had downvoted before, add another point
          if (hasDownvoted) {
            author.reputation += 1;
          }
          
          await author.save();
        }
      }
    } 
    // Handle downvote
    else if (vote === 'down') {
      if (hasDownvoted) {
        // Remove downvote
        post.downvotes -= 1;
        user.downvotedPosts = user.downvotedPosts.filter(id => id.toString() !== post._id.toString());
        
        // Update post author's reputation
        if (post.author.toString() !== req.user.id) {
          const author = await User.findById(post.author);
          author.reputation += 1;
          await author.save();
        }
      } else {
        // Add downvote
        post.downvotes += 1;
        user.downvotedPosts.push(post._id);
        
        // Remove upvote if exists
        if (hasUpvoted) {
          post.upvotes -= 1;
          user.upvotedPosts = user.upvotedPosts.filter(id => id.toString() !== post._id.toString());
        }
        
        // Update post author's reputation
        if (post.author.toString() !== req.user.id) {
          const author = await User.findById(post.author);
          author.reputation -= 1;
          
          // If user had upvoted before, subtract another point
          if (hasUpvoted) {
            author.reputation -= 1;
          }
          
          await author.save();
        }
      }
    }
    
    // Check if post needs to be reviewed
    const totalVotes = post.upvotes + post.downvotes;
    if (totalVotes >= 5 && (post.downvotes / totalVotes) > 0.2) {
      post.status = 'held';
      
      // Create a report for admin review
      const report = new Report({
        targetId: post._id,
        type: 'post',
        reason: 'Post received more than 20% downvotes',
        reporter: req.user.id
      });
      
      await report.save();
    }
    
    await post.save();
    await user.save();
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error voting on post:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get comments for post
router.get('/:identifier/comments', async (req, res) => {
  try {
    // First, we need to find the post (by slug or ID)
    let post;
    
    // Check if the identifier is a valid ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(req.params.identifier);
    
    if (isValidObjectId) {
      // Try to find by ID
      post = await Post.findById(req.params.identifier);
    } else {
      // Try to find by slug
      post = await Post.findOne({ slug: req.params.identifier });
    }
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const comments = await Comment.find({ 
      postId: post._id,
      parentId: null, // Get only top-level comments
      status: 'approved' // Only get approved comments
    }).sort({ createdAt: -1 });
    
    // Get all replies in a single query
    const replies = await Comment.find({
      postId: post._id,
      parentId: { $ne: null },
      status: 'approved' // Only get approved replies
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
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add comment
router.post('/:identifier/comments', auth, commentLimiter, async (req, res) => {
  try {
    const { content, parentId } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    // Get user
    const user = await User.findById(req.user.id);
    
    // Check if user is blocked
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Your account has been blocked from commenting' });
    }
    
    // Find the post (by slug or ID)
    let post;
    
    // Check if the identifier is a valid ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(req.params.identifier);
    
    if (isValidObjectId) {
      // Try to find by ID
      post = await Post.findById(req.params.identifier);
    } else {
      // Try to find by slug
      post = await Post.findOne({ slug: req.params.identifier });
    }
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // If it's a reply, check if parent comment exists
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }
    
    const newComment = new Comment({
      postId: post._id,
      userId: req.user.id,
      username: user.username,
      content,
      parentId: parentId || null,
      status: 'approved' // Default to approved, admin can change later
    });
    
    await newComment.save();
    res.status(201).json(newComment);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;