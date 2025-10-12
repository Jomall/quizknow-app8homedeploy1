const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['multiple-choice', 'short-answer', 'select', 'fill-in', 'essay', 'true-false', 'matching', 'ordering', 'fill-in-the-blank', 'select-all'],
    required: true
  },
  question: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    default: 'general'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  tags: [String],
  options: [{
    text: String,
    isCorrect: Boolean,
    explanation: String
  }],
  correctAnswer: mongoose.Schema.Types.Mixed,
  correctAnswers: [mongoose.Schema.Types.Mixed], // for multiple correct answers
  points: {
    type: Number,
    default: 1
  },
  order: {
    type: Number,
    default: 0
  },
  media: {
    image: String,
    video: String,
    audio: String,
    document: String
  },
  hints: [String],
  explanation: String,
  timeLimit: {
    type: Number, // in seconds
    default: 0
  }
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  instructions: String,
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  parentQuiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  },
  category: {
    type: String,
    default: 'general'
  },
  tags: [String],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'mixed'],
    default: 'mixed'
  },
  students: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    submittedAt: Date,
    dueDate: Date
  }],
  questions: [questionSchema],
  settings: {
    timeLimit: {
      type: Number, // in minutes
      default: 60
    },
    maxAttempts: {
      type: Number,
      default: 1
    },
    allowRetakes: {
      type: Boolean,
      default: false
    },
    maxRetakeAttempts: {
      type: Number,
      default: 0
    },
    randomizeQuestions: {
      type: Boolean,
      default: false
    },
    randomizeOptions: {
      type: Boolean,
      default: false
    },
    showCorrectAnswers: {
      type: Boolean,
      default: true
    },
    showScore: {
      type: Boolean,
      default: true
    },
    allowReview: {
      type: Boolean,
      default: true
    },
    passingScore: {
      type: Number,
      default: 70
    },
    certificateEnabled: {
      type: Boolean,
      default: false
    },
    requireManualReview: {
      type: Boolean,
      default: false
    }
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isLive: {
    type: Boolean,
    default: false
  },
  liveSettings: {
    startTime: Date,
    endTime: Date,
    maxParticipants: Number,
    allowLateJoin: {
      type: Boolean,
      default: false
    }
  },
  analytics: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    averageTime: {
      type: Number,
      default: 0
    }
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
quizSchema.index({ instructor: 1 });
quizSchema.index({ category: 1 });
quizSchema.index({ tags: 1 });
quizSchema.index({ difficulty: 1 });
quizSchema.index({ isPublished: 1 });
quizSchema.index({ createdAt: -1 });

// Virtual for total points
quizSchema.virtual('totalPoints').get(function() {
  if (!this.questions || !Array.isArray(this.questions)) return 0;
  return this.questions.reduce((total, question) => total + (question.points || 1), 0);
});

// Virtual for question count
quizSchema.virtual('questionCount').get(function() {
  if (!this.questions || !Array.isArray(this.questions)) return 0;
  return this.questions.length;
});

// Pre-save middleware to update analytics
quizSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Transform to clean data for JSON serialization
quizSchema.methods.toJSON = function() {
  const quiz = this.toObject();
  if (quiz.questions && Array.isArray(quiz.questions)) {
    quiz.questions = quiz.questions.map(q => {
      const cleanQ = { ...q };
      if (cleanQ.options && Array.isArray(cleanQ.options)) {
        cleanQ.options = cleanQ.options.map(opt => ({
          text: opt.text || '',
          isCorrect: opt.isCorrect || false,
          explanation: opt.explanation || ''
        }));
      } else {
        cleanQ.options = [];
      }
      return cleanQ;
    });
  } else {
    quiz.questions = [];
  }
  return quiz;
};

module.exports = mongoose.model('Quiz', quizSchema);
