const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    
    // Check for token
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    
    // Verify token
    try {
      // Simple token check for this implementation
      if (token === process.env.ADMIN_TOKEN) {
        next();
      } else {
        throw new Error('Invalid token');
      }
    } catch (err) {
      res.status(401).json({ msg: 'Token is not valid' });
    }
  };
  
  module.exports = auth;