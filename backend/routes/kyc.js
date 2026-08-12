const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { protect } = require('../middleware/auth');
const User = require('../models/User');
const { sendAdminAlert } = require('../utils/sendEmail');
const {
  ensureUploadDir,
  detectFileType,
  resolveStoredFile,
  deleteStoredFile,
} = require('../utils/kycStorage');

/*
 * KYC uploads.
 *
 * Files are written to a directory that is deliberately NOT served statically.
 * Retrieval is admin-only via GET /api/admin/kyc/:userId/document.
 *
 * Filenames are unguessable (crypto.randomBytes, not Math.random) as a second
 * layer, but the access control is the actual protection.
 */
const storage = multer.diskStorage({
  destination(req, file, cb) {
    try {
      cb(null, ensureUploadDir());
    } catch (error) {
      cb(error);
    }
  },
  filename(req, file, cb) {
    // Do not trust the client's extension — it is corrected after the magic
    // byte check below. Use a random name so files cannot be enumerated.
    const random = crypto.randomBytes(16).toString('hex');
    cb(null, `${req.user._id}-${random}.tmp`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
  fileFilter(req, file, cb) {
    // A cheap first pass. The authoritative check is on the file's actual
    // bytes after it lands — the MIME type and extension here are both
    // attacker-controlled.
    const allowed = /^(image\/(jpeg|png|webp)|application\/pdf)$/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only JPEG, PNG, WEBP and PDF files are accepted'));
  },
});

// @desc    Upload KYC document
// @route   POST /api/kyc/upload
// @access  Private
router.post('/upload', protect, upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'Please upload a document' });
  }

  const tempPath = req.file.path;

  // --- Verify the real file type ------------------------------------------
  let handle;
  let header;
  try {
    handle = await fs.promises.open(tempPath, 'r');
    header = Buffer.alloc(12);
    await handle.read(header, 0, 12, 0);
  } finally {
    if (handle) await handle.close();
  }

  const detected = detectFileType(header);
  if (!detected) {
    await fs.promises.unlink(tempPath).catch(() => {});
    return res.status(400).json({
      msg: 'That file is not a valid JPEG, PNG, WEBP or PDF.',
    });
  }

  // Rename to the extension the bytes actually say it is.
  const finalName = path.basename(tempPath, '.tmp') + detected.ext;
  const finalPath = path.join(path.dirname(tempPath), finalName);
  await fs.promises.rename(tempPath, finalPath);
  await fs.promises.chmod(finalPath, 0o600).catch(() => {});

  const user = await User.findById(req.user._id);
  if (!user) {
    await fs.promises.unlink(finalPath).catch(() => {});
    return res.status(404).json({ msg: 'User not found' });
  }

  if (user.kycStatus === 'verified') {
    await fs.promises.unlink(finalPath).catch(() => {});
    return res.status(400).json({ msg: 'Your identity is already verified.' });
  }

  // Replacing a previous submission — remove the superseded file so old copies
  // of identity documents don't accumulate on disk indefinitely.
  if (user.kycDocument) {
    deleteStoredFile(user.kycDocument);
  }

  // Store the bare filename. The old code stored '/uploads/<name>', which was
  // a live public URL; there is no public URL for these any more.
  user.kycDocument = finalName;
  user.kycDocumentMime = detected.mime;
  user.kycStatus = 'pending';
  user.kycSubmittedAt = new Date();
  user.kycRejectionNote = '';

  if (typeof req.body.fullName === 'string' && req.body.fullName.trim()) {
    user.kycFullName = req.body.fullName.trim().slice(0, 120);
  }

  await user.save();

  sendAdminAlert(
    `KYC submitted: ${user.username}`,
    `A user has submitted identity documents for review.\n\n<strong>Username:</strong> ${user.username}\n<strong>Email:</strong> ${user.email}\n<strong>Full name given:</strong> ${user.kycFullName || 'Not provided'}\n\nReview it in the Admin Panel.`
  );

  /*
   * Returns only the KYC status fields.
   *
   * This route previously responded with `res.json({ ..., user })` — the whole
   * Mongoose document, which serialised the bcrypt password hash and admin PIN
   * hash straight back to the browser.
   */
  return res.json({
    msg: 'KYC document uploaded successfully. It is now pending review.',
    kycStatus: user.kycStatus,
    kycFullName: user.kycFullName,
    kycSubmittedAt: user.kycSubmittedAt,
  });
});

// @desc    Check own KYC status
// @route   GET /api/kyc/status
// @access  Private
router.get('/status', protect, async (req, res) => {
  // Users can see their own status, but deliberately cannot retrieve the
  // document itself — per requirement, document access is admin-only.
  return res.json({
    kycStatus: req.user.kycStatus,
    kycFullName: req.user.kycFullName,
    kycSubmittedAt: req.user.kycSubmittedAt,
    kycRejectionNote: req.user.kycRejectionNote,
    hasDocument: Boolean(req.user.kycDocument),
  });
});

module.exports = router;
module.exports.resolveStoredFile = resolveStoredFile;
