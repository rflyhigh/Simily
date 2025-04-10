// FILE: /routes/comments.js
const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');

// Delete comment
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Check if user is the author
    if (comment.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
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

module.exports = router;