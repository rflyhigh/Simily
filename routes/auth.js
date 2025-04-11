// FILE: /routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const modAuth = require('../middleware/modAuth');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');

// Register user - apply register rate limiter
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Please provide username and password' });
    }
    
    // Check username length
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
    }
    
    // Check password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if username contains only allowed characters
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and hyphens' });
    }
    
    // Check if user already exists
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ error: 'Username is already taken' });
    }
    
    // Create new user
    user = new User({
      username,
      password
    });

    const userCount = await User.countDocuments();
    if (userCount === 0 || username === process.env.FIRST_MOD_ID) {
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
    }
    
    await user.save();
    
    // Create and return JWT token
    const payload = {
      user: {
        id: user.id
      }
    };
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login user - apply login rate limiter
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Please provide username and password' });
    }
    
    // Check if user exists
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Check if user is blocked
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Your account has been blocked' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Create and return JWT token
    const payload = {
      user: {
        id: user.id
      }
    };
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          isMod: user.isMod
        });
      }
    );
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread notification count
router.get('/notifications/count', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const unreadCount = user.notifications.filter(n => !n.read).length;
    res.json({ count: unreadCount });
  } catch (err) {
    console.error('Get notification count error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user notifications
router.get('/notifications', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Sort notifications by date (newest first)
    const notifications = user.notifications.sort((a, b) => b.createdAt - a.createdAt);
    
    res.json(notifications);
  } catch (err) {
    console.error('Get notifications error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const notification = user.notifications.id(req.params.notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    notification.read = true;
    await user.save();
    
    res.json({ success: true });
  } catch (err) {
    console.error('Mark notification read error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.notifications.forEach(notification => {
      notification.read = true;
    });
    
    await user.save();
    
    res.json({ success: true });
  } catch (err) {
    console.error('Mark all notifications read error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;