// FILE: /models/Post.js
const mongoose = require('mongoose');
const slugify = require('slugify');
const crypto = require('crypto');

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  imageUrl: {
    type: String,
    required: true
  },
  downloadGroups: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    links: [{
      label: {
        type: String,
        required: true,
        trim: true
      },
      url: {
        type: String,
        required: true,
        trim: true
      }
    }]
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'held', 'deleted'],
    default: 'active'
  },
  views: {
    type: Number,
    default: 0
  },
  upvotes: {
    type: Number,
    default: 0
  },
  downvotes: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add text index for search
PostSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text',
  category: 'text'
});

// Generate slug before saving
PostSchema.pre('save', function(next) {
  if (!this.isModified('title')) {
    return next();
  }
  
  // Create base slug from title
  const baseSlug = slugify(this.title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g
  });
  
  // Limit to first 50 characters
  const trimmedSlug = baseSlug.substring(0, 50);
  
  // Add random string to ensure uniqueness
  const randomString = crypto.randomBytes(4).toString('hex');
  this.slug = `${trimmedSlug}-${randomString}`;
  
  next();
});

module.exports = mongoose.model('Post', PostSchema);