const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authenticate a bearer token.
 *
 * Rewritten from the original, which had three defects:
 *   - it fell back to a hardcoded JWT secret if the env var was missing
 *   - it called next() even when the user record no longer existed, so
 *     downstream `req.user._id` threw
 *   - control flow could reach the trailing `if (!token)` after next() had
 *     already run, risking a double response
 */
const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'Not authorized, no token' });
  }

  const token = header.split(' ')[1];
  if (!token) {
    return res.status(401).json({ msg: 'Not authorized, no token' });
  }

  let decoded;
  try {
    // No fallback secret. validateEnv() guarantees JWT_SECRET is present.
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    // Expired vs malformed is useful for the client to distinguish, but we
    // deliberately do not echo the underlying error.
    const msg = error.name === 'TokenExpiredError'
      ? 'Session expired, please log in again'
      : 'Not authorized, token failed';
    return res.status(401).json({ msg });
  }

  const user = await User.findById(decoded.id);

  // The account may have been deleted since the token was issued.
  if (!user) {
    return res.status(401).json({ msg: 'Not authorized, user no longer exists' });
  }

  // Password resets bump tokenVersion, invalidating every previously issued
  // token.
  //
  // Both sides are defaulted to 0. Tokens minted before this claim existed
  // have no `tv`, and user documents created before the field existed read
  // back as undefined — without both fallbacks, deploying this would reject
  // every session on the platform at once.
  if ((decoded.tv ?? 0) !== (user.tokenVersion ?? 0)) {
    return res.status(401).json({ msg: 'Session expired, please log in again' });
  }

  if (user.isLocked) {
    return res.status(403).json({ msg: 'Your account has been locked. Please contact support.' });
  }

  req.user = user;
  return next();
};

module.exports = { protect };
