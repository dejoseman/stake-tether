const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user._id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPEG/JPG/PNG/WEBP) and PDFs are allowed'));
  }
});

// @desc    Upload KYC document
// @route   POST /api/kyc/upload
// @access  Private
router.post('/upload', protect, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'Please upload a document' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Save relative path and KYC metadata
    user.kycDocument = `/uploads/${req.file.filename}`;
    user.kycStatus = 'pending';
    user.kycSubmittedAt = new Date();
    user.kycRejectionNote = '';

    // Save full name if provided
    if (req.body.fullName) {
      user.kycFullName = req.body.fullName;
    }

    await user.save();

    res.json({ msg: 'KYC Document uploaded successfully. It is now pending review.', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: error.message || 'Server Error' });
  }
});

module.exports = router;
