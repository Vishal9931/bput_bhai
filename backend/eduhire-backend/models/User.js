const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'employer'], default: 'student' },
  skills: [{
    skill: String,
    level: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    completedDate: Date
  }],
  coins: { type: Number, default: 0 },
  completedCourses: [{
    courseId: mongoose.Schema.Types.ObjectId,
    completedAt: Date,
    score: Number
  }]
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);