const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['student', 'instructor', 'admin']).withMessage('Valid role is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { firstName, lastName, email, password, role, institution, phone } = req.body;

    // Generate username from first and last name
    const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/\s+/g, '');

    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({
        message: 'Email already exists'
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        message: 'Username already exists'
      });
    }

    // Create profile object
    const profile = {
      firstName,
      lastName,
      institution,
      phone
    };

    // Create new user
    const user = new User({
      username,
      email,
      password,
      role,
      profile
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        profile: user.profile
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email or username is required' });
    }

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Find user by email or username
    const identifier = email.toLowerCase().trim();
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    // Check if account is suspended
    if (user.isSuspended) {
      return res.status(400).json({ message: 'Account suspended' });
    }

    // Check if instructor account is approved
    if (user.role === 'instructor' && !user.isApproved) {
      return res.status(400).json({ message: 'Account not approved' });
    }

    // Update login time and calculate study time
    const now = new Date();
    if (user.lastLogoutTime) {
      const sessionTime = Math.floor((now - user.lastLogoutTime) / 1000); // in seconds
      user.totalStudyTime += sessionTime;
    }
    user.lastLoginTime = now;
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        isSuspended: user.isSuspended,
        profile: user.profile,
        totalStudyTime: user.totalStudyTime
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Logout
router.post('/logout', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.lastLogoutTime = new Date();
      await user.save();
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get quiz stats for student
router.get('/users/quiz-stats', auth, async (req, res) => {
  try {
    const QuizSession = require('../models/QuizSession');
    const sessions = await QuizSession.find({ student: req.user.id });
    const totalQuizzes = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const completedQuizzes = completedSessions.length;
    const averageScore = completedSessions.length > 0 ? completedSessions.reduce((sum, s) => sum + (s.percentage || 0), 0) / completedSessions.length : 0;
    const totalTime = 0; // Time tracking not implemented
    res.json({
      totalQuizzes,
      completedQuizzes,
      averageScore,
      totalTime
    });
  } catch (error) {
    console.error('Error fetching quiz stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get stats for instructor
router.get('/users/stats', auth, async (req, res) => {
  try {
    const Quiz = require('../models/Quiz');
    const QuizSession = require('../models/QuizSession');
    const totalQuizzes = await Quiz.countDocuments({ instructor: req.user.id });
    const totalStudents = await User.countDocuments({ role: 'student' });
    const instructorQuizzes = await Quiz.find({ instructor: req.user.id }).select('_id');
    const quizIds = instructorQuizzes.map(q => q._id);
    const sessions = await QuizSession.find({ quiz: { $in: quizIds }, status: 'completed' });
    const averageScore = sessions.length > 0 ? sessions.reduce((sum, s) => sum + (s.percentage || 0), 0) / sessions.length : 0;
    const totalSessions = await QuizSession.countDocuments({ quiz: { $in: quizIds } });
    const completionRate = totalSessions > 0 ? (sessions.length / totalSessions) * 100 : 0;
    res.json({
      totalQuizzes,
      totalStudents,
      averageScore,
      completionRate
    });
  } catch (error) {
    console.error('Error fetching instructor stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
