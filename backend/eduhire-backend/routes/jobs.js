const express = require('express');
const auth = require('../middleware/auth');
const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');
const router = express.Router();

// Get all jobs
router.get('/', async (req, res) => {
  try {
    const { type, search, skills } = req.query;
    let filter = { isActive: true };

    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (skills) {
      filter.skillsRequired = { $in: skills.split(',') };
    }

    const jobs = await Job.find(filter)
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 });
    
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single job
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('postedBy', 'name email');
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Apply for job
router.post('/:id/apply', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      jobId: req.params.id,
      userId: req.user.id
    });

    if (existingApplication) {
      return res.status(400).json({ message: 'Already applied for this job' });
    }

    // Check if user has required verified skills
    const user = await User.findById(req.user.id);
    const userSkills = user.skills.filter(skill => skill.verified);
    
    const skillsMatch = job.skillsRequired.map(requiredSkill => {
      const hasSkill = userSkills.some(userSkill => 
        userSkill.skill.toLowerCase() === requiredSkill.toLowerCase()
      );
      return { skill: requiredSkill, match: hasSkill };
    });

    const isVerified = skillsMatch.every(skill => skill.match) || !job.requiresVerification;

    const application = await Application.create({
      jobId: req.params.id,
      userId: req.user.id,
      coverLetter: req.body.coverLetter,
      skillsMatch,
      isVerified
    });

    res.status(201).json({
      message: 'Application submitted successfully!',
      application,
      isVerified
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user applications
router.get('/user/applications', auth, async (req, res) => {
  try {
    const applications = await Application.find({ userId: req.user.id })
      .populate('jobId')
      .sort({ createdAt: -1 });
    
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Post a new job (for employers)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'employer') {
      return res.status(403).json({ message: 'Only employers can post jobs' });
    }

    const job = await Job.create({
      ...req.body,
      postedBy: req.user.id
    });

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;