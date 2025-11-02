const express = require('express');
const Course = require('../models/Course');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find().select('title description category difficulty rewardCoins');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single course with topics
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get specific topic
router.get('/:courseId/topics/:topicId', async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const topic = course.topics.id(req.params.topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    res.json(topic);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit quiz attempt (ADAPTIVE LEARNING LOGIC)
router.post('/:courseId/topics/:topicId/quiz', auth, async (req, res) => {
  try {
    const { answers, currentVideoStyle } = req.body;
    const { courseId, topicId } = req.params;
    const userId = req.user.id;

    const course = await Course.findById(courseId);
    const topic = course.topics.id(topicId);
    
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    // Calculate score
    let correct = 0;
    answers.forEach((answer, index) => {
      if (answer === topic.quizzes[index].correctAnswer) {
        correct++;
      }
    });
    
    const score = (correct / topic.quizzes.length) * 100;
    const passed = score >= 80;

    // Adaptive learning logic
    let nextVideoStyle = null;
    let message = 'Congratulations! You passed! 🎉';

    if (!passed) {
      const user = await User.findById(userId);
      
      // Track attempts for this topic
      const attemptKey = `attempts.${courseId}.${topicId}`;
      const attempts = user.attempts?.[courseId]?.[topicId] || 0;
      
      // Cycle through video styles
      const styles = ['visual', 'practical', 'theoretical'];
      const currentStyleIndex = styles.indexOf(currentVideoStyle);
      nextVideoStyle = styles[(currentStyleIndex + 1) % styles.length];
      
      // Update attempts
      if (!user.attempts) user.attempts = {};
      if (!user.attempts[courseId]) user.attempts[courseId] = {};
      user.attempts[courseId][topicId] = attempts + 1;
      
      await user.save();
      
      message = `Let's try a different teaching style! (${nextVideoStyle})`;
    }

    res.json({
      passed,
      score: Math.round(score),
      correct,
      total: topic.quizzes.length,
      nextVideoStyle,
      message
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Complete topic
router.post('/:courseId/topics/:topicId/complete', auth, async (req, res) => {
  try {
    const { courseId, topicId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    
    // Mark topic as completed
    if (!user.completedTopics) user.completedTopics = [];
    
    const existingCompletion = user.completedTopics.find(
      ct => ct.courseId.toString() === courseId && ct.topicId.toString() === topicId
    );

    if (!existingCompletion) {
      user.completedTopics.push({
        courseId,
        topicId,
        completedAt: new Date()
      });
      
      // Award some coins for topic completion
      user.coins += 10;
      await user.save();
    }

    res.json({ message: 'Topic completed!', coinsEarned: 10 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Complete entire course
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    const user = await User.findById(req.user.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if already completed
    const alreadyCompleted = user.completedCourses.some(
      cc => cc.courseId.toString() === req.params.id
    );

    if (alreadyCompleted) {
      return res.status(400).json({ message: 'Course already completed' });
    }

    // Add to completed courses
    user.completedCourses.push({
      courseId: course._id,
      completedAt: new Date(),
      score: req.body.score || 100
    });

    // Add/update skill
    const existingSkill = user.skills.find(s => s.skill === course.category);
    if (existingSkill) {
      existingSkill.level += 1;
      existingSkill.verified = true;
      existingSkill.completedDate = new Date();
    } else {
      user.skills.push({
        skill: course.category,
        level: 1,
        verified: true,
        completedDate: new Date()
      });
    }

    // Award coins
    user.coins += course.rewardCoins;

    await user.save();

    res.json({ 
      message: 'Course completed successfully! 🎉',
      coinsEarned: course.rewardCoins,
      skill: course.category
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;