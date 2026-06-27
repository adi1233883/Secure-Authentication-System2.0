// Role-Based Access Control guard. Use after authenticateJWT.
// Usage: router.get('/admin/users', authenticateJWT, authorizeRole('admin'), handler)

function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

module.exports = authorizeRole;
