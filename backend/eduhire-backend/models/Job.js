const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  description: { type: String, required: true },
  requirements: [String],
  skillsRequired: [String],
  location: String,
  type: { 
    type: String, 
    enum: ['full-time', 'part-time', 'internship', 'contract'],
    default: 'full-time'
  },
  salary: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'USD' }
  },
  applicationDeadline: Date,
  isActive: { type: Boolean, default: true },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requiresVerification: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);