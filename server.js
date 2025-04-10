// FILE: /server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
require('./config/db');

const app = express();
app.set('views', path.join(__dirname, 'views'));
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/categories', require('./routes/categories'));
app.use('/admin', require('./routes/admin'));

// Serve static pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'search.html'));
});

app.get('/post/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'detail.html'));
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

app.get('/user/:username', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'profile.html'));
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
