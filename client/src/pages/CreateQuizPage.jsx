import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Paper,
  Snackbar,
  Alert,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuiz } from '../context/QuizContext';
import BasicInfoForm from '../components/quiz/BasicInfoForm';
import QuestionList from '../components/quiz/QuestionList';
import QuizPreview from '../components/quiz/QuizPreview';
import StudentSelector from '../components/common/StudentSelector';

const steps = ['Basic Info', 'Add Questions', 'Select Students', 'Preview & Publish'];

const CreateQuizPage = () => {
  const { quizId } = useParams(); // For editing existing quiz
  const [activeStep, setActiveStep] = useState(0);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: 'medium',
    timeLimit: 30,
    questions: [],
    settings: {
      randomizeQuestions: false,
      showCorrectAnswers: true,
      allowMultipleAttempts: true,
      passingScore: 70,
    },
  });
  const navigate = useNavigate();
  const { createQuiz, getQuiz } = useQuiz();
  const isEditing = !!quizId;

  useEffect(() => {
    if (isEditing) {
      loadQuizData();
    }
  }, [quizId]);

  const loadQuizData = async () => {
    try {
      setLoading(true);
      const quiz = await getQuiz(quizId);
      // Transform server data to client format
      const clientQuizData = {
        title: quiz.title,
        description: quiz.description || '',
        category: quiz.category || '',
        difficulty: mapDifficultyReverse(quiz.difficulty),
        timeLimit: quiz.settings?.timeLimit || 30,
        questions: quiz.questions.map(q => {
          const question = {
            type: q.type,
            question: q.question,
            description: q.description || '',
            category: q.category || 'general',
            difficulty: q.difficulty || 'medium',
            tags: q.tags || [],
            points: q.points || 1,
            order: q.order || 0,
            media: q.media || {},
            hints: q.hints || [],
            explanation: q.explanation || '',
            timeLimit: q.timeLimit || 0,
          };

          if (q.type === 'multiple-choice') {
            question.options = q.options.map(opt => opt.text);
            question.correctAnswer = q.options.find(opt => opt.isCorrect)?.text;
          } else if (q.type === 'select-all') {
            question.options = q.options.map(opt => opt.text);
            question.correctAnswer = q.options.filter(opt => opt.isCorrect).map(opt => opt.text);
          } else if (q.type === 'matching') {
            question.options = q.options.map(opt => opt.text);
            question.correctAnswer = q.options.map(opt => opt.explanation);
          } else if (q.type === 'ordering') {
            question.options = q.options.map(opt => opt.text);
            question.correctAnswer = q.options.map(opt => opt.text); // Ordering is the correct order
          } else {
            question.correctAnswer = q.correctAnswer;
          }

          return question;
        }),
        settings: {
          randomizeQuestions: quiz.settings?.randomizeQuestions || false,
          showCorrectAnswers: quiz.settings?.showCorrectAnswers || true,
          allowMultipleAttempts: (quiz.settings?.maxAttempts || 1) > 1,
          passingScore: quiz.settings?.passingScore || 70,
        },
      };
      setQuizData(clientQuizData);
    } catch (error) {
      console.error('Error loading quiz:', error);
      setError('Failed to load quiz data');
    } finally {
      setLoading(false);
    }
  };

  const mapDifficultyReverse = (serverDifficulty) => {
    const difficultyMap = {
      'beginner': 'easy',
      'intermediate': 'medium',
      'advanced': 'hard',
    };
    return difficultyMap[serverDifficulty] || 'medium';
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleQuizDataChange = (newData) => {
    setQuizData({ ...quizData, ...newData });
  };

  const handleQuestionsChange = (questions) => {
    setQuizData({ ...quizData, questions });
  };

  const handleStudentSelectionChange = (students) => {
    setSelectedStudents(students);
  };

  const handlePublish = async () => {
    try {
      // Transform quizData to match server expectations
      const transformedQuizData = {
        ...quizData,
        difficulty: mapDifficulty(quizData.difficulty),
        settings: {
          timeLimit: quizData.timeLimit,
          maxAttempts: quizData.settings.allowMultipleAttempts ? 10 : 1,
          randomizeQuestions: quizData.settings.randomizeQuestions,
          randomizeOptions: false, // default
          showCorrectAnswers: quizData.settings.showCorrectAnswers,
          showScore: true, // default
          allowReview: true, // default
          passingScore: quizData.settings.passingScore,
          certificateEnabled: false, // default
        },
        isPublished: true,
        ...(isEditing && { parentQuiz: quizId }),
        questions: quizData.questions.map(q => {
          const { isRequired, ...cleanQuestion } = q;
          // Ensure options is an array or remove it
          if (cleanQuestion.options && !Array.isArray(cleanQuestion.options)) {
            delete cleanQuestion.options;
          }
          if (q.type === 'multiple-choice') {
            return {
              ...cleanQuestion,
              options: (q.options || []).map(option => ({
                text: option,
                isCorrect: option === q.correctAnswer,
                explanation: ''
              }))
            };
          } else if (q.type === 'select-all') {
            return {
              ...cleanQuestion,
              options: (q.options || []).map(option => ({
                text: option,
                isCorrect: Array.isArray(q.correctAnswer) && q.correctAnswer.includes(option),
                explanation: ''
              }))
            };
          } else if (q.type === 'matching') {
            // For matching, options are terms, correctAnswer are definitions
            return {
              ...cleanQuestion,
              options: (q.options || []).map((term, index) => ({
                text: term,
                isCorrect: true, // All terms are correct in matching
                explanation: q.correctAnswer[index] || ''
              }))
            };
          } else if (q.type === 'ordering') {
            return {
              ...cleanQuestion,
              options: (q.options || []).map(option => ({
                text: option,
                isCorrect: true, // All items are correct in ordering
                explanation: ''
              }))
            };
          } else {
            // For question types that don't use options, remove the options field
            const { options, ...questionWithoutOptions } = cleanQuestion;
            return questionWithoutOptions;
          }
        })
      };
      // Remove timeLimit from root level
      delete transformedQuizData.timeLimit;

      // Create quiz first
      const createdQuiz = await createQuiz(transformedQuizData);

      // If students are selected, assign them to the quiz
      if (selectedStudents.length > 0) {
        await assignQuizToStudents(createdQuiz._id, selectedStudents);
      }

      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating quiz:', error);
      setError(error.response?.data?.message || 'Failed to create quiz. Please try again.');
    }
  };

  const mapDifficulty = (clientDifficulty) => {
    const difficultyMap = {
      'easy': 'beginner',
      'medium': 'intermediate',
      'hard': 'advanced',
    };
    return difficultyMap[clientDifficulty] || 'mixed';
  };

  const assignQuizToStudents = async (quizId, studentIds) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/quizzes/${quizId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ studentIds })
      });
    } catch (error) {
      console.error('Error assigning quiz to students:', error);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <BasicInfoForm
            quizData={quizData}
            onChange={handleQuizDataChange}
          />
        );
      case 1:
        return (
          <QuestionList
            questions={quizData.questions}
            onChange={handleQuestionsChange}
          />
        );
      case 2:
        return (
          <StudentSelector
            selectedStudents={selectedStudents}
            onSelectionChange={handleStudentSelectionChange}
            label="Select Students to Assign Quiz"
          />
        );
      case 3:
        return (
          <QuizPreview
            quizData={quizData}
            selectedStudents={selectedStudents}
            onPublish={handlePublish}
          />
        );
      default:
        return 'Unknown step';
    }
  };

  const isStepValid = (step) => {
    switch (step) {
      case 0:
        return quizData.title.trim() !== '';
      case 1:
        return quizData.questions.length > 0;
      case 2:
        return true; // Student selection is optional
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {isEditing ? 'Edit Quiz' : 'Create New Quiz'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {isEditing ? 'Modify the quiz details and questions. A new version will be created without affecting existing submissions.' : 'Build an engaging quiz for your students in just a few steps.'}
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mt: 2, mb: 1 }}>
          {getStepContent(activeStep)}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
          <Button
            color="inherit"
            disabled={activeStep === 0}
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            Back
          </Button>
          <Box sx={{ flex: '1 1 auto' }} />
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handlePublish}
              disabled={!isStepValid(activeStep)}
            >
              Publish Quiz
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!isStepValid(activeStep)}
            >
              Next
            </Button>
          )}
        </Box>
      </Paper>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CreateQuizPage;
