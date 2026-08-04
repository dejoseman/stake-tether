const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const { requireAdminPin } = require('../middleware/adminPin');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Staking = require('../models/Staking');
const StakingPlan = require('../models/StakingPlan');
const Settings = require('../models/Settings');
const sendEmail = require('../utils/sendEmail');
const bcrypt = require('bcryptjs');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', protect, admin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @desc    Get all transactions
// @route   GET /api/admin/transactions
// @access  Private/Admin
router.get('/transactions', protect, admin, async (req, res) => {
  try {
    const transactions = await Transaction.find({}).populate('user', 'username email').sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @desc    Get all stakes
// @route   GET /api/admin/stakes
// @access  Private/Admin
router.get('/stakes', protect, admin, async (req, res) => {
  try {
    const stakes = await Staking.find({}).populate('user', 'username email').sort({ createdAt: -1 });
    res.json(stakes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @desc    Set Admin Action PIN
// @route   POST /api/admin/pin
// @access  Private/Admin
router.post('/pin', protect, admin, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || pin.length < 4) {
      return res.status(400).json({ msg: 'PIN must be at least 4 characters' });
    }
    
    const user = await User.findById(req.user._id);
    const salt = await bcrypt.genSalt(10);
    user.adminPin = await bcrypt.hash(pin, salt);
    await user.save();
    
    res.json({ msg: 'Admin PIN set successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @desc    Lock or unlock a user account
// @route   PUT /api/admin/users/:id/lock
// @access  Private/Admin
router.put('/users/:id/lock', protect, admin, requireAdminPin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.isLocked = !user.isLocked;
    await user.save();

    res.json({ msg: `User ${user.isLocked ? 'locked' : 'unlocked'} successfully`, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @desc    Manually adjust a user's balance and limits
// @route   PUT /api/admin/users/:id/balance
// @access  Private/Admin
router.put('/users/:id/balance', protect, admin, requireAdminPin, async (req, res) => {
  try {
    const { balance, dailyWithdrawalLimit } = req.body;
    if (balance === undefined || balance < 0) {
      return res.status(400).json({ msg: 'Please provide a valid balance' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.balance = balance;
    if (dailyWithdrawalLimit !== undefined) {
      user.dailyWithdrawalLimit = dailyWithdrawalLimit;
    }
    await user.save();

    res.json({ msg: `Updated successfully`, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @desc    Approve a pending withdrawal
// @route   PUT /api/admin/transactions/:id/approve
// @access  Private/Admin
router.put('/transactions/:id/approve', protect, admin, requireAdminPin, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ msg: 'Transaction not found' });
    if (transaction.status !== 'pending') return res.status(400).json({ msg: 'Transaction is not pending' });

    const user = await User.findById(transaction.user);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (transaction.type === 'withdrawal') {
      // Balance was already deducted when withdrawal was requested.
      // Nothing to do here for balance.
    }

    if (transaction.type === 'deposit') {
      user.balance += transaction.amount;
      await user.save();
    }

    transaction.status = 'completed';
    await transaction.save();

    sendEmail({
      email: user.email,
      subject: `Transaction Approved: $${transaction.amount}`,
      message: `Hi ${user.username},\n\nGood news! Your ${transaction.type} request for $${transaction.amount} has been approved and processed.\n\nBest regards,\nThe Tether Staking Team`
    });

    res.json({ msg: 'Transaction approved successfully', transaction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @desc    Reject a pending transaction
// @route   PUT /api/admin/transactions/:id/reject
// @access  Private/Admin
router.put('/transactions/:id/reject', protect, admin, requireAdminPin, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ msg: 'Transaction not found' });
    if (transaction.status !== 'pending') return res.status(400).json({ msg: 'Transaction is not pending' });

    if (transaction.type === 'withdrawal') {
      const user = await User.findById(transaction.user);
      if (user) {
        user.balance += transaction.amount; // Refund the balance
        await user.save();
      }
    }

    transaction.status = 'failed';
    await transaction.save();

    const emailUser = await User.findById(transaction.user);
    if (emailUser) {
      sendEmail({
        email: emailUser.email,
        subject: `Transaction Rejected: $${transaction.amount}`,
        message: `Hi ${emailUser.username},\n\nUnfortunately, your ${transaction.type} request for $${transaction.amount} was rejected by the administration.\nIf this was a withdrawal, the funds have been returned to your balance.\n\nPlease contact support for more details.\n\nBest regards,\nThe Tether Staking Team`
      });
    }

    res.json({ msg: 'Transaction rejected', transaction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @desc    Approve KYC
// @route   PUT /api/admin/kyc/:id/approve
// @access  Private/Admin
router.put('/kyc/:id/approve', protect, admin, requireAdminPin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.kycStatus = 'verified';
    await user.save();

    sendEmail({
      email: user.email,
      subject: 'KYC Verification Approved',
      message: `Hi ${user.username},\n\nYour Identity Verification (KYC) has been successfully approved!\n\nBest regards,\nThe Tether Staking Team`
    });

    res.json({ msg: 'KYC Approved successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @desc    Reject KYC
// @route   PUT /api/admin/kyc/:id/reject
// @access  Private/Admin
router.put('/kyc/:id/reject', protect, admin, requireAdminPin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.kycStatus = 'rejected';
    user.kycRejectionNote = req.body.rejectionNote || 'Your document did not meet our verification requirements.';
    await user.save();

    sendEmail({
      email: user.email,
      subject: 'KYC Verification Rejected',
      message: `Hi ${user.username},\n\nUnfortunately, your Identity Verification (KYC) was rejected.\n\nReason: ${user.kycRejectionNote}\n\nPlease ensure the document is clear, valid, and matches your account details, then try again.\n\nBest regards,\nThe Tether Staking Team`
    });

    res.json({ msg: 'KYC Rejected successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @desc    Get all staking plans
// @route   GET /api/admin/staking-plans
// @access  Private/Admin
router.get('/staking-plans', protect, admin, async (req, res) => {
  try {
    const plans = await StakingPlan.find({});
    res.json(plans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @desc    Create a new staking plan
// @route   POST /api/admin/staking-plans
// @access  Private/Admin
router.post('/staking-plans', protect, admin, requireAdminPin, async (req, res) => {
  try {
    const plan = await StakingPlan.create(req.body);
    res.status(201).json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @desc    Update a staking plan
// @route   PUT /api/admin/staking-plans/:id
// @access  Private/Admin
router.put('/staking-plans/:id', protect, admin, requireAdminPin, async (req, res) => {
  try {
    const plan = await StakingPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @desc    Send branded email to user from admin panel
// @route   POST /api/admin/send-email
// @access  Private/Admin
router.post('/send-email', protect, admin, async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ msg: 'To, subject, and message are all required.' });
    }

    const htmlMessage = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Logo Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#007a7a,#009393);padding:32px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="https://stake-tether.onrender.com/tether-logo-white.svg" alt="Tether Staking" width="40" height="34" style="display:block;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">Tether Staking</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding:40px;">
              <div style="font-size:15px;line-height:1.7;color:#334155;white-space:pre-wrap;">${message}</div>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" />
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1a1a2e;">Tether Staking Support Team</p>
              <p style="margin:0 0 4px;font-size:13px;color:#64748b;">tethered.supportdesk@gmail.com</p>
              <a href="https://stake-tether.onrender.com" style="font-size:13px;color:#009393;text-decoration:none;">stake-tether.onrender.com</a>
            </td>
          </tr>
          <!-- Bottom Bar -->
          <tr>
            <td style="background:#009393;padding:16px 40px;text-align:center;">
              <span style="color:rgba(255,255,255,0.8);font-size:11px;">&copy; ${new Date().getFullYear()} Tether Staking. All rights reserved.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Use nodemailer directly for HTML email
    const nodemailer = require('nodemailer');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('\n--- BRANDED EMAIL MOCK (SMTP not configured) ---');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`HTML Body sent`);
      console.log('------------------------------------------------\n');
      return res.json({ msg: 'Email sent successfully (mock mode)' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `Tether Staking <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlMessage,
    });

    console.log(`Branded admin email sent to ${to}`);
    res.json({ msg: 'Email sent successfully' });
  } catch (error) {
    console.error('Failed to send admin email:', error);
    res.status(500).json({ msg: 'Failed to send email' });
  }
});

module.exports = router;
