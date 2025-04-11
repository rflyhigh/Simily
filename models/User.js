// FILE: /models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  password: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'blocked'],
    default: 'active'
  },
  isMod: {
    type: Boolean,
    default: false
  },
  modPermissions: {
    deleteUsers: { type: Boolean, default: false },
    deletePosts: { type: Boolean, default: false },
    deleteComments: { type: Boolean, default: false },
    viewReports: { type: Boolean, default: false },
    resolveReports: { type: Boolean, default: false },
    editPosts: { type: Boolean, default: false },
    promoteMods: { type: Boolean, default: false }
  },
  reputation: {
    type: Number,
    default: 0
  },
  upvotedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  downvotedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  upvotedComments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  downvotedComments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  notifications: [{
    type: {
      type: String,
      enum: ['suggestion', 'approval', 'report', 'promotion'],
      required: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    targetType: {
      type: String,
      enum: ['post', 'comment', 'link', 'user'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    postSlug: {
      type: String,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);