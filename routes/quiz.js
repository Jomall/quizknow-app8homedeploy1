const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const QuizSession = require('../models/QuizSession');
const QuizSubmission = require('../models/QuizSubmission');
const { auth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get all quizzes with filtering and pagination
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      difficulty,
      tags,
      search,
      isPublished,
      instructor
    } = req.query;

    const query = {};

    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (tags) query.tags = { $in: tags.split(',') };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';
    if (instructor) query.instructor = instructor;

    const quizzes = await Quiz.find(query)
      .populate('instructor', 'name email')
      .select('-questions.correctAnswer -questions.correctAnswers')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Quiz.countDocuments(query);

    res.json({
      quizzes,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get quizzes created by the current user
router.get('/user', auth, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ instructor: req.user.id })
      .populate('instructor', 'name email')
      .select('-questions.correctAnswer -questions.correctAnswers')
      .sort({ createdAt: -1 });

    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get my completed quiz sessions
router.get('/my-sessions', auth, async (req, res) => {
  try {
    console.log('=== MY-SESSIONS DEBUG START ===');
    console.log('User ID:', req.user.id);

    // Find all completed sessions for the user
    console.log('Finding completed sessions...');
    const sessions = await QuizSession.find({
      student: req.user.id,
      status: 'completed'
    })
    .sort({ endTime: -1 })
    .lean(); // Use lean() for better performance

    console.log('Found sessions:', sessions.length);
    console.log('Session details:', sessions.map(s => ({
      id: s._id,
      quiz: s.quiz,
      status: s.status,
      startTime: s.startTime,
      endTime: s.endTime
    })));

    if (!sessions || sessions.length === 0) {
      console.log('No sessions found, returning empty array');
      return res.json([]);
    }

    // Get unique quiz IDs from sessions
    const quizIds = [...new Set(sessions.map(s => s.quiz).filter(id => id))];
    console.log('Unique quiz IDs:', quizIds);

    // Fetch quiz data in bulk
    console.log('Fetching quiz data...');
    const quizzes = await Quiz.find({
      _id: { $in: quizIds }
    })
    .select('title settings questionCount totalPoints')
    .lean();

    console.log('Found quizzes:', quizzes.length);
    console.log('Quiz details:', quizzes.map(q => ({
      id: q._id,
      title: q.title
    })));

    // Create a map of quiz data for quick lookup
    const quizMap = new Map();
    quizzes.forEach(quiz => {
      quizMap.set(quiz._id.toString(), quiz);
    });

    // Combine session data with quiz data
    console.log('Combining session and quiz data...');
    const populatedSessions = sessions.map(session => {
      const quizData = quizMap.get(session.quiz?.toString());
      const timeSpent = session.endTime ? Math.round((session.endTime - session.startTime) / 60000) : 0;

      console.log(`Session ${session._id}: quiz=${session.quiz}, quizData=${!!quizData}, timeSpent=${timeSpent}`);

      return {
        ...session,
        quiz: quizData || null,
        timeSpent: timeSpent // minutes
      };
    }).filter(session => session.quiz !== null); // Only include sessions with valid quiz data

    console.log(`Found ${populatedSessions.length} valid quiz sessions out of ${sessions.length} total sessions`);
    console.log('=== MY-SESSIONS DEBUG END ===');

    res.json(populatedSessions);
  } catch (error) {
    console.error('=== MY-SESSIONS ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    console.error('=== MY-SESSIONS ERROR END ===');
    res.status(500).json({
      message: 'Failed to fetch quiz sessions',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get single quiz by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('instructor', 'name email')
      .populate('students.student', 'name email');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check permissions
    const isInstructor = quiz.instructor._id.toString() === req.user.id;
    const isAssignedStudent = req.user.role === 'student' && quiz.students.some(s => s.student.toString() === req.user.id);
    const hasSubmission = req.user.role === 'student' && await QuizSubmission.findOne({ quiz: req.params.id, student: req.user.id, isCompleted: true });

    if (!isInstructor && !isAssignedStudent && !hasSubmission) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Remove correct answers if quiz is not published and user is not the instructor
    if (!quiz.isPublished && quiz.instructor._id.toString() !== req.user.id) {
      const quizWithoutAnswers = quiz.toObject();
      quizWithoutAnswers.questions = quizWithoutAnswers.questions.map(q => {
        delete q.correctAnswer;
        delete q.correctAnswers;
        return q;
      });
      return res.json(quizWithoutAnswers);
    }

    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new quiz
router.post('/', auth, [
  body('title').notEmpty().withMessage('Title is required'),
  body('questions').isArray({ min: 1 }).withMessage('At least one question is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const quiz = new Quiz({
      ...req.body,
      instructor: req.user.id
    });

    await quiz.save();
    await quiz.populate('instructor', 'name email');
    
    res.status(201).json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update quiz
router.put('/:id', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this quiz' });
    }

    Object.assign(quiz, req.body);
    await quiz.save();
    await quiz.populate('instructor', 'name email');
    
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete quiz
router.delete('/:id', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this quiz' });
    }

    await Quiz.findByIdAndDelete(req.params.id);
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Publish/unpublish quiz
router.patch('/:id/publish', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    quiz.isPublished = req.body.isPublished;
    await quiz.save();
    
    res.json({ message: `Quiz ${quiz.isPublished ? 'published' : 'unpublished'} successfully` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Assign quiz to students
router.post('/:id/assign', auth, async (req, res) => {
  try {
    const { studentIds, dueDate } = req.body;

    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Validate that the quiz has correct answers for all questions before assignment
    if (!quiz.questions || quiz.questions.length === 0) {
      return res.status(400).json({ message: 'Quiz must have questions before assignment' });
    }

    const questionsWithoutAnswers = quiz.questions.filter(q =>
      !q.correctAnswer && (!q.correctAnswers || q.correctAnswers.length === 0)
    );

    if (questionsWithoutAnswers.length > 0) {
      return res.status(400).json({
        message: 'All questions must have correct answers before the quiz can be assigned to students'
      });
    }

    const newAssignments = studentIds.map(studentId => ({
      student: studentId,
      dueDate: dueDate ? new Date(dueDate) : undefined
    }));

    quiz.students = [...quiz.students, ...newAssignments];
    await quiz.save();

    res.json({
      message: 'Quiz assigned successfully',
      assignedCount: studentIds.length,
      totalAssigned: quiz.students.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get quiz submissions for review (instructor only)
router.get('/:id/submissions', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view submissions' });
    }

    const sessions = await QuizSession.find({
      quiz: req.params.id,
      status: 'completed'
    })
      .populate('student', 'username profile.firstName profile.lastName')
      .sort({ endTime: -1 });

    const submissions = sessions.map(session => ({
      _id: session._id,
      student: session.student,
      score: session.score,
      maxScore: session.maxScore,
      percentage: Math.round((session.score / session.maxScore) * 100),
      submittedAt: session.endTime,
      timeSpent: session.endTime ? Math.round((session.endTime - session.startTime) / 60000) : 0, // minutes
      answers: session.answers
    }));

    res.json({
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        totalPoints: quiz.totalPoints
      },
      submissions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get quiz analytics
router.get('/:id/analytics', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const sessions = await QuizSession.find({ quiz: req.params.id })
      .populate('student', 'name email')
      .sort({ startTime: -1 });

    const analytics = {
      totalAttempts: quiz.analytics.totalAttempts,
      averageScore: quiz.analytics.averageScore,
      completionRate: quiz.analytics.completionRate,
      averageTime: quiz.analytics.averageTime,
      sessions: sessions.map(session => ({
        student: session.student,
        score: session.score,
        startedAt: session.startTime,
        completedAt: session.endTime,
        timeSpent: session.timeSpent,
        answers: session.answers.length
      }))
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start quiz session
router.post('/:id/start', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('instructor', 'name email');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check permissions
    const isInstructor = quiz.instructor._id.toString() === req.user.id;
    const isAssigned = quiz.students.some(s =>
      s.student.toString() === req.user.id
    );

    if (!isInstructor && !isAssigned) {
      return res.status(403).json({ message: 'Not assigned to this quiz' });
    }

    if (!quiz.isPublished && !isInstructor) {
      return res.status(403).json({ message: 'Quiz is not published' });
    }

    // Create quiz session
    const session = new QuizSession({
      quiz: req.params.id,
      student: req.user.id,
      startTime: new Date(),
      timeLimit: quiz.settings?.timeLimit || 60,
      maxScore: quiz.totalPoints || 0
    });
    await session.save();

    res.json({
      _id: session._id,
      quiz: quiz._id,
      student: req.user.id,
      startedAt: session.startTime,
      timeRemaining: (quiz.settings?.timeLimit || 60) * 60 // timeLimit in minutes
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get quiz questions for taking (without answers)
router.get('/:id/take', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('instructor', 'name email');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if student is assigned
    const isAssigned = quiz.students.some(s =>
      s.student.toString() === req.user.id
    );

    if (!isAssigned && quiz.instructor._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not assigned to this quiz' });
    }

    if (!quiz.isPublished && quiz.instructor._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Quiz is not published' });
    }

    // Create quiz session
    const session = new QuizSession({
      quiz: req.params.id,
      student: req.user.id,
      startTime: new Date()
    });
    await session.save();

    // Prepare questions without answers
    let questions = quiz.questions.map(q => {
      const question = {
        _id: q._id,
        type: q.type,
        question: q.question,
        description: q.description,
        points: q.points,
        order: q.order,
        media: q.media,
        hints: q.hints,
        options: q.options.map(opt => ({
          text: opt.text
        }))
      };
      return question;
    });

    // Randomize questions if enabled
    if (quiz.settings.randomizeQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    // Randomize options for multiple choice if enabled
    if (quiz.settings.randomizeOptions) {
      questions = questions.map(q => {
        if (q.options) {
          q.options = q.options.sort(() => Math.random() - 0.5);
        }
        return q;
      });
    }

    res.json({
      sessionId: session._id,
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        instructions: quiz.instructions,
        settings: quiz.settings,
        totalPoints: quiz.totalPoints,
        questionCount: quiz.questionCount
      },
      questions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update answer for a question in session
router.put('/:id/session/:sessionId/answer', auth, async (req, res) => {
  try {
    const { questionId, answer } = req.body;

    const session = await QuizSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ message: 'Session is not active' });
    }

    // Check if answer already exists, update it
    const existingAnswerIndex = session.answers.findIndex(a => a.questionId.toString() === questionId);
    if (existingAnswerIndex >= 0) {
      session.answers[existingAnswerIndex].answer = answer;
      session.answers[existingAnswerIndex].answeredAt = new Date();
    } else {
      session.answers.push({
        questionId,
        answer,
        answeredAt: new Date()
      });
    }

    await session.save();
    res.json({ message: 'Answer updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit quiz
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const { sessionId, answers } = req.body;

    const session = await QuizSession.findById(sessionId).populate('quiz');
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ message: 'Session is not active' });
    }

    // Update answers
    answers.forEach(({ questionId, answer }) => {
      const existingAnswerIndex = session.answers.findIndex(a => a.questionId.toString() === questionId);
      if (existingAnswerIndex >= 0) {
        session.answers[existingAnswerIndex].answer = answer;
        session.answers[existingAnswerIndex].answeredAt = new Date();
      } else {
        session.answers.push({
          questionId,
          answer,
          answeredAt: new Date()
        });
      }
    });

    // Calculate score
    let totalScore = 0;
    session.answers.forEach(ans => {
      const question = session.quiz.questions.find(q => q._id.toString() === ans.questionId.toString());
      if (question) {
        // Simple scoring - check if answer matches correct answer
        if (question.correctAnswer === ans.answer) {
          ans.isCorrect = true;
          ans.points = question.points || 1;
          totalScore += ans.points;
        } else {
          ans.isCorrect = false;
          ans.points = 0;
        }
      }
    });

    session.score = totalScore;
    session.status = 'completed';
    session.endTime = new Date();

    await session.save();

    // Create QuizSubmission record for instructor dashboard tracking
    const submission = new QuizSubmission({
      quiz: session.quiz,
      student: session.student,
      answers: session.answers.map(ans => ({
        questionId: ans.questionId,
        answer: ans.answer,
        isCorrect: ans.isCorrect,
        pointsEarned: ans.points
      })),
      score: session.score,
      maxScore: session.maxScore,
      percentage: Math.round((session.score / session.maxScore) * 100),
      startedAt: session.startTime,
      submittedAt: session.endTime,
      timeSpent: Math.round((session.endTime - session.startTime) / 60000),
      isCompleted: true
    });

    await submission.save();

    res.json({
      message: 'Quiz submitted successfully',
      score: session.score,
      maxScore: session.maxScore,
      percentage: Math.round((session.score / session.maxScore) * 100)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark quiz session as reviewed (instructor only)
router.put('/:id/session/:sessionId/review', auth, async (req, res) => {
  try {
    const session = await QuizSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    session.reviewedAt = new Date();
    await session.save();

    // Also mark the corresponding QuizSubmission as completed
    const submission = await QuizSubmission.findOne({
      quiz: req.params.id,
      student: session.student
    });

    if (submission) {
      submission.isCompleted = true;
      submission.reviewedAt = new Date();
      await submission.save();
    }

    res.json({ message: 'Session marked as reviewed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get quiz results for a specific completed session (sessionId optional)
router.get('/:id/results/:sessionId?', auth, async (req, res) => {
  try {
    let session;

    if (req.params.sessionId) {
      // Specific session requested
      session = await QuizSession.findById(req.params.sessionId)
        .populate('quiz')
        .populate('student', 'username profile.firstName profile.lastName');

      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
    } else {
      // No sessionId provided, find latest completed session for this quiz and student
      session = await QuizSession.findOne({
        quiz: req.params.id,
        student: req.user.id,
        status: 'completed'
      })
      .populate('quiz')
      .populate('student', 'username profile.firstName profile.lastName')
      .sort({ endTime: -1 });

      if (!session) {
        return res.status(404).json({ message: 'No completed session found for this quiz' });
      }
    }

    if (!session.quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if user is authorized to view this session
    const isStudent = session.student._id.toString() === req.user.id;
    const isInstructor = session.quiz.instructor.toString() === req.user.id;

    if (!isStudent && !isInstructor) {
      return res.status(403).json({ message: 'Not authorized to view these results' });
    }

    if (session.status !== 'completed') {
      return res.status(400).json({ message: 'Session is not completed yet' });
    }

    // Prepare quiz data without correct answers for students
    let quizData = session.quiz.toObject();

    // If user is a student (not instructor), remove correct answers from questions
    if (isStudent && !isInstructor) {
      quizData.questions = quizData.questions.map(q => {
        const questionWithoutAnswer = { ...q };
        delete questionWithoutAnswer.correctAnswer;
        delete questionWithoutAnswer.correctAnswers;
        return questionWithoutAnswer;
      });
    }

    // Calculate additional stats
    const timeSpent = session.endTime ? Math.round((session.endTime - session.startTime) / 60000) : 0; // minutes
    const percentage = session.maxScore > 0 ? Math.round((session.score / session.maxScore) * 100) : 0;

    const results = {
      session: {
        _id: session._id,
        student: session.student,
        score: session.score,
        maxScore: session.maxScore,
        percentage: percentage,
        startTime: session.startTime,
        endTime: session.endTime,
        timeSpent: timeSpent,
        status: session.status,
        answers: session.answers
      },
      quiz: {
        _id: quizData._id,
        title: quizData.title,
        description: quizData.description,
        instructions: quizData.instructions,
        settings: quizData.settings,
        totalPoints: quizData.totalPoints,
        questionCount: quizData.questionCount,
        questions: quizData.questions
      }
    };

    res.json(results);
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    res.status(500).json({
      message: 'Failed to fetch quiz results',
      error: error.message
    });
  }
});

module.exports = router;
