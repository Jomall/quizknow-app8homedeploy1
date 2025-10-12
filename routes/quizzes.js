const express = require('express');
const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');
const { auth, authorize, checkApproved } = require('../middleware/auth');

const router = express.Router();

// Create quiz (instructor only)
router.post('/', auth, authorize('instructor'), checkApproved, async (req, res) => {
  try {
    let version = 1;
    if (req.body.parentQuiz) {
      // Find the latest version of the parent quiz
      const latestVersion = await Quiz.findOne({ parentQuiz: req.body.parentQuiz })
        .sort({ version: -1 })
        .select('version');
      if (latestVersion) {
        version = latestVersion.version + 1;
      } else {
        // Check if parentQuiz itself exists and get its version
        const parent = await Quiz.findById(req.body.parentQuiz);
        if (parent) {
          version = parent.version + 1;
        }
      }
    }

    const quiz = new Quiz({
      ...req.body,
      instructor: req.user.id,
      version
    });

    await quiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all quizzes (public - only published)
router.get('/', async (req, res) => {
  try {
    const quizzes = await Quiz.find({ isPublished: true })
      .populate('instructor', 'username profile.firstName profile.lastName')
      .select('-questions');
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all quizzes for admin
router.get('/admin-all', auth, authorize('admin'), async (req, res) => {
  try {
    const quizzes = await Quiz.find({})
      .populate('instructor', 'username profile.firstName profile.lastName')
      .select('-questions');

    // Add likes info for admin
    const quizzesWithLikes = quizzes.map(quiz => ({
      ...quiz.toObject(),
      likesCount: quiz.likes.length,
      isLiked: quiz.likes.includes(req.user.id)
    }));

    res.json(quizzesWithLikes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get instructor's quizzes
router.get('/my-quizzes', auth, authorize('instructor'), checkApproved, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ instructor: req.user.id })
      .populate('students.student', 'username profile.firstName profile.lastName')
      .sort({ createdAt: -1 });

    // Group quizzes by parentQuiz or return all if no parent
    const groupedQuizzes = quizzes.reduce((acc, quiz) => {
      const key = quiz.parentQuiz ? quiz.parentQuiz.toString() : quiz._id.toString();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(quiz);
      return acc;
    }, {});

    // For each group, sort by version and return the latest version
    const result = Object.values(groupedQuizzes).map(group => {
      return group.sort((a, b) => b.version - a.version)[0];
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get available quizzes for student
router.get('/available', auth, authorize('student'), async (req, res) => {
  try {
    console.log('Fetching available quizzes for student:', req.user.id);
    console.log('Student role:', req.user.role);

    const quizzes = await Quiz.find({
      'students.student': req.user.id,
      isPublished: true
    })
      .populate('instructor', 'username profile.firstName profile.lastName');

    // Add attempt count for each quiz
    const quizzesWithAttempts = await Promise.all(quizzes.map(async (quiz) => {
      const attemptCount = await QuizSubmission.countDocuments({
        quiz: quiz._id,
        student: req.user.id,
        isCompleted: true
      });
      return {
        ...quiz.toObject(),
        attemptCount
      };
    }));

    console.log('Found quizzes:', quizzes.length);
    console.log('Quiz details:', quizzesWithAttempts.map(q => ({
      id: q._id,
      title: q.title,
      isPublished: q.isPublished,
      attemptCount: q.attemptCount,
      maxAttempts: q.settings?.maxAttempts || 1
    })));

    res.json(quizzesWithAttempts);
  } catch (error) {
    console.error('Error fetching available quizzes:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get pending quizzes for student (submitted but not reviewed)
router.get('/pending', auth, authorize('student'), async (req, res) => {
  try {
    // Find submissions that are not completed
    const pendingSubmissionQuizzes = await QuizSubmission.find({
      student: req.user.id,
      isCompleted: false
    }).distinct('quiz');

    const quizzes = await Quiz.find({
      _id: { $in: pendingSubmissionQuizzes },
      'students.student': req.user.id,
      isPublished: true
    })
      .populate('instructor', 'username profile.firstName profile.lastName');
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get submitted quizzes for student
router.get('/submitted', auth, authorize('student'), async (req, res) => {
  try {
    const QuizSubmission = require('../models/QuizSubmission');
    const submissions = await QuizSubmission.find({
      student: req.user.id,
      isCompleted: true
    })
      .populate('quiz', 'title instructor')
      .populate('quiz.instructor', 'username profile.firstName profile.lastName')
      .sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get quiz by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('instructor', 'username profile.firstName profile.lastName');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check permissions: instructor or assigned student
    const isInstructor = quiz.instructor._id.toString() === req.user.id;
    const isAssignedStudent = req.user.role === 'student' && quiz.students.some(s => s.student.toString() === req.user.id);

    if (!isInstructor && !isAssignedStudent) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Hide correct answers for non-instructors
    if (!isInstructor) {
      quiz.questions = quiz.questions.map(q => {
        const question = q.toObject();
        delete question.correctAnswer;
        delete question.correctAnswers;
        return question;
      });
    }

    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update quiz (instructor only)
router.put('/:id', auth, authorize('instructor'), checkApproved, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedQuiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    res.json(updatedQuiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete quiz (instructor only)
router.delete('/:id', auth, authorize('instructor'), checkApproved, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Quiz.findByIdAndDelete(req.params.id);
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Assign quiz to students (instructor only)
router.post('/:id/assign', auth, authorize('instructor'), checkApproved, async (req, res) => {
  try {
    const { studentIds } = req.body;
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Add students to quiz
    const newStudents = studentIds.map(id => ({
      student: id,
      assignedAt: new Date()
    }));

    quiz.students = [...quiz.students, ...newStudents];
    await quiz.save();

    res.json({ message: 'Quiz assigned successfully', quiz });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Publish quiz to students (instructor only)
router.post('/:id/publish', auth, authorize('instructor'), checkApproved, async (req, res) => {
  try {
    const { studentIds } = req.body;
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Set as published
    quiz.isPublished = true;

    // Add students to quiz
    const newStudents = studentIds.map(id => ({
      student: id,
      assignedAt: new Date()
    }));

    quiz.students = [...quiz.students, ...newStudents];
    await quiz.save();

    res.json({ message: 'Quiz published successfully', quiz });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Like/unlike quiz (authenticated users)
router.post('/:id/like', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const userId = req.user.id;
    const likeIndex = quiz.likes.indexOf(userId);

    if (likeIndex > -1) {
      // Unlike: remove from likes
      quiz.likes.splice(likeIndex, 1);
    } else {
      // Like: add to likes
      quiz.likes.push(userId);
    }

    await quiz.save();

    res.json({
      message: likeIndex > -1 ? 'Quiz unliked' : 'Quiz liked',
      likesCount: quiz.likes.length,
      isLiked: likeIndex === -1
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
