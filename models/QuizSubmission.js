const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  answer: mongoose.Schema.Types.Mixed,
  isCorrect: Boolean,
  pointsEarned: Number
});

const quizSubmissionSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuizSession'
  },
  attemptNumber: {
    type: Number,
    default: 1
  },
  answers: [answerSchema],
  score: {
    type: Number,
    default: 0
  },
  maxScore: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date
  },
  timeSpent: {
    type: Number, // in minutes
    default: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  reviewedAt: {
    type: Date
  }
});

quizSubmissionSchema.pre('save', function(next) {
  if (this.isCompleted && !this.submittedAt) {
    this.submittedAt = new Date();
    this.timeSpent = Math.round((this.submittedAt - this.startedAt) / 60000);
  }
  
  if (this.maxScore > 0) {
    this.percentage = Math.round((this.score / this.maxScore) * 100);
  }
  
  next();
});

module.exports = mongoose.model('QuizSubmission', quizSubmissionSchema);
