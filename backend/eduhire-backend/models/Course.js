const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: String,
  description: String,
  videoUrl: String, // AWS S3 URL
  style: { type: String, enum: ['visual', 'practical', 'theoretical'], default: 'visual' },
  duration: Number,
  order: Number
});

const quizSchema = new mongoose.Schema({
  question: String,
  options: [String],
  correctAnswer: Number, // index of correct option
  explanation: String
});

const topicSchema = new mongoose.Schema({
  title: String,
  description: String,
  videos: [videoSchema], // Multiple styles of same video
  quizzes: [quizSchema],
  order: Number
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: String, // HTML, CSS, JavaScript, etc.
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  topics: [topicSchema],
  requiredScore: { type: Number, default: 80 }, // % required to pass
  rewardCoins: { type: Number, default: 100 }
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);