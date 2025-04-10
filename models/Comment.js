const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  softwareId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Software',
    required: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  status: {
    type: String,
    enum: ['approved', 'held', 'blocked'],
    default: 'approved'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Comment', CommentSchema);