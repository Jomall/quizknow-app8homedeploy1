import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as WrongIcon,
  ArrowBack as BackIcon,
  Print as PrintIcon,
  AccessTime as TimeIcon,
  Score as ScoreIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useQuiz } from '../context/QuizContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { printQuizResults } from '../utils/printResults';

const QuizReviewPage = () => {
  const { quizId, sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getQuizResults } = useQuiz();

  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studyTime, setStudyTime] = useState(0);

  useEffect(() => {
    loadReviewData();
  }, [quizId, sessionId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setStudyTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadReviewData = async () => {
    try {
      setLoading(true);

      const results = await getQuizResults(quizId, sessionId);

      setSession(results.session);
      setQuiz(results.quiz);
    } catch (error) {
      console.error('Error loading review data:', error);
      setError(error.message || 'Failed to load quiz review');
    } finally {
      setLoading(false);
    }
  };

  const getAnswerStatus = (questionId) => {
    const answer = session?.answers.find(a => a.questionId === questionId);
    if (!answer) return 'not-answered';

    return answer.isCorrect ? 'correct' : 'incorrect';
  };

  const getUserAnswer = (questionId) => {
    const answer = session?.answers.find(a => a.questionId === questionId);
    return answer?.answer || null;
  };

  const getAnswerText = (question, answer) => {
    if (!answer || answer === null || answer === undefined) {
      return 'Not answered';
    }

    switch (question.type) {
      case 'multiple-choice':
      case 'true-false':
        if (question.options && question.options[answer]) {
          return question.options[answer].text;
        }
        return answer.toString();

      case 'select-all':
        if (Array.isArray(answer)) {
          return answer.map(index => {
            if (question.options && question.options[index]) {
              return question.options[index].text;
            }
            return index.toString();
          }).join(', ');
        }
        return answer.toString();

      default:
        return answer.toString();
    }
  };

  const getCorrectAnswerText = (question) => {
    switch (question.type) {
      case 'multiple-choice':
        if (question.options) {
          const correctIndex = question.options.findIndex(opt => opt.isCorrect);
          return correctIndex >= 0 ? question.options[correctIndex].text : 'N/A';
        }
        break;

      case 'true-false':
        return question.correctAnswer ? 'True' : 'False';

      case 'select-all':
        if (question.options) {
          const correctOptions = question.options
            .filter(opt => opt.isCorrect)
            .map(opt => opt.text);
          return correctOptions.join(', ');
        }
        break;

      default:
        return question.correctAnswer || 'N/A';
    }
    return 'N/A';
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes} min`;
  };

  const formatStudyTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button
            variant="contained"
            startIcon={<BackIcon />}
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Container>
    );
  }

  if (!session || !quiz) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="info">Quiz review not found</Alert>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button
            variant="contained"
            startIcon={<BackIcon />}
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Container>
    );
  }

  const correctAnswers = session.answers.filter(a => a.isCorrect).length;
  const totalQuestions = quiz.questions.length;
  const score = session.percentage || 0;
  const passingScore = quiz.settings?.passingScore || 70;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate(`/quiz/${quizId}/results`)}
            sx={{ mr: 2 }}
          >
            Back to Results
          </Button>
          <Typography variant="h4" sx={{ flex: 1 }}>
            Quiz Review
          </Typography>
        </Box>

        {/* Score Summary */}
        <Grid container spacing={4} sx={{ mt: 2, mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Overall Score
              </Typography>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <Typography variant="h2" color={score >= passingScore ? 'success.main' : 'error.main'}>
                  {score}%
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {correctAnswers} out of {totalQuestions} questions correct
              </Typography>
              <Chip
                label={score >= passingScore ? 'Passed' : 'Failed'}
                color={score >= passingScore ? 'success' : 'error'}
                sx={{ mt: 1 }}
              />
            </Paper>
          </Grid>

          {/* Time & Stats */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Quiz Statistics
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimeIcon color="primary" />
                  <Typography>
                    Time Spent: {formatTime(session.timeSpent)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimeIcon color="secondary" />
                  <Typography>
                    Study Time: {formatStudyTime(studyTime)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScoreIcon color="primary" />
                  <Typography>
                    Passing Score: {passingScore}%
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckIcon color="success" />
                  <Typography>
                    Correct Answers: {correctAnswers}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WrongIcon color="error" />
                  <Typography>
                    Incorrect Answers: {totalQuestions - correctAnswers}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Question Breakdown */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Question Breakdown
          </Typography>
          <List>
            {quiz.questions.map((question, index) => {
              const answer = session.answers.find(a => a.questionId === question._id.toString());
              const isCorrect = answer?.isCorrect || false;
              const hasAnswer = answer && answer.answer !== null && answer.answer !== undefined;

              return (
                <React.Fragment key={question._id}>
                  <ListItem
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: 2,
                      py: 3,
                    }}
                  >
                    <ListItemIcon>
                      {hasAnswer ? (
                        isCorrect ? (
                          <CheckIcon color="success" />
                        ) : (
                          <WrongIcon color="error" />
                        )
                      ) : (
                        <WrongIcon color="warning" />
                      )}
                    </ListItemIcon>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        Question {index + 1} ({question.points || 1} point{question.points !== 1 ? 's' : ''})
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {question.question}
                      </Typography>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Your Answer:
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          {getAnswerText(question, answer?.answer)}
                        </Typography>
                      </Box>

                      {!isCorrect && hasAnswer && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Correct Answer:
                          </Typography>
                          <Typography variant="body1">
                            {getCorrectAnswerText(question)}
                          </Typography>
                        </Box>
                      )}

                      {question.explanation && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                          <Typography variant="body2" fontWeight="bold" gutterBottom>
                            Explanation:
                          </Typography>
                          <Typography variant="body2">
                            {question.explanation}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </ListItem>
                  {index < quiz.questions.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        </Paper>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => printQuizResults(quiz, session, user)}
          >
            Print Quiz
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate(`/quiz/${quizId}/results`)}
          >
            Back to Results
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default QuizReviewPage;
