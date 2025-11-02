const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('completedCourses.courseId');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, skills } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, skills },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const topUsers = await User.find()
      .select('name coins skills completedCourses')
      .sort({ coins: -1 })
      .limit(10);
    
    res.json(topUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user skills
router.get('/skills', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('skills');
    res.json(user.skills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
