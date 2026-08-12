const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  // 403, not 401: the caller is authenticated, they simply lack the role.
  // Returning 401 here would trigger the client's session-expiry interceptor
  // and log a legitimate user out.
  return res.status(403).json({ msg: 'Not authorized as an admin' });
};

module.exports = { admin };
