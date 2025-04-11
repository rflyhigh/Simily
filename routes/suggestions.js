// FILE: /routes/suggestions.js
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const PostSuggestion = require('../models/PostSuggestion');
const auth = require('../middleware/auth');
const { voteLimiter, reportLimiter } = require('../middleware/rateLimiter');

// Create a post suggestion
router.post('/', auth, reportLimiter, async (req, res) => {
  try {
    const { postId, title, description, category, tags, imageUrl, downloadGroups, message } = req.body;
    
    if (!postId) {
      return res.status(400).json({ error: 'Post ID is required' });
    }
    
    if (!message) {
      return res.status(400).json({ error: 'A message explaining your suggestion is required' });
    }
    
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Create suggestion
    const suggestion = new PostSuggestion({
      postId,
      suggestedBy: req.user.id,
      title: title || post.title,
      description: description || post.description,
      category: category || post.category,
      tags: tags || post.tags,
      imageUrl: imageUrl || post.imageUrl,
      downloadGroups: downloadGroups || post.downloadGroups,
      message
    });
    
    await suggestion.save();
    
    // Notify post author
    const postAuthor = await User.findById(post.author);
    if (postAuthor && postAuthor._id.toString() !== req.user.id) {
      postAuthor.notifications.push({
        type: 'suggestion',
        targetId: post._id,
        targetType: 'post',
        message: `${req.user.username} has suggested changes to your post "${post.title}"`
      });
      await postAuthor.save();
    }
    
    res.status(201).json(suggestion);
  } catch (err) {
    console.error('Error creating post suggestion:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get suggestions for a post
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
    const isAuthorOrMod = post.author.toString() === req.user.id || user.isMod;
    
    let query = { postId };
    
    // If not author or mod, only show pending suggestions
    if (!isAuthorOrMod) {
      query.status = 'pending';
    }
    
    const suggestions = await PostSuggestion.find(query)
      .populate('suggestedBy', 'username')
      .sort({ createdAt: -1 });
    
    res.json(suggestions);
  } catch (err) {
    console.error('Error fetching post suggestions:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Vote on a suggestion
router.post('/:id/vote', auth, voteLimiter, async (req, res) => {
  try {
    const { vote } = req.body;
    
    if (!vote || !['up', 'down'].includes(vote)) {
      return res.status(400).json({ error: 'Valid vote type is required' });
    }
    
    const suggestion = await PostSuggestion.findById(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    
    if (suggestion.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot vote on a processed suggestion' });
    }
    
    // Check if user has already voted
    const existingVoteIndex = suggestion.votes.voters.findIndex(
      v => v.user.toString() === req.user.id
    );
    
    if (existingVoteIndex !== -1) {
      const existingVote = suggestion.votes.voters[existingVoteIndex];
      
      // Remove existing vote
      if (existingVote.vote === vote) {
        // User is toggling their vote off
        if (vote === 'up') suggestion.votes.up -= 1;
        else suggestion.votes.down -= 1;
        
        suggestion.votes.voters.splice(existingVoteIndex, 1);
      } else {
        // User is changing their vote
        if (vote === 'up') {
          suggestion.votes.up += 1;
          suggestion.votes.down -= 1;
        } else {
          suggestion.votes.down += 1;
          suggestion.votes.up -= 1;
        }
        
        existingVote.vote = vote;
      }
    } else {
      // Add new vote
      if (vote === 'up') suggestion.votes.up += 1;
      else suggestion.votes.down += 1;
      
      suggestion.votes.voters.push({
        user: req.user.id,
        vote
      });
    }
    
    // Check if suggestion should be auto-approved
    const totalVotes = suggestion.votes.up + suggestion.votes.down;
    if (totalVotes >= 5 && (suggestion.votes.up / totalVotes) >= 0.6) {
      // Auto-approve suggestion
      suggestion.status = 'approved';
      
      // Apply changes to post
      const post = await Post.findById(suggestion.postId);
      if (post) {
        if (suggestion.title) post.title = suggestion.title;
        if (suggestion.description) post.description = suggestion.description;
        if (suggestion.category) post.category = suggestion.category;
        if (suggestion.tags) post.tags = suggestion.tags;
        if (suggestion.imageUrl) post.imageUrl = suggestion.imageUrl;
        if (suggestion.downloadGroups) post.downloadGroups = suggestion.downloadGroups;
        
        await post.save();
        
        // Notify post author
        const postAuthor = await User.findById(post.author);
        if (postAuthor) {
          postAuthor.notifications.push({
            type: 'suggestion',
            targetId: post._id,
            targetType: 'post',
            message: `A community-approved suggestion has been applied to your post "${post.title}"`
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
            message: `Your suggestion for "${post.title}" has been approved by the community`
          });
          await suggestionAuthor.save();
        }
      }
    }
    
    await suggestion.save();
    
    res.json(suggestion);
  } catch (err) {
    console.error('Error voting on suggestion:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve a suggestion (post author only)
router.put('/:id/approve', auth, async (req, res) => {
  try {
    const suggestion = await PostSuggestion.findById(req.params.id);
    
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    
    if (suggestion.status !== 'pending') {
      return res.status(400).json({ error: 'Suggestion is already processed' });
    }
    
    // Get post and check if user is the author
    const post = await Post.findById(suggestion.postId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Check if user is author or mod
    const user = await User.findById(req.user.id);
    if (post.author.toString() !== req.user.id && !user.isMod) {
      return res.status(403).json({ error: 'Only the post author or moderators can approve suggestions' });
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
    
    // Notify suggestion author
    const suggestionAuthor = await User.findById(suggestion.suggestedBy);
    if (suggestionAuthor && suggestionAuthor._id.toString() !== req.user.id) {
      suggestionAuthor.notifications.push({
        type: 'suggestion',
        targetId: post._id,
        targetType: 'post',
        message: `Your suggestion for "${post.title}" has been approved`
      });
      await suggestionAuthor.save();
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error approving suggestion:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reject a suggestion (post author only)
router.put('/:id/reject', auth, async (req, res) => {
  try {
    const suggestion = await PostSuggestion.findById(req.params.id);
    
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    
    if (suggestion.status !== 'pending') {
      return res.status(400).json({ error: 'Suggestion is already processed' });
    }
    
    // Get post and check if user is the author
    const post = await Post.findById(suggestion.postId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Check if user is author or mod
    const user = await User.findById(req.user.id);
    if (post.author.toString() !== req.user.id && !user.isMod) {
      return res.status(403).json({ error: 'Only the post author or moderators can reject suggestions' });
    }
    
    // Update suggestion status
    suggestion.status = 'rejected';
    await suggestion.save();
    
    // Notify suggestion author
    const suggestionAuthor = await User.findById(suggestion.suggestedBy);
    if (suggestionAuthor && suggestionAuthor._id.toString() !== req.user.id) {
      suggestionAuthor.notifications.push({
        type: 'suggestion',
        targetId: post._id,
        targetType: 'post',
        message: `Your suggestion for "${post.title}" has been rejected`
      });
      await suggestionAuthor.save();
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error rejecting suggestion:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;