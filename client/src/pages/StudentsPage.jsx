import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  PersonRemove as PersonRemoveIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const StudentsPage = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removeDialog, setRemoveDialog] = useState({
    open: false,
    connection: null,
  });
  const [removing, setRemoving] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/connections/my-connections`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Filter for accepted connections and get the other user (student)
      const acceptedConnections = response.data.filter(conn => conn.status === 'accepted');
      setConnections(acceptedConnections);
    } catch (err) {
      setError('Failed to load connected students');
      console.error('Error loading connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStudentFromConnection = (connection) => {
    return connection.sender._id === user.id ? connection.receiver : connection.sender;
  };

  const handleRemoveClick = (connection) => {
    setRemoveDialog({
      open: true,
      connection,
    });
  };

  const handleRemoveDialogClose = () => {
    setRemoveDialog({
      open: false,
      connection: null,
    });
  };

  const handleRemoveConfirm = async () => {
    try {
      setRemoving(true);
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/connections/${removeDialog.connection._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh connections
      await loadConnections();
      handleRemoveDialogClose();
    } catch (err) {
      console.error('Error removing connection:', err);
      setError('Failed to remove student connection');
    } finally {
      setRemoving(false);
    }
  };

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
          Manage Students
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage your connected students.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        {connections.length === 0 ? (
          <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
            No connected students found.
          </Typography>
        ) : (
          <List>
            {connections.map((connection) => {
              const student = getStudentFromConnection(connection);
              return (
                <ListItem key={connection._id}>
                  <ListItemAvatar>
                    <Avatar src={student.profile?.avatar}>
                      {student.username.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim() || student.username}
                    secondary={student.username}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label="Connected"
                      color="success"
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveClick(connection)}
                      color="error"
                    >
                      <PersonRemoveIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>

      {/* Remove Connection Dialog */}
      <Dialog
        open={removeDialog.open}
        onClose={handleRemoveDialogClose}
      >
        <DialogTitle>Remove Student Connection</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove the connection with {removeDialog.connection ? getStudentFromConnection(removeDialog.connection).username : ''}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRemoveDialogClose}>
            Cancel
          </Button>
          <Button
            onClick={handleRemoveConfirm}
            color="error"
            variant="contained"
            disabled={removing}
          >
            {removing ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudentsPage;
