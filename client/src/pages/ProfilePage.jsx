import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Chip,
  Divider,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Person as PersonIcon,
  Quiz as QuizIcon,
  EmojiEvents as TrophyIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useQuiz } from '../context/QuizContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getUserQuizSessions, getUserQuizzes } = useQuiz();
  
  const [activeTab, setActiveTab] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [createdQuizzes, setCreatedQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    averageScore: 0,
    totalTime: 0,
    bestCategory: '',
  });

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      const [sessionsData, quizzesData] = await Promise.all([
        getUserQuizSessions(),
        getUserQuizzes(),
      ]);
      
      setSessions(sessionsData);
      setCreatedQuizzes(quizzesData);
      
      // Calculate statistics
      calculateStats(sessionsData);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (sessions) => {
    if (sessions.length === 0) return;
    
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const totalScore = completedSessions.reduce((sum, s) => sum + s.score, 0);
    const totalTime = completedSessions.reduce((sum, s) => sum + s.timeSpent, 0);
    
    // Find best category
    const categoryScores = {};
    completedSessions.forEach(session => {
      const category = session.quiz?.category || 'General';
      if (!categoryScores[category]) {
        categoryScores[category] = { total: 0, count: 0 };
      }
      categoryScores[category].total += session.score;
      categoryScores[category].count += 1;
    });
    
    let bestCategory = '';
    let bestAvg = 0;
    Object.entries(categoryScores).forEach(([category, data]) => {
      const avg = data.total / data.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestCategory = category;
      }
    });
    
    setStats({
      totalQuizzes: completedSessions.length,
      averageScore: Math.round(totalScore / completedSessions.length) || 0,
      totalTime: Math.round(totalTime / 60), // Convert to minutes
      bestCategory,
    });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Profile Header */}
      <Paper sx={{ p: 4, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar
              sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}
            >
              <PersonIcon sx={{ fontSize: 40 }} />
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h4" gutterBottom>
              {user.username}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {user.email}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Chip
                icon={<TrophyIcon />}
                label={`Level ${user.level || 1}`}
                color="primary"
                size="small"
              />
            </Box>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              onClick={() => navigate('/profile/edit')}
            >
              Edit Profile
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <QuizIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Quizzes Taken</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {stats.totalQuizzes}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Average Score</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {stats.averageScore}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TimeIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Time</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {stats.totalTime} min
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrophyIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Best Category</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {stats.bestCategory || 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Quiz History" />
          <Tab label="Created Quizzes" />
          <Tab label="Achievements" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <List>
              {sessions.length === 0 ? (
                <Typography variant="body1" color="text.secondary" align="center">
                  No quiz sessions yet. Start taking quizzes to see your history!
                </Typography>
              ) : (
                sessions.map((session) => (
                  <React.Fragment key={session._id}>
                    <ListItem
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 2,
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6">
                          {session.quiz?.title || 'Quiz'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(session.createdAt)} • {formatTime(session.timeSpent)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Chip
                          label={`${session.score || 0}%`}
                          color={session.score >= 70 ? 'success' : 'error'}
                          size="small"
                        />
                        <Button
                          size="small"
                          onClick={() => navigate(`/quiz/${session.quiz?._id}/results`)}
                        >
                          View Results
                        </Button>
                      </Box>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))
              )}
            </List>
          )}

          {activeTab === 1 && (
            <List>
              {createdQuizzes.length === 0 ? (
                <Typography variant="body1" color="text.secondary" align="center">
                  You haven't created any quizzes yet.
                </Typography>
              ) : (
                createdQuizzes.map((quiz) => (
                  <React.Fragment key={quiz._id}>
                    <ListItem
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 2,
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6">{quiz.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {quiz.questions.length} questions • {quiz.category}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          onClick={() => navigate(`/quiz/${quiz._id}/edit`)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          onClick={() => navigate(`/quiz/${quiz._id}/analytics`)}
                        >
                          Analytics
                        </Button>
                      </Box>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))
              )}
            </List>
          )}

          {activeTab === 2 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <TrophyIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Achievements Coming Soon!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Earn badges and achievements as you complete quizzes and reach milestones.
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default ProfilePage;
