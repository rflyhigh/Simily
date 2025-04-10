const express = require('express');
const router = express.Router();
const path = require('path');

// Serve homepage
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

// Serve software detail page
router.get('/software/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'detail.html'));
});

// Serve search page
router.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'search.html'));
});

module.exports = router;