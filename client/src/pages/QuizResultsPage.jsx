import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as WrongIcon,
  AccessTime as TimeIcon,
  Score as ScoreIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useQuiz } from '../context/QuizContext';
import QuizResults from '../components/quiz/QuizResults';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { printQuizResults } from '../utils/printResults';

const QuizResultsPage = () => {
  const { quizId, sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getSubmittedQuizzes, getQuizResults, startQuiz, fetchQuiz } = useQuiz();

  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadResults();
  }, [quizId, sessionId]);

  const loadResults = async () => {
    try {
      setLoading(true);

      // Fetch quiz results (sessionId can be null, backend will find latest)
      const results = await getQuizResults(quizId, sessionId);
      setSession(results.session);
      setQuiz(results.quiz);
    } catch (error) {
      console.error('Error loading results:', error);
      if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to view these quiz results.');
      } else if (error.response?.status === 404) {
        setError('Quiz results not found.');
      } else if (error.response?.status === 500) {
        setError('Server error occurred while loading quiz results. Please try again later.');
      } else {
        setError(error.message || 'Failed to load quiz results. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}:${remainingMinutes.toString().padStart(2, '0')}`;
    }
    return `${remainingMinutes} min`;
  };

  const handleRetakeQuiz = async () => {
    if ((quiz.settings?.maxAttempts || 1) <= 1 && !quiz.settings?.allowRetakes) return;

    try {
      await startQuiz(quizId);
      navigate(`/quiz/${quizId}`);
    } catch (error) {
      console.error('Failed to start retake:', error);
      setError('Failed to start quiz retake. Please try again.');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="contained" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </Box>
      </Container>
    );
  }

  if (!session || !quiz) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="info">Quiz results not found</Alert>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="contained" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </Box>
      </Container>
    );
  }

  const score = session.percentage || 0;
  const correctAnswers = session.answers.filter(a => a.isCorrect).length;
  const totalQuestions = quiz.questions.length;
  const passingScore = quiz.settings?.passingScore || 70;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Quiz Results
        </Typography>

        <Grid container spacing={4} sx={{ mt: 2 }}>
          {/* Score Summary */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Overall Score
              </Typography>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <Typography variant="h2" color={getScoreColor(score)}>
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
                    Time Taken: {formatTime(session.timeSpent)}
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

          {/* Question Breakdown */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Question Breakdown
              </Typography>
              <List>
                {quiz.questions.map((question, index) => {
                  const answer = session.answers.find(a => a.questionId === question._id.toString());
                  const isCorrect = answer?.isCorrect || false;

                  return (
                    <React.Fragment key={question._id}>
                      <ListItem>
                        <ListItemIcon>
                          {isCorrect ? (
                            <CheckIcon color="success" />
                          ) : (
                            <WrongIcon color="error" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={`Question ${index + 1}`}
                          secondary={
                            <React.Fragment>
                              <Typography component="span" variant="body2" sx={{ display: 'block' }}>
                                {question.question.substring(0, 100)}...
                              </Typography>
                              <Typography component="span" variant="caption" color={isCorrect ? 'success.main' : 'error.main'} sx={{ display: 'block' }}>
                                {isCorrect ? 'Correct' : 'Incorrect'}
                              </Typography>
                            </React.Fragment>
                          }
                        />
                      </ListItem>
                      {index < quiz.questions.length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            </Paper>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={() => printQuizResults(quiz, session, user)}
              >
                Print Results
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate(`/quiz-review/${quizId}`)}
              >
                Review Answers
              </Button>
              <Button
                variant="outlined"
                onClick={handleRetakeQuiz}
                disabled={!((quiz.settings?.maxAttempts || 1) > 1 || quiz.settings?.allowRetakes)}
              >
                Retake Quiz
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/browse-quizzes')}
              >
                Browse More Quizzes
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/dashboard')}
              >
                Return to Dashboard
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default QuizResultsPage;
