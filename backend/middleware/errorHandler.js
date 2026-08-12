const multer = require('multer');

/**
 * 404 for unmatched API routes.
 *
 * Without this, an unknown /api path fell through to the SPA catch-all and
 * returned index.html with a 200, which is confusing for clients.
 */
const notFound = (req, res) => {
  res.status(404).json({ msg: `Not found: ${req.method} ${req.originalUrl}` });
};

/**
 * Central error handler.
 *
 * Responses used to be inconsistent — some routes sent plain text
 * (`res.status(500).send('Server Error')`), others JSON. The client reads
 * `err.response.data.msg`, so the plain-text ones surfaced as a generic
 * fallback message. Everything is JSON now.
 *
 * Internal details are logged, never returned.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
const errorHandler = (err, req, res, next) => {
  // Multer rejects oversized or wrong-type uploads with its own error class.
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'File is too large. Maximum size is 5MB.'
      : `Upload error: ${err.message}`;
    return res.status(400).json({ msg });
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ msg: 'Validation failed', errors: details });
  }

  // Malformed ObjectId in a route param
  if (err.name === 'CastError') {
    return res.status(400).json({ msg: 'Invalid identifier' });
  }

  // Duplicate key on a unique index
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    return res.status(409).json({ msg: `That ${field} is already in use` });
  }

  const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;

  console.error('UNHANDLED ERROR', {
    method: req.method,
    url: req.originalUrl,
    user: req.user?._id?.toString(),
    status,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  res.status(status).json({
    msg: status === 500 ? 'Server error' : err.message,
  });
};

module.exports = { notFound, errorHandler };
