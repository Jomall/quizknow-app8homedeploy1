import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  PlayArrow,
  Edit,
  Delete,
  Share,
  Visibility,
  Search,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../../context/QuizContext';
import quizAPI from '../../services/quizAPI';

const QuizList = ({ userRole = 'student' }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, quiz: null });
  const navigate = useNavigate();
  const { getAvailableQuizzes, getAllQuizzes } = useQuiz();

  const loadQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      const data = userRole === 'student' ? await getAvailableQuizzes() : await getAllQuizzes();
      setQuizzes(data);
      setFilteredQuizzes(data);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  }, [userRole, getAvailableQuizzes, getAllQuizzes]);

  const filterQuizzes = useCallback(() => {
    let filtered = quizzes;

    if (searchTerm) {
      filtered = filtered.filter(quiz =>
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (subjectFilter !== 'all') {
      filtered = filtered.filter(quiz => quiz.subject === subjectFilter);
    }

    if (gradeFilter !== 'all') {
      filtered = filtered.filter(quiz => quiz.gradeLevel === gradeFilter);
    }

    setFilteredQuizzes(filtered);
  }, [quizzes, searchTerm, subjectFilter, gradeFilter]);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  useEffect(() => {
    filterQuizzes();
  }, [filterQuizzes]);

  const handleStartQuiz = (quiz) => {
    navigate(`/quiz/${quiz._id}`);
  };

  const handleEditQuiz = (quiz) => {
    navigate(`/quiz-creator/${quiz._id}`);
  };

  const handleDeleteQuiz = async () => {
    if (!deleteDialog.quiz) return;

    try {
      await quizAPI.deleteQuiz(deleteDialog.quiz._id);
      setQuizzes(prev => prev.filter(q => q._id !== deleteDialog.quiz._id));
      setDeleteDialog({ open: false, quiz: null });
    } catch (error) {
      console.error('Error deleting quiz:', error);
    }
  };

  const handleShareQuiz = (quiz) => {
    const shareUrl = `${window.location.origin}/quiz/${quiz._id}`;
    navigator.clipboard.writeText(shareUrl);
    // You could add a toast notification here
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'published': return 'success';
      case 'draft': return 'warning';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const subjects = [...new Set(quizzes.map(q => q.subject))];
  const gradeLevels = [...new Set(quizzes.map(q => q.gradeLevel))];

  if (loading) {
    return (
      <Box p={3}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        {userRole === 'teacher' ? 'My Quizzes' : 'Available Quizzes'}
      </Typography>

      <Box mb={3} display="flex" gap={2} flexWrap="wrap">
        <TextField
          placeholder="Search quizzes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1 }} />,
          }}
          variant="outlined"
          size="small"
        />

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Subject</InputLabel>
          <Select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <MenuItem value="all">All Subjects</MenuItem>
            {subjects.map(subject => (
              <MenuItem key={subject} value={subject}>{subject}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Grade</InputLabel>
          <Select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
          >
            <MenuItem value="all">All Grades</MenuItem>
            {gradeLevels.map(level => (
              <MenuItem key={level} value={level}>{level}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {filteredQuizzes.map((quiz) => (
          <Grid item xs={12} md={6} lg={4} key={quiz._id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Typography variant="h6" component="h2">
                    {quiz.title}
                  </Typography>
                  <Chip
                    label={quiz.status || 'published'}
                    size="small"
                    color={getStatusColor(quiz.status)}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" mb={2}>
                  {quiz.description}
                </Typography>

                <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                  <Chip label={quiz.subject} size="small" variant="outlined" />
                  <Chip label={quiz.gradeLevel} size="small" variant="outlined" />
                  {quiz.difficulty && (
                    <Chip
                      label={quiz.difficulty}
                      size="small"
                      color={getDifficultyColor(quiz.difficulty)}
                    />
                  )}
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    {quiz.questions?.length || 0} questions
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {quiz.timeLimit} min
                  </Typography>
                </Box>

                {userRole === 'student' && quiz.attemptCount !== undefined && (
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Attempts: {quiz.attemptCount} / {quiz.maxAttempts}
                  </Typography>
                )}

                <Box display="flex" gap={1} flexWrap="wrap">
                  {userRole === 'student' && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<PlayArrow />}
                    onClick={() => handleStartQuiz(quiz)}
                    disabled={quiz.attemptCount >= quiz.maxAttempts}
                    fullWidth
                  >
                    {quiz.attemptCount > 0 ? 'Retake Quiz' : 'Start Quiz'}
                  </Button>
                  )}

                  {userRole === 'teacher' && (
                    <>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => handleEditQuiz(quiz)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => handleStartQuiz(quiz)}
                      >
                        Preview
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Share />}
                        onClick={() => handleShareQuiz(quiz)}
                      >
                        Share
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => setDeleteDialog({ open: true, quiz })}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredQuizzes.length === 0 && (
        <Box textAlign="center" py={5}>
          <Typography variant="h6" color="text.secondary">
            No quizzes found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search or filters
          </Typography>
        </Box>
      )}

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, quiz: null })}>
        <DialogTitle>Delete Quiz</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteDialog.quiz?.title}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, quiz: null })}>
            Cancel
          </Button>
          <Button onClick={handleDeleteQuiz} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuizList;
