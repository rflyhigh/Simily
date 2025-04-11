// FILE: /server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const Post = require('./models/Post');
const User = require('./models/User');
const { apiLimiter } = require('./middleware/rateLimiter');
require('dotenv').config();
require('./config/db');

const app = express();
app.set('views', path.join(__dirname, 'views'));
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/suggestions', require('./routes/suggestions'));
app.use('/api/linkreports', require('./routes/linkreports'));
app.use('/mod', require('./routes/mod'));

// Serve static pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'search.html'));
});

// Server-side rendering for post detail pages
app.get('/post/:slug', async (req, res) => {
  try {
    // Get the post data
    const post = await Post.findOne({ slug: req.params.slug }).populate('author', 'username isMod');
    
    if (!post) {
      return res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
    }
    
    // Read the detail.html template
    let detailHtml = fs.readFileSync(path.join(__dirname, 'views', 'detail.html'), 'utf8');
    
    // Truncate description for meta tags
    const metaDescription = post.description.length > 160 ? 
      post.description.substring(0, 157) + '...' : 
      post.description;
    
    // Replace placeholder meta tags with actual content
    detailHtml = detailHtml
      .replace('<title>Post Details - Simily</title>', `<title>${post.title} - Simily</title>`)
      .replace('<meta name="description" content="Find direct links to everything you need on Simily. Browse and download software, games, movies, music, books, and more.">', 
               `<meta name="description" content="${metaDescription}">`)
      .replace('<meta property="og:url" content="">', 
               `<meta property="og:url" content="https://simily.onrender.com/post/${post.slug}">`)
      .replace('<meta property="og:title" content="">', 
               `<meta property="og:title" content="${post.title} - Simily">`)
      .replace('<meta property="og:description" content="">', 
               `<meta property="og:description" content="${metaDescription}">`)
      .replace('<meta property="og:image" content="">', 
               `<meta property="og:image" content="${post.imageUrl}">`)
      .replace('<meta property="twitter:url" content="">', 
               `<meta property="twitter:url" content="https://simily.onrender.com/post/${post.slug}">`)
      .replace('<meta property="twitter:title" content="">', 
               `<meta property="twitter:title" content="${post.title} - Simily">`)
      .replace('<meta property="twitter:description" content="">', 
               `<meta property="twitter:description" content="${metaDescription}">`)
      .replace('<meta property="twitter:image" content="">', 
               `<meta property="twitter:image" content="${post.imageUrl}">`)
      .replace('<link rel="canonical" href="">', 
               `<link rel="canonical" href="https://simily.onrender.com/post/${post.slug}">`);
    
    res.send(detailHtml);
  } catch (err) {
    console.error('Error rendering post page:', err);
    res.sendFile(path.join(__dirname, 'views', 'detail.html'));
  }
});

// Server-side rendering for user profiles
app.get('/user/:username', async (req, res) => {
  try {
    // Get the user data
    const user = await User.findOne({ username: req.params.username }).select('-password');
    
    if (!user) {
      return res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
    }
    
    // Read the profile.html template
    let profileHtml = fs.readFileSync(path.join(__dirname, 'views', 'profile.html'), 'utf8');
    
    // Replace placeholder title with actual content
    profileHtml = profileHtml
      .replace('<title>Profile - Simily</title>', `<title>${user.username}'s Profile - Simily</title>`)
      .replace('<meta name="description" content="Find direct links to everything you need on Simily. Browse and download software, games, movies, music, books, and more.">', 
               `<meta name="description" content="View ${user.username}'s profile on Simily. Check out their posts, comments, and contributions.">`);
    
    res.send(profileHtml);
  } catch (err) {
    console.error('Error rendering profile page:', err);
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
  }
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'upload.html'));
});

app.get('/notifications', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'notifications.html'));
});

// 404 page
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});