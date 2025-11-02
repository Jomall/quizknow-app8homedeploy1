import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  Input,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  InsertDriveFile as FileIcon,
  VideoLibrary as VideoIcon,
  Image as ImageIcon,
  Audiotrack as AudioIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import StudentSelector from '../components/common/StudentSelector';
import axios from 'axios';

const CreateContentPage = () => {
  const [contentData, setContentData] = useState({
    title: '',
    type: '',
    url: '',
    description: '',
    tags: [],
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [currentTag, setCurrentTag] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  const contentTypes = [
    { value: 'video', label: 'Video File', icon: <VideoIcon />, accept: 'video/*' },
    { value: 'document', label: 'Document/PDF', icon: <FileIcon />, accept: '.pdf,.doc,.docx' },
    { value: 'image', label: 'Image File', icon: <ImageIcon />, accept: 'image/*' },
    { value: 'audio', label: 'Audio File', icon: <AudioIcon />, accept: 'audio/*' },
    { value: 'link', label: 'External Link', icon: <LinkIcon />, accept: '' },
  ];

  const handleInputChange = (field, value) => {
    setContentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !contentData.tags.includes(currentTag.trim())) {
      setContentData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setContentData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleStudentSelectionChange = (students) => {
    setSelectedStudents(students);
  };

  const getContentTypeInfo = (type) => {
    return contentTypes.find(ct => ct.value === type) || {};
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!contentData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!contentData.type) {
      setError('Content type is required');
      return;
    }

    // Validation based on content type
    if (contentData.type === 'link') {
      if (!contentData.url.trim()) {
        setError('URL is required for external links');
        return;
      }
    } else {
      if (!selectedFile) {
        setError('File is required for this content type');
        return;
      }
    }

    try {
      setError('');

      const formData = new FormData();
      formData.append('title', contentData.title);
      formData.append('type', contentData.type);
      formData.append('description', contentData.description);
      formData.append('tags', JSON.stringify(contentData.tags));
      formData.append('allowedStudents', JSON.stringify(selectedStudents));

      if (contentData.type === 'link') {
        formData.append('url', contentData.url);
      } else {
        formData.append('file', selectedFile);
      }

      await axios.post('/api/content/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess('Content created successfully!');

      // Reset form
      setContentData({
        title: '',
        type: '',
        url: '',
        description: '',
        tags: [],
      });
      setSelectedFile(null);
      setSelectedStudents([]);
      setCurrentTag('');

      // Navigate back to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create content');
      console.error('Error creating content:', err);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Create Content
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Share videos, documents, images, or links with your students.
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Title"
              value={contentData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Content Type</InputLabel>
              <Select
                value={contentData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                required
              >
                {contentTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {contentData.type === 'link' ? (
              <TextField
                fullWidth
                label="URL"
                value={contentData.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                required
                placeholder={
                  contentData.type === 'video' ? 'https://youtube.com/watch?v=...' :
                  contentData.type === 'document' ? 'https://drive.google.com/file/...' :
                  contentData.type === 'image' ? 'https://example.com/image.jpg' :
                  contentData.type === 'audio' ? 'https://example.com/audio.mp3' :
                  'https://example.com/link'
                }
                sx={{ mb: 2 }}
              />
            ) : (
              <Box sx={{ mb: 2 }}>
                <Input
                  type="file"
                  onChange={handleFileChange}
                  inputProps={{
                    accept: getContentTypeInfo(contentData.type).accept
                  }}
                  sx={{ display: 'none' }}
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    fullWidth
                    sx={{ height: 56 }}
                  >
                    {selectedFile ? selectedFile.name : `Upload ${getContentTypeInfo(contentData.type).label}`}
                  </Button>
                </label>
                {selectedFile && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    File size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                )}
              </Box>
            )}

            <TextField
              fullWidth
              label="Description"
              value={contentData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />

            {/* Tags Section */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Tags
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  size="small"
                  label="Add Tag"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <IconButton onClick={handleAddTag} color="primary">
                  <AddIcon />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {contentData.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    deleteIcon={<DeleteIcon />}
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          </Box>

          {/* Student Selection */}
          <StudentSelector
            selectedStudents={selectedStudents}
            onSelectionChange={handleStudentSelectionChange}
          />

          {/* Error/Success Messages */}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}

          {/* Submit Button */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              sx={{ minWidth: 120 }}
            >
              Create Content
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default CreateContentPage;
