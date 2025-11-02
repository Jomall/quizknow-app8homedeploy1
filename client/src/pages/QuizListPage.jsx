import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Pagination,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import QuizList from '../components/quiz/QuizList';
import LoadingSpinner from '../components/common/LoadingSpinner';

const QuizListPage = () => {
  const [quizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: 'all',
    difficulty: 'all',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
  });
  const navigate = useNavigate();
  const { getAllQuizzes } = useQuiz();

  const categories = [
    'Mathematics',
    'Science',
    'History',
    'Geography',
    'Literature',
    'Computer Science',
    'Languages',
    'Art',
    'Music',
    'General Knowledge',
  ];

  const difficulties = ['Easy', 'Medium', 'Hard'];

  useEffect(() => {
    loadQuizzes();
  }, [filters, pagination.page, loadQuizzes]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const response = await getAllQuizzes({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });
      setQuizzes(response.quizzes);
      setFilteredQuizzes(response.quizzes);
      setPagination({
        ...pagination,
        total: response.total,
      });
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters({
      ...filters,
      [filterName]: value,
    });
    setPagination({ ...pagination, page: 1 });
  };

  const handlePageChange = (event, value) => {
    setPagination({ ...pagination, page: value });
  };

  const handleQuizSelect = (quiz) => {
    navigate(`/quiz/${quiz._id}`);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Browse Quizzes
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Discover and take quizzes created by educators worldwide.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={filters.category}
              label="Category"
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <MenuItem value="all">All Categories</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Difficulty</InputLabel>
            <Select
              value={filters.difficulty}
              label="Difficulty"
              onChange={(e) => handleFilterChange('difficulty', e.target.value)}
            >
              <MenuItem value="all">All Levels</MenuItem>
              {difficulties.map((difficulty) => (
                <MenuItem key={difficulty} value={difficulty.toLowerCase()}>
                  {difficulty}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Search quizzes..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </Grid>
      </Grid>

      {filteredQuizzes.length > 0 ? (
        <>
          <QuizList
            quizzes={filteredQuizzes}
            onQuizSelect={handleQuizSelect}
          />
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={Math.ceil(pagination.total / pagination.limit)}
              page={pagination.page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        </>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No quizzes found matching your criteria.
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default QuizListPage;
