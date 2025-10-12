const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['student', 'instructor', 'admin'],
    required: true
  },
  profile: {
    firstName: String,
    lastName: String,
    institution: String,
    phone: String,
    avatar: String,
    bio: String
  },
  isApproved: {
    type: Boolean,
    default: function() {
      return this.role === 'student' || this.role === 'admin';
    }
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  studentLimit: {
    type: Number,
    default: function() {
      return this.role === 'instructor' ? 25 : null;
    },
    min: 1,
    max: 50,
    validate: {
      validator: function(value) {
        if (this.role === 'instructor') {
          return value >= 1 && value <= 50;
        }
        return true;
      },
      message: 'Student limit must be between 1 and 50 for instructors'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  totalStudyTime: {
    type: Number,
    default: 0
  },
  lastLoginTime: {
    type: Date,
    default: null
  },
  lastLogoutTime: {
    type: Date,
    default: null
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
