const mongoose = require('mongoose');

const SoftwareSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
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
  // For backward compatibility
  downloadLinks: [{
    label: String,
    url: String
  }],
  views: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add text index for search
SoftwareSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Software', SoftwareSchema);