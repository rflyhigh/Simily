// FILE: /middleware/checkModPermission.js
module.exports = function(permission) {
    return function(req, res, next) {
      // Check if user exists and is a mod
      if (!req.user || !req.user.isMod) {
        return res.status(403).json({ error: 'Not authorized as moderator' });
      }
      
      // Check if mod has the required permission
      if (!req.user.permissions[permission]) {
        return res.status(403).json({ error: `You don't have permission to ${permission}` });
      }
      
      next();
    };
  };