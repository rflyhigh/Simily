// FILE: /middleware/modAuth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');
  
  // Check if no token
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }
  
  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to check mod status
    const user = await User.findById(decoded.user.id);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Check if user is FIRST_MOD_ID
    if (user.username === process.env.FIRST_MOD_ID) {
      // If they match FIRST_MOD_ID but aren't a mod yet, update them
      if (!user.isMod) {
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
        await user.save();
      }
      
      // Add user with mod permissions to request
      req.user = {
        id: user._id,
        isMod: true,
        permissions: user.modPermissions
      };
      
      return next();
    }
    
    if (!user.isMod) {
      return res.status(403).json({ error: 'Not authorized as moderator' });
    }
    
    // Add user with mod permissions to request
    req.user = {
      id: user._id,
      isMod: true,
      permissions: user.modPermissions
    };
    
    next();
  } catch (err) {
    console.error('Mod auth error:', err);
    res.status(401).json({ error: 'Token is not valid' });
  }
};