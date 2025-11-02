import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  VideoLibrary as VideoLibraryIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
  Audiotrack as AudiotrackIcon,
  Link as LinkIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuiz } from '../context/QuizContext';
import InstructorBrowser from '../components/common/InstructorBrowser';
import { printQuizResults } from '../utils/printResults';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const StudentDashboardPage = () => {
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [pendingQuizzes, setPendingQuizzes] = useState([]);
  const [submittedQuizzes, setSubmittedQuizzes] = useState([]);
  const [completedQuizIds, setCompletedQuizIds] = useState(new Set());
  const [receivedContent, setReceivedContent] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    completedQuizzes: 0,
    averageScore: 0,
    totalTime: 0,
  });
  const [contentProgress, setContentProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { getUserQuizzes, getQuizStats, getAvailableQuizzes, getPendingQuizzes, getSubmittedQuizzes } = useQuiz();

  useEffect(() => {
    loadDashboardData();

    // Set up polling to refresh dashboard data every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000); // 30 seconds

    // Listen for quiz submission events to refresh immediately
    const handleQuizSubmitted = () => {
      loadDashboardData();
    };

    window.addEventListener('quizSubmitted', handleQuizSubmitted);

    return () => {
      clearInterval(interval);
      window.removeEventListener('quizSubmitted', handleQuizSubmitted);
    };
  }, [location, getUserQuizzes, getQuizStats, getAvailableQuizzes, getPendingQuizzes, getSubmittedQuizzes, loadDashboardData]);

  const fetchReceivedContent = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/content/assigned`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching received content:', error);
      return [];
    }
  };

  const fetchSentRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/connections/sent-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching sent requests:', error);
      return [];
    }
  };

  const fetchContentProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/content/progress`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching content progress:', error);
      return [];
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [quizzes, statsData, available, pending, submitted, content, progress, sentReqs] = await Promise.all([
        getUserQuizzes(),
        getQuizStats(),
        getAvailableQuizzes(),
        getPendingQuizzes(),
        getSubmittedQuizzes(),
        fetchReceivedContent(),
        fetchContentProgress(),
        fetchSentRequests(),
      ]);
      setRecentQuizzes(quizzes);
      setStats(statsData);
      setAvailableQuizzes(available);
      setPendingQuizzes(pending);
      setSubmittedQuizzes(submitted);
      setCompletedQuizIds(new Set(submitted.map(s => s.quiz._id.toString())));
      setReceivedContent(content);
      setContentProgress(progress);
      setSentRequests(sentReqs);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeQuiz = (quizId) => {
    navigate(`/quiz/${quizId}`);
  };

  const handleBrowseQuizzes = () => {
    navigate('/quizzes');
  };

  const handleViewContent = (contentId) => {
    navigate(`/content/${contentId}`);
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getContentIcon = (type) => {
    switch (type) {
      case 'video': return <VideoLibraryIcon />;
      case 'document': return <DescriptionIcon />;
      case 'image': return <ImageIcon />;
      case 'audio': return <AudiotrackIcon />;
      case 'link': return <LinkIcon />;
      default: return <DescriptionIcon />;
    }
  };

  const getContentTypeLabel = (type) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handleCancelRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/connections/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh sent requests
      const updatedRequests = await fetchSentRequests();
      setSentRequests(updatedRequests);
    } catch (error) {
      console.error('Error canceling request:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.profile?.firstName || user?.username || 'Student'}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Ready to learn? Take a quiz or review your progress.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssignmentIcon color="primary" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Total Quizzes
                </Typography>
              </Box>
              <Typography variant="h3" color="primary">
                {stats.totalQuizzes}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon color="success" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Completed
                </Typography>
              </Box>
              <Typography variant="h3" color="success.main">
                {stats.completedQuizzes}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SchoolIcon color="info" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Avg Score
                </Typography>
              </Box>
              <Typography variant="h3" color="info.main">
                {stats.averageScore}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PlayArrowIcon color="secondary" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Study Time
                </Typography>
              </Box>
              <Typography variant="h3" color="secondary.main">
                {formatTime(user?.totalStudyTime || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Available Quizzes */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Available Quizzes</Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={handleBrowseQuizzes}
              >
                Browse All
              </Button>
            </Box>
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              <List>
                {availableQuizzes.length > 0 ? (
                  availableQuizzes.map((quiz) => {
                    const isCompleted = completedQuizIds.has(quiz._id);
                    return (
                      <React.Fragment key={quiz._id}>
                        <ListItem
                          secondaryAction={
<Button
  variant="contained"
  size="small"
  startIcon={<PlayArrowIcon />}
                            onClick={() => isCompleted ? navigate(`/quiz/${quiz._id}/results`) : handleTakeQuiz(quiz._id)}
>
  {isCompleted ? 'View Results' : 'Take Quiz'}
</Button>
                          }
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {quiz.title.charAt(0)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {quiz.title}
                                {isCompleted && <Chip label="Completed" color="success" size="small" />}
                              </Box>
                            }
                            secondary={`${quiz.questions?.length || 0} questions • ${quiz.timeLimit || 'No limit'}`}
                          />
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    );
                  })
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No quizzes available at the moment
                  </Typography>
                )}
              </List>
            </Box>
          </Paper>
        </Grid>

        {/* Pending Quizzes */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Pending Quizzes</Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={handleBrowseQuizzes}
              >
                View All
              </Button>
            </Box>
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              <List>
                {pendingQuizzes.length > 0 ? (
                  pendingQuizzes.map((quiz) => (
                    <React.Fragment key={quiz._id}>
                      <ListItem
                        secondaryAction={
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<PlayArrowIcon />}
                            onClick={() => handleTakeQuiz(quiz._id)}
                          >
                            Waiting for Review
                          </Button>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'warning.main' }}>
                            {quiz.title.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={quiz.title}
                          secondary={`${quiz.questions?.length || 0} questions • ${quiz.timeLimit || 'No limit'}`}
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No pending quizzes
                  </Typography>
                )}
              </List>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Recent Activity</Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/profile')}
              >
                View Profile
              </Button>
            </Box>
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              <List>
                {recentQuizzes.length > 0 ? (
                  recentQuizzes.map((quiz) => (
                    <React.Fragment key={quiz._id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'success.main' }}>
                            {quiz.title.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={quiz.title}
                          secondary={`Score: ${quiz.score || 'Not completed'} • ${new Date(quiz.createdAt).toLocaleDateString()}`}
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No recent quiz activity
                  </Typography>
                )}
              </List>
            </Box>
          </Paper>
        </Grid>

        {/* Submitted Quizzes */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Submitted Quizzes</Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/profile')}
              >
                View All
              </Button>
            </Box>
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              <List>
                {submittedQuizzes.length > 0 ? (
                  submittedQuizzes.map((submission) => (
                    <React.Fragment key={submission._id}>
                      <ListItem
                        secondaryAction={
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<PrintIcon />}
                              onClick={() => printQuizResults(submission.quiz, submission, user)}
                            >
                              Print
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => navigate(`/quiz-review/${submission.quiz._id}`)}
                            >
                              View Quiz
                            </Button>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => navigate(`/quiz/${submission.quiz._id}/results`)}
                            >
                              View Results
                            </Button>
                          </Box>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'info.main' }}>
                            {submission.quiz.title.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          sx={{ maxWidth: '50%' }}
                          primary={submission.quiz.title}
                          secondary={`Score: ${submission.percentage}% • ${new Date(submission.submittedAt).toLocaleDateString()}`}
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No submitted quizzes yet
                  </Typography>
                )}
              </List>
            </Box>
          </Paper>
        </Grid>

        {/* Received Content */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Received Content</Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/content')}
              >
                View All
              </Button>
            </Box>
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              <List>
                {receivedContent.length > 0 ? (
                  receivedContent.map((content) => (
                    <React.Fragment key={content._id}>
                      <ListItem
                        secondaryAction={
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={getContentIcon(content.type)}
                            onClick={() => handleViewContent(content._id)}
                          >
                            View
                          </Button>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            {getContentIcon(content.type)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={content.title}
                          secondary={`${getContentTypeLabel(content.type)} • From ${content.instructor?.profile?.firstName || content.instructor?.username} • ${new Date(content.createdAt).toLocaleDateString()}`}
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No content received from instructors yet
                  </Typography>
                )}
              </List>
            </Box>
          </Paper>
        </Grid>

        {/* My Connection Requests */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              My Connection Requests
            </Typography>
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              <List>
                {sentRequests.length > 0 ? (
                  sentRequests.map((request) => (
                    <React.Fragment key={request._id}>
                      <ListItem
                        secondaryAction={
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            onClick={() => handleCancelRequest(request._id)}
                          >
                            Cancel
                          </Button>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'warning.main' }}>
                            <PeopleIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`Request to ${request.receiver?.profile?.firstName || request.receiver?.username}`}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Sent on {new Date(request.createdAt).toLocaleDateString()} • Status: Pending
                              </Typography>
                              {request.message && (
                                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                                  "{request.message}"
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No pending connection requests
                  </Typography>
                )}
              </List>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Instructor Browser Section */}
      <Box sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <PeopleIcon sx={{ mr: 1 }} />
            <Typography variant="h5">
              Connect with Instructors
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Browse available instructors and send connection requests to access their quizzes and content.
          </Typography>
          <InstructorBrowser />
        </Paper>
      </Box>
    </Container>
  );
};

export default StudentDashboardPage;
