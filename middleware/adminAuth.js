// FILE: /middleware/adminAuth.js
module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');
  
  // Check if no token
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }
  
  // Verify token
  try {
    if (token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Invalid admin token' });
    }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};