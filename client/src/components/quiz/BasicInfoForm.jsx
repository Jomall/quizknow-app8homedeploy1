import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  FormControlLabel,
  Checkbox,
} from '@mui/material';

const BasicInfoForm = ({ quizData, onChange }) => {
  const handleChange = (field, value) => {
    onChange({ ...quizData, [field]: value });
  };

  const handleSettingsChange = (field, value) => {
    onChange({
      ...quizData,
      settings: {
        ...quizData.settings,
        [field]: value
      }
    });
  };

  const categories = [
    'General',
    'Mathematics',
    'Science',
    'History',
    'Literature',
    'Computer Science',
    'Languages',
    'Arts',
    'Other',
  ];

  const difficulties = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
  ];

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom>
        Basic Quiz Information
      </Typography>

      <TextField
        fullWidth
        label="Quiz Title"
        value={quizData.title}
        onChange={(e) => handleChange('title', e.target.value)}
        margin="normal"
        required
        helperText="Enter a descriptive title for your quiz"
      />

      <TextField
        fullWidth
        label="Description"
        value={quizData.description}
        onChange={(e) => handleChange('description', e.target.value)}
        margin="normal"
        multiline
        rows={3}
        helperText="Provide a brief description of what the quiz covers"
      />

      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <FormControl fullWidth margin="normal">
          <InputLabel>Category</InputLabel>
          <Select
            value={quizData.category}
            onChange={(e) => handleChange('category', e.target.value)}
          >
            {categories.map(category => (
              <MenuItem key={category} value={category.toLowerCase()}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth margin="normal">
          <InputLabel>Difficulty</InputLabel>
          <Select
            value={quizData.difficulty}
            onChange={(e) => handleChange('difficulty', e.target.value)}
          >
            {difficulties.map(diff => (
              <MenuItem key={diff.value} value={diff.value}>
                {diff.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TextField
        fullWidth
        label="Time Limit (minutes)"
        type="number"
        value={quizData.timeLimit}
        onChange={(e) => handleChange('timeLimit', parseInt(e.target.value) || 30)}
        margin="normal"
        inputProps={{ min: 1, max: 180 }}
        helperText="Set the time limit for completing the quiz (1-180 minutes)"
      />

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Attempt Settings
      </Typography>

      <TextField
        fullWidth
        label="Passing Score (%)"
        type="number"
        value={quizData.settings?.passingScore || 70}
        onChange={(e) => handleSettingsChange('passingScore', parseInt(e.target.value) || 70)}
        margin="normal"
        inputProps={{ min: 0, max: 100 }}
        helperText="Set the minimum score required to pass the quiz (0-100%)"
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={quizData.settings?.allowMultipleAttempts || false}
            onChange={(e) => handleSettingsChange('allowMultipleAttempts', e.target.checked)}
          />
        }
        label="Allow students to retake this quiz"
      />

      {quizData.settings?.allowMultipleAttempts && (
        <TextField
          fullWidth
          label="Maximum Retake Attempts"
          type="number"
          value={quizData.settings?.maxRetakeAttempts || 0}
          onChange={(e) => handleSettingsChange('maxRetakeAttempts', parseInt(e.target.value) || 0)}
          margin="normal"
          inputProps={{ min: 0, max: 10 }}
          helperText="Set the maximum number of retake attempts allowed (0 for unlimited)"
        />
      )}
    </Box>
  );
};

export default BasicInfoForm;
