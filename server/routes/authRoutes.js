const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');

// ─── Helpers ────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'mindnexus_super_secret_jwt_key_that_is_at_least_32_bytes_long_123!';

const generateToken = (id) =>
    jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });

const generateOtp = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

const createTransporter = () =>
    nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

const sendOtpEmail = async (email, name, otp, isPasswordReset = false) => {
    const transporter = createTransporter();
    const subject = isPasswordReset ? 'Your MindNexus Password Reset Code' : 'Your MindNexus Verification Code';
    const actionText = isPasswordReset ? 'reset your password' : 'verify your identity';
    
    await transporter.sendMail({
        from: `"MindNexus" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: subject,
        html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 24px; font-weight: 700; color: #38bdf8; margin: 0;">MindNexus</h1>
                <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Neural Verification Protocol</p>
            </div>
            <p style="color: #94a3b8; font-size: 15px; margin-bottom: 8px;">Hey <strong style="color:#e2e8f0">${name}</strong>,</p>
            <p style="color: #94a3b8; font-size: 14px; margin-bottom: 32px;">Use the code below to ${actionText}. It expires in <strong style="color:#e2e8f0">10 minutes</strong>.</p>
            <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 32px;">
                <span style="font-size: 48px; font-weight: 800; letter-spacing: 16px; color: #38bdf8; font-variant-numeric: tabular-nums;">${otp}</span>
            </div>
            <p style="color: #475569; font-size: 12px; text-align: center;">If you did not request this, you can safely ignore this email.</p>
        </div>`,
    });
};

// ─── Routes ─────────────────────────────────────────────────────────────────

// @route   POST /api/auth/register
// @desc    Register user & send OTP
// @access  Public
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existing = await User.findOne({ email });
        if (existing && existing.isVerified) {
            return res.status(400).json({ message: 'An account with this email already exists.' });
        }

        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        let user;
        if (existing && !existing.isVerified) {
            // Re-use the pending account — update credentials & OTP
            existing.name = name;
            existing.password = password;
            existing.otp = otp;
            existing.otpExpiry = otpExpiry;
            user = await existing.save();
        } else {
            user = await User.create({ name, email, password, otp, otpExpiry, isVerified: false });
        }

        await sendOtpEmail(email, name, otp);

        res.status(201).json({ message: 'OTP sent to your email. Please verify.', email });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP & issue JWT
// @access  Public
router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'No account found for this email.' });
        }
        if (user.isVerified) {
            return res.status(400).json({ message: 'Account already verified.' });
        }
        if (!user.otp || user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
        }
        if (user.otpExpiry < new Date()) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        user.isVerified = true;
        user.otp = null;
        user.otpExpiry = null;
        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/auth/resend-otp
// @desc    Resend a fresh OTP
// @access  Public
router.post('/resend-otp', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'No account found for this email.' });
        }
        if (user.isVerified) {
            return res.status(400).json({ message: 'Account already verified.' });
        }

        const otp = generateOtp();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        await sendOtpEmail(email, user.name, otp);

        res.json({ message: 'New OTP sent to your email.' });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/auth/login
// @desc    Login & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }
        if (!user.isVerified) {
            return res.status(403).json({ message: 'EMAIL_NOT_VERIFIED', email });
        }
        if (!(await user.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/auth/profile
// @desc    Update user profile (name, password)
// @access  Private
router.put('/profile', async (req, res) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { name, password, oldPassword } = req.body;

        if (name) user.name = name;
        
        if (password) {
            if (!oldPassword) {
                return res.status(400).json({ message: 'Old password is required to change password.' });
            }
            const isMatch = await user.matchPassword(oldPassword);
            if (!isMatch) {
                return res.status(401).json({ message: 'Incorrect old password.' });
            }
            user.password = password;
        }

        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: error.message || 'Server Error' });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Generate OTP and send to user for password reset
// @access  Public
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'No account found for this email.' });
        }
        if (!user.isVerified) {
            return res.status(403).json({ message: 'Account is not verified.' });
        }

        const otp = generateOtp();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
        await user.save();

        await sendOtpEmail(email, user.name, otp, true);

        res.json({ message: 'Password reset OTP sent to your email.' });
    } catch (error) {
        console.error('Forgot Password error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/auth/reset-password
// @desc    Verify OTP and reset password
// @access  Public
router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'No account found for this email.' });
        }
        if (!user.otp || user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
        }
        if (user.otpExpiry < new Date()) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        user.password = newPassword;
        user.otp = null;
        user.otpExpiry = null;
        await user.save();

        res.json({ message: 'Password has been reset successfully. You can now login.' });
    } catch (error) {
        console.error('Reset Password error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
