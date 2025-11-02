import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  VideoLibrary as VideoLibraryIcon,
  Image as ImageIcon,
  Description as DescriptionIcon,
  Audiotrack as AudiotrackIcon,
  Link as LinkIcon,
  PersonAdd as PersonAddIcon,
  Publish as PublishIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import StudentSelector from '../components/common/StudentSelector';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const ManageAssignmentsPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [quizzes, setQuizzes] = useState([]);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignDialog, setAssignDialog] = useState({
    open: false,
    type: null, // 'quiz' or 'content'
    item: null,
    selectedStudents: [],
  });
  const [publishDialog, setPublishDialog] = useState({
    open: false,
    item: null,
    selectedStudents: [],
  });
  const [assigning, setAssigning] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [quizzesRes, contentRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/quizzes/my-quizzes`),
        axios.get(`${API_BASE_URL}/content/my-content`)
      ]);

      setQuizzes(quizzesRes.data);
      setContent(contentRes.data);
    } catch (err) {
      setError('Failed to load assignments');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleAssignClick = (type, item) => {
    setAssignDialog({
      open: true,
      type,
      item,
      selectedStudents: type === 'quiz'
        ? item.students?.map(s => s.student._id) || []
        : item.allowedStudents || [],
    });
  };

  const handleAssignDialogClose = () => {
    setAssignDialog({
      open: false,
      type: null,
      item: null,
      selectedStudents: [],
    });
  };

  const handleStudentSelectionChange = (students) => {
    setAssignDialog(prev => ({
      ...prev,
      selectedStudents: students,
    }));
  };

  const handleAssignSubmit = async () => {
    try {
      setAssigning(true);
      const { type, item, selectedStudents } = assignDialog;

      if (type === 'quiz') {
        await axios.post(`${API_BASE_URL}/quizzes/${item._id}/assign`, {
          studentIds: selectedStudents,
        });
      } else {
        await axios.post(`${API_BASE_URL}/content/${item._id}/assign`, {
          studentIds: selectedStudents,
        });
      }

      // Refresh data
      await loadData();
      handleAssignDialogClose();
    } catch (err) {
      console.error('Error assigning:', err);
      setError('Failed to assign');
    } finally {
      setAssigning(false);
    }
  };

  const handlePublishClick = (item) => {
    setPublishDialog({
      open: true,
      item,
      selectedStudents: [],
    });
  };

  const handlePublishDialogClose = () => {
    setPublishDialog({
      open: false,
      item: null,
      selectedStudents: [],
    });
  };

  const handlePublishStudentSelectionChange = (students) => {
    setPublishDialog(prev => ({
      ...prev,
      selectedStudents: students,
    }));
  };

  const handlePublishSubmit = async () => {
    try {
      setPublishing(true);
      const { item, selectedStudents } = publishDialog;

      await axios.post(`${API_BASE_URL}/quizzes/${item._id}/publish`, {
        studentIds: selectedStudents,
      });

      // Refresh data
      await loadData();
      handlePublishDialogClose();
    } catch (err) {
      console.error('Error publishing:', err);
      setError('Failed to publish quiz');
    } finally {
      setPublishing(false);
    }
  };

  const getContentIcon = (type) => {
    switch (type) {
      case 'video': return <VideoLibraryIcon />;
      case 'image': return <ImageIcon />;
      case 'document': return <DescriptionIcon />;
      case 'audio': return <AudiotrackIcon />;
      case 'link': return <LinkIcon />;
      default: return <DescriptionIcon />;
    }
  };

  const renderQuizCard = (quiz) => (
    <Grid item xs={12} sm={6} md={4} key={quiz._id}>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <AssignmentIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" noWrap>
              {quiz.title}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={1}>
            {quiz.description}
          </Typography>
          <Box display="flex" gap={1} mb={1}>
            <Chip
              label={quiz.category || 'General'}
              size="small"
              variant="outlined"
            />
            <Chip
              label={quiz.difficulty}
              size="small"
              color={
                quiz.difficulty === 'easy' ? 'success' :
                quiz.difficulty === 'medium' ? 'warning' : 'error'
              }
            />
            <Chip
              icon={quiz.isPublished ? <CheckCircleIcon /> : <PublishIcon />}
              label={quiz.isPublished ? 'Published' : 'Draft'}
              size="small"
              color={quiz.isPublished ? 'success' : 'default'}
              variant={quiz.isPublished ? 'filled' : 'outlined'}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {quiz.students?.length || 0} students assigned
          </Typography>
        </CardContent>
        <CardActions>
          {quiz.isPublished ? (
            <Button
              size="small"
              startIcon={<PersonAddIcon />}
              onClick={() => handleAssignClick('quiz', quiz)}
            >
              Assign Students
            </Button>
          ) : (
            <Button
              size="small"
              startIcon={<PublishIcon />}
              onClick={() => handlePublishClick(quiz)}
            >
              Publish Quiz
            </Button>
          )}
        </CardActions>
      </Card>
    </Grid>
  );

  const renderContentCard = (contentItem) => (
    <Grid item xs={12} sm={6} md={4} key={contentItem._id}>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            {getContentIcon(contentItem.type)}
            <Typography variant="h6" noWrap sx={{ ml: 1 }}>
              {contentItem.title}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={1}>
            {contentItem.description}
          </Typography>
          <Box display="flex" gap={1} mb={1}>
            <Chip
              label={contentItem.type}
              size="small"
              variant="outlined"
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {contentItem.allowedStudents?.length || 0} students assigned
          </Typography>
        </CardContent>
        <CardActions>
          <Button
            size="small"
            startIcon={<PersonAddIcon />}
            onClick={() => handleAssignClick('content', contentItem)}
          >
            Assign Students
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Manage Assignments
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Assign your existing quizzes and content to connected students.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab
            label={`Quizzes (${quizzes.length})`}
            icon={<AssignmentIcon />}
            iconPosition="start"
          />
          <Tab
            label={`Content (${content.length})`}
            icon={<VideoLibraryIcon />}
            iconPosition="start"
          />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <>
              {quizzes.length === 0 ? (
                <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                  No quizzes found. Create your first quiz to get started.
                </Typography>
              ) : (
                <Grid container spacing={3}>
                  {quizzes.map(renderQuizCard)}
                </Grid>
              )}
            </>
          )}

          {activeTab === 1 && (
            <>
              {content.length === 0 ? (
                <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                  No content found. Create your first content item to get started.
                </Typography>
              ) : (
                <Grid container spacing={3}>
                  {content.map(renderContentCard)}
                </Grid>
              )}
            </>
          )}
        </Box>
      </Paper>

      {/* Assignment Dialog */}
      <Dialog
        open={assignDialog.open}
        onClose={handleAssignDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Assign {assignDialog.type === 'quiz' ? 'Quiz' : 'Content'} to Students
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Select students to assign "{assignDialog.item?.title}"
          </Typography>
          <StudentSelector
            selectedStudents={assignDialog.selectedStudents}
            onSelectionChange={handleStudentSelectionChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAssignDialogClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAssignSubmit}
            variant="contained"
            disabled={assigning}
          >
            {assigning ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog
        open={publishDialog.open}
        onClose={handlePublishDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Publish Quiz to Students
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Select students to publish "{publishDialog.item?.title}" to. This will make the quiz visible to the selected students.
          </Typography>
          <StudentSelector
            selectedStudents={publishDialog.selectedStudents}
            onSelectionChange={handlePublishStudentSelectionChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePublishDialogClose}>
            Cancel
          </Button>
          <Button
            onClick={handlePublishSubmit}
            variant="contained"
            disabled={publishing}
          >
            {publishing ? 'Publishing...' : 'Publish'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ManageAssignmentsPage;
