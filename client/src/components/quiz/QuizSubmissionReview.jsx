import React, { useState, useEffect, useCallback } from 'react';
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
  Avatar,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as WrongIcon,
  AccessTime as TimeIcon,
  Score as ScoreIcon,
  Person as PersonIcon,
  CheckCircleOutline as ReviewedIcon,
} from '@mui/icons-material';
import quizAPI from '../../services/quizAPI';
import LoadingSpinner from '../common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const QuizSubmissionReview = () => {
  const { quizId, sessionId } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewed, setReviewed] = useState(false);

  const loadSubmission = useCallback(async () => {
    try {
      setLoading(true);

      // Get quiz details
      const quizResponse = await quizAPI.getQuizById(quizId);
      setQuiz(quizResponse.data);

      // Get submissions to find the specific session
      const submissionsResponse = await quizAPI.getQuizSubmissions(quizId);
      const submissionData = submissionsResponse.data.find(s => s._id === sessionId);

      if (!submissionData) {
        throw new Error('Submission not found');
      }

      setSubmission(submissionData);
      // Check if already reviewed (assuming reviewedAt exists)
      setReviewed(!!submissionData.reviewedAt);
    } catch (error) {
      console.error('Error loading submission:', error);
      setError(error.message || 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  }, [quizId, sessionId]);

  useEffect(() => {
    loadSubmission();
  }, [loadSubmission]);

  const handleMarkAsReviewed = async () => {
    try {
      await quizAPI.markSubmissionReviewed(sessionId);
      setReviewed(true);
      // Reload submission to get updated data
      await loadSubmission();
    } catch (error) {
      console.error('Error marking submission as reviewed:', error);
      setError(`Failed to mark submission as reviewed: ${error.response?.data?.message || error.message}`);
    }
  };



  const calculateScore = () => {
    if (!submission) return 0;
    return submission.score;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const formatTime = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
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

  if (!submission || !quiz) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="info">Submission not found</Alert>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="contained" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </Box>
      </Container>
    );
  }

  const score = calculateScore();
  const correctAnswers = submission.answers.filter(a => a.isCorrect).length;
  const totalQuestions = quiz.questions.length;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" gutterBottom>
            Quiz Submission Review
          </Typography>
          {reviewed ? (
            <Chip
              icon={<ReviewedIcon />}
              label="Reviewed"
              color="success"
              variant="outlined"
            />
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={<ReviewedIcon />}
              onClick={handleMarkAsReviewed}
            >
              Mark as Reviewed
            </Button>
          )}
        </Box>

        {/* Student Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, justifyContent: 'center' }}>
          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="h6">
              {submission.student.profile?.firstName} {submission.student.profile?.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {submission.student.username}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={4} sx={{ mt: 2 }}>
          {/* Score Summary */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Overall Score
              </Typography>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <Typography variant="h2" color={getScoreColor(submission.percentage)}>
                  {submission.percentage}%
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {correctAnswers} out of {totalQuestions} questions correct
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Score: {score} / {submission.maxScore} points
              </Typography>
              <Chip
                label={submission.percentage >= (quiz.settings?.passingScore || 60) ? 'Passed' : 'Failed'}
                color={submission.percentage >= (quiz.settings?.passingScore || 60) ? 'success' : 'error'}
                sx={{ mt: 1 }}
              />
            </Paper>
          </Grid>

          {/* Time & Stats */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Submission Statistics
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimeIcon color="primary" />
                  <Typography>
                    Time Spent: {formatTime(submission.timeSpent)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScoreIcon color="primary" />
                  <Typography>
                    Submitted: {new Date(submission.submittedAt).toLocaleString()}
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
                  const answer = submission.answers.find(a => a.questionId === question._id);
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
                          primary={`Question ${index + 1} (${question.points || 1} point${(question.points || 1) !== 1 ? 's' : ''})`}
                          secondary={
                            <Box>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                {question.question.substring(0, 100)}...
                              </Typography>
                              <Typography variant="caption" sx={{ mr: 2 }}>
                                <strong>Student's Answer:</strong> {answer?.answer || 'Not answered'}
                              </Typography>
                              <Typography variant="caption" color={isCorrect ? 'success.main' : 'error.main'}>
                                {isCorrect ? 'Correct' : `Incorrect (Correct: ${question.correctAnswer})`}
                              </Typography>
                            </Box>
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
                variant="outlined"
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate(`/quiz/${quizId}/submissions`)}
              >
                View All Submissions
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default QuizSubmissionReview;
