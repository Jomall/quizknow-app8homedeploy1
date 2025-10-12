import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Avatar,
  Chip,
  Divider,
  Rating,
  TextField,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  VideoLibrary as VideoLibraryIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
  Audiotrack as AudiotrackIcon,
  Link as LinkIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const ContentViewPage = () => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const navigate = useNavigate();
  const { contentId } = useParams();

  const fetchContent = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_BASE_URL}/content/${contentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContent(data);

      // Mark content as viewed
      await axios.post(`${API_BASE_URL}/content/${contentId}/view`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error fetching content:', error);
      setError('Content not found or access denied');
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleMarkCompleted = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/content/${contentId}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh content to update any status if needed
      fetchContent();
    } catch (error) {
      console.error('Error marking content as completed:', error);
    }
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

  const handleDownload = async () => {
    if (content.filePath) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/content/${contentId}/download`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Download failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = content.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download error:', error);
        alert('Download failed. Please try again.');
      }
    }
  };

  const handleSubmitFeedback = async () => {
    if (feedbackRating === 0) {
      alert('Please provide a rating');
      return;
    }

    try {
      setSubmittingFeedback(true);
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/content/${contentId}/feedback`, {
        rating: feedbackRating,
        comments: feedbackComments
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedbackSubmitted(true);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography>Loading content...</Typography>
      </Container>
    );
  }

  if (error || !content) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography color="error">{error || 'Content not found'}</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
          Back to Dashboard
        </Button>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
            {getContentIcon(content.type)}
          </Avatar>
          <Box>
            <Typography variant="h4" gutterBottom>
              {content.title}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              From {content.instructor?.profile?.firstName || content.instructor?.username}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {content.description && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Description
            </Typography>
            <Typography variant="body1">
              {content.description}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Chip
            label={content.type.charAt(0).toUpperCase() + content.type.slice(1)}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Created ${new Date(content.createdAt).toLocaleDateString()}`}
            variant="outlined"
          />
        </Box>

        {content.type === 'link' && content.url && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Link
            </Typography>
            <Button
              variant="contained"
              href={content.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Link
            </Button>
          </Box>
        )}

        {content.filePath && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              File
            </Typography>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
            >
              Download {content.fileName}
            </Button>
            {content.fileSize && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Size: {(content.fileSize / 1024 / 1024).toFixed(2)} MB
              </Typography>
            )}
          </Box>
        )}

        {content.tags && content.tags.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tags
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {content.tags.map((tag, index) => (
                <Chip key={index} label={tag} size="small" />
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="contained"
            color="success"
            onClick={handleMarkCompleted}
          >
            Mark as Completed
          </Button>
        </Box>

        {/* Feedback Section */}
        <Divider sx={{ my: 3 }} />
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Provide Feedback
          </Typography>
          {feedbackSubmitted ? (
            <Alert severity="success">
              Thank you for your feedback!
            </Alert>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Rate this content and share your thoughts
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography component="legend">Rating</Typography>
                <Rating
                  name="content-rating"
                  value={feedbackRating}
                  onChange={(event, newValue) => {
                    setFeedbackRating(newValue);
                  }}
                  size="large"
                />
              </Box>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Comments (optional)"
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
                placeholder="Share your feedback about this content..."
                sx={{ mb: 2 }}
              />
              <Button
                variant="outlined"
                onClick={handleSubmitFeedback}
                disabled={submittingFeedback || feedbackRating === 0}
              >
                {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default ContentViewPage;
