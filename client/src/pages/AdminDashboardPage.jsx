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
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
} from '@mui/material';
import {
  People as PeopleIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  AdminPanelSettings as AdminIcon,
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  ThumbUp as ThumbUpIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminDashboardPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalInstructors: 0,
    totalAdmins: 0,
    totalQuizzes: 0,
    pendingApprovals: 0,
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [pendingInstructors, setPendingInstructors] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState(null);
  const [instructors, setInstructors] = useState([]);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [instructorToEdit, setInstructorToEdit] = useState(null);
  const [newLimit, setNewLimit] = useState(25);
  const [quizzes, setQuizzes] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadDashboardData();
    if (tabValue === 3) {
      loadInstructors();
    }
    if (tabValue === 4) {
      loadQuizzes();
    }
  }, [tabValue]);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [usersRes, pendingRes, quizzesRes] = await Promise.all([
        fetch('http://localhost:5000/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/users/pending-instructors', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/quizzes', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const users = await usersRes.json();
      const pending = await pendingRes.json();
      const quizzes = await quizzesRes.json();

      const totalUsers = users.length;
      const totalStudents = users.filter(u => u.role === 'student').length;
      const totalInstructors = users.filter(u => u.role === 'instructor').length;
      const totalAdmins = users.filter(u => u.role === 'admin').length;

      setStats({
        totalUsers,
        totalStudents,
        totalInstructors,
        totalAdmins,
        totalQuizzes: quizzes.length,
        pendingApprovals: pending.length,
      });
      setRecentUsers(users.slice(0, 5).map(u => ({
        id: u._id,
        name: `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || u.username,
        role: u.role,
        email: u.email,
        joined: new Date(u.createdAt).toLocaleDateString(),
        isSuspended: u.isSuspended
      })));
      setPendingInstructors(pending.map(u => ({
        id: u._id,
        name: `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || u.username,
        email: u.email,
        applied: new Date(u.createdAt).toLocaleDateString()
      })));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleManageUsers = () => {
    navigate('/admin/users');
  };

  const handleApproveInstructor = async (instructorId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/users/approve-instructor/${instructorId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      // Reload data
      loadDashboardData();
    } catch (error) {
      console.error('Error approving instructor:', error);
    }
  };

  const handleViewReports = () => {
    navigate('/admin/reports');
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        alert('User deleted successfully');
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        loadDashboardData();
      } else {
        const errorData = await response.json();
        alert(`Error deleting user: ${errorData.message || 'Unknown error'}`);
        setDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user: Network error');
      setDeleteDialogOpen(false);
    }
  };

  const handleSuspendUser = (user) => {
    setUserToSuspend(user);
    setSuspendDialogOpen(true);
  };

  const handleConfirmSuspend = async () => {
    if (!userToSuspend) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/suspend/${userToSuspend.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'User status updated successfully');
        setSuspendDialogOpen(false);
        setUserToSuspend(null);
        loadDashboardData();
      } else {
        const errorData = await response.json();
        alert(`Error updating user: ${errorData.message || 'Unknown error'}`);
        setSuspendDialogOpen(false);
      }
    } catch (error) {
      console.error('Error suspending user:', error);
      alert('Error updating user: Network error');
      setSuspendDialogOpen(false);
    }
  };

  const loadInstructors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/instructors', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const instructorsData = await response.json();
        setInstructors(instructorsData.map(inst => ({
          id: inst._id,
          name: `${inst.profile?.firstName || ''} ${inst.profile?.lastName || ''}`.trim() || inst.username,
          email: inst.email,
          studentLimit: inst.studentLimit || 25,
          currentStudents: inst.currentStudents || 0
        })));
      }
    } catch (error) {
      console.error('Error loading instructors:', error);
    }
  };

  const loadQuizzes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/quizzes', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const quizzesData = await response.json();
        setQuizzes(quizzesData.map(quiz => ({
          id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          createdBy: quiz.createdBy,
          createdAt: new Date(quiz.createdAt).toLocaleDateString(),
          likes: quiz.likes || 0
        })));
      }
    } catch (error) {
      console.error('Error loading quizzes:', error);
    }
  };

  const handleLike = async (quizId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/quizzes/${quizId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        // Reload quizzes to update likes count
        loadQuizzes();
      } else {
        console.error('Error liking quiz');
      }
    } catch (error) {
      console.error('Error liking quiz:', error);
    }
  };

  const handleEditLimit = (instructor) => {
    setInstructorToEdit(instructor);
    setNewLimit(instructor.studentLimit);
    setLimitDialogOpen(true);
  };

  const handleConfirmLimitUpdate = async () => {
    if (!instructorToEdit) return;

    if (newLimit < 1 || newLimit > 50) {
      alert('Student limit must be between 1 and 50');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/instructor-limit/${instructorToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ studentLimit: newLimit })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'Student limit updated successfully');
        setLimitDialogOpen(false);
        setInstructorToEdit(null);
        loadInstructors();
      } else {
        const errorData = await response.json();
        alert(`Error updating limit: ${errorData.message || 'Unknown error'}`);
        setLimitDialogOpen(false);
      }
    } catch (error) {
      console.error('Error updating limit:', error);
      alert('Error updating limit: Network error');
      setLimitDialogOpen(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.profile?.firstName || user?.username || 'Admin'}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          System administration and user management dashboard.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon color="primary" />
                <Typography variant="h6" sx={{ ml: 1, fontSize: '0.9rem' }}>
                  Total Users
                </Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {stats.totalUsers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SchoolIcon color="success" />
                <Typography variant="h6" sx={{ ml: 1, fontSize: '0.9rem' }}>
                  Students
                </Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {stats.totalStudents}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssignmentIcon color="info" />
                <Typography variant="h6" sx={{ ml: 1, fontSize: '0.9rem' }}>
                  Instructors
                </Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {stats.totalInstructors}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AdminIcon color="secondary" />
                <Typography variant="h6" sx={{ ml: 1, fontSize: '0.9rem' }}>
                  Admins
                </Typography>
              </Box>
              <Typography variant="h4" color="secondary.main">
                {stats.totalAdmins}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon color="warning" />
                <Typography variant="h6" sx={{ ml: 1, fontSize: '0.9rem' }}>
                  Quizzes
                </Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {stats.totalQuizzes}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonAddIcon color="error" />
                <Typography variant="h6" sx={{ ml: 1, fontSize: '0.9rem' }}>
                  Pending
                </Typography>
              </Box>
              <Typography variant="h4" color="error.main">
                {stats.pendingApprovals}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="admin tabs">
                <Tab label="Recent Users" />
                <Tab label="Pending Approvals" />
                <Tab label="System Overview" />
                <Tab label="Instructor Management" />
                <Tab label="Quiz Management" />
              </Tabs>
            </Box>

            {tabValue === 0 && (
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Recent User Registrations</Typography>
                  <Button variant="outlined" size="small" onClick={handleManageUsers}>
                    Manage All Users
                  </Button>
                </Box>
                <List>
                  {recentUsers.map((user) => (
                    <React.Fragment key={user.id}>
                      <ListItem
                        secondaryAction={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={user.role}
                              size="small"
                              color={user.role === 'student' ? 'primary' : user.role === 'instructor' ? 'info' : 'secondary'}
                            />
                            <Button onClick={(e) => { e.stopPropagation(); handleSuspendUser(user); }} variant="outlined" color={user.isSuspended ? "success" : "error"} startIcon={user.isSuspended ? <CheckCircleIcon /> : <BlockIcon />}>
                              {user.isSuspended ? 'Unblock' : 'Block'}
                            </Button>
                            <IconButton edge="end" onClick={(e) => { e.stopPropagation(); handleDeleteUser(user); }}>
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {user.name.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={user.name}
                          secondary={`${user.email} • Joined: ${user.joined}`}
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            )}

            {tabValue === 1 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Pending Instructor Approvals
                </Typography>
                <List>
                  {pendingInstructors.map((instructor) => (
                    <React.Fragment key={instructor.id}>
                      <ListItem
                        secondaryAction={
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleApproveInstructor(instructor.id)}
                          >
                            Approve
                          </Button>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'info.main' }}>
                            {instructor.name.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={instructor.name}
                          secondary={`${instructor.email} • Applied: ${instructor.applied}`}
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            )}

            {tabValue === 2 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  System Overview
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<TrendingUpIcon />}
                      onClick={handleViewReports}
                      sx={{ justifyContent: 'flex-start', p: 2 }}
                    >
                      View System Reports
                    </Button>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<PeopleIcon />}
                      onClick={handleManageUsers}
                      sx={{ justifyContent: 'flex-start', p: 2 }}
                    >
                      User Management
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            )}

            {tabValue === 3 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Instructor Management
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Manage instructor student limits and view their current student counts.
                </Typography>
                <List>
                  {instructors.map((instructor) => (
                    <React.Fragment key={instructor.id}>
                      <ListItem
                        secondaryAction={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={`${instructor.currentStudents}/${instructor.studentLimit} students`}
                              size="small"
                              color={instructor.currentStudents >= instructor.studentLimit ? 'error' : 'success'}
                            />
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => handleEditLimit(instructor)}
                            >
                              Edit Limit
                            </Button>
                          </Box>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'info.main' }}>
                            {instructor.name.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={instructor.name}
                          secondary={instructor.email}
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            )}

            {tabValue === 4 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Quiz Management
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  View and manage quizzes in the system.
                </Typography>
                <List>
                  {quizzes.map((quiz) => (
                    <React.Fragment key={quiz.id}>
                      <ListItem
                        secondaryAction={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={`${quiz.likes} likes`}
                              size="small"
                              color="primary"
                              icon={<ThumbUpIcon />}
                            />
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<ThumbUpIcon />}
                              onClick={() => handleLike(quiz.id)}
                            >
                              Like
                            </Button>
                          </Box>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'warning.main' }}>
                            {quiz.title.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={quiz.title}
                          secondary={`${quiz.description} • Created: ${quiz.createdAt}`}
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={suspendDialogOpen} onClose={() => setSuspendDialogOpen(false)}>
        <DialogTitle>{userToSuspend?.isSuspended ? 'Unsuspend' : 'Suspend'} User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {userToSuspend?.isSuspended ? 'unsuspend' : 'suspend'} {userToSuspend?.name}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmSuspend} color={userToSuspend?.isSuspended ? 'success' : 'warning'}>
            {userToSuspend?.isSuspended ? 'Unsuspend' : 'Suspend'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={limitDialogOpen} onClose={() => setLimitDialogOpen(false)}>
        <DialogTitle>Edit Student Limit</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Set the maximum number of students for {instructorToEdit?.name}.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Student Limit"
            type="number"
            fullWidth
            variant="outlined"
            value={newLimit}
            onChange={(e) => {
              const val = e.target.value;
              const num = parseInt(val);
              if (!isNaN(num) && num >= 1 && num <= 50) {
                setNewLimit(num);
              } else if (val === '') {
                setNewLimit(25);
              }
            }}
            inputProps={{ min: 1, max: 50 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLimitDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmLimitUpdate} variant="contained">
            Update Limit
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboardPage;
