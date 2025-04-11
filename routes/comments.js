// FILE: /routes/comments.js
const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { voteLimiter } = require('../middleware/rateLimiter');

// Delete comment
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Check if user is the author
    if (comment.userId.toString() !== req.user.id) {
      // Check if user is a mod
      const user = await User.findById(req.user.id);
      if (!user.isMod) {
        return res.status(403).json({ error: 'Not authorized to delete this comment' });
      }
    }
    
    await comment.remove();
    
    // Also delete any replies to this comment
    if (!comment.parentId) {
      await Comment.deleteMany({ parentId: req.params.id });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting comment:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Comment not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Vote on comment
router.post('/:id/vote', auth, voteLimiter, async (req, res) => {
  try {
    const { vote } = req.body;
    
    if (!vote || !['up', 'down'].includes(vote)) {
      return res.status(400).json({ error: 'Valid vote type is required' });
    }
    
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    const user = await User.findById(req.user.id);
    
    // Check if user has already voted
    const hasUpvoted = user.upvotedComments.includes(comment._id);
    const hasDownvoted = user.downvotedComments.includes(comment._id);
    
    // Handle upvote
    if (vote === 'up') {
      if (hasUpvoted) {
        // Remove upvote
        comment.upvotes -= 1;
        user.upvotedComments = user.upvotedComments.filter(id => id.toString() !== comment._id.toString());
      } else {
        // Add upvote
        comment.upvotes += 1;
        user.upvotedComments.push(comment._id);
        
        // Remove downvote if exists
        if (hasDownvoted) {
          comment.downvotes -= 1;
          user.downvotedComments = user.downvotedComments.filter(id => id.toString() !== comment._id.toString());
        }
      }
    } 
    // Handle downvote
    else if (vote === 'down') {
      if (hasDownvoted) {
        // Remove downvote
        comment.downvotes -= 1;
        user.downvotedComments = user.downvotedComments.filter(id => id.toString() !== comment._id.toString());
      } else {
        // Add downvote
        comment.downvotes += 1;
        user.downvotedComments.push(comment._id);
        
        // Remove upvote if exists
        if (hasUpvoted) {
          comment.upvotes -= 1;
          user.upvotedComments = user.upvotedComments.filter(id => id.toString() !== comment._id.toString());
        }
      }
    }
    
    await comment.save();
    await user.save();
    
    res.json({ 
      success: true,
      upvotes: comment.upvotes,
      downvotes: comment.downvotes,
      userVote: hasUpvoted ? (vote === 'up' ? null : 'down') : 
                hasDownvoted ? (vote === 'down' ? null : 'up') : vote
    });
  } catch (err) {
    console.error('Error voting on comment:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;