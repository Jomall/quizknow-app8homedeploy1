import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { QuizProvider } from './context/QuizContext';
import { ModalProvider } from './context/ModalContext';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import InstructorDashboardPage from './pages/InstructorDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CreateQuizPage from './pages/CreateQuizPage';
import CreateContentPage from './pages/CreateContentPage';
import ContentViewPage from './pages/ContentViewPage';
import ManageAssignmentsPage from './pages/ManageAssignmentsPage';
import StudentsPage from './pages/StudentsPage';
import QuizListPage from './pages/QuizListPage';
import QuizSessionPage from './pages/QuizSessionPage';
import QuizResultsPage from './pages/QuizResultsPage';
import ProfilePage from './pages/ProfilePage';
import QuizReviewPage from './pages/QuizReviewPage';
import QuizSubmissionReview from './components/quiz/QuizSubmissionReview';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <ModalProvider>
      <AuthProvider>
        <QuizProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Layout>
              <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/create-quiz" element={
                <ProtectedRoute>
                  <CreateQuizPage />
                </ProtectedRoute>
              } />
              <Route path="/quiz-creator/:quizId" element={
                <ProtectedRoute>
                  <CreateQuizPage />
                </ProtectedRoute>
              } />
              <Route path="/create-content" element={
                <ProtectedRoute>
                  <CreateContentPage />
                </ProtectedRoute>
              } />
              <Route path="/content/:contentId" element={
                <ProtectedRoute>
                  <ContentViewPage />
                </ProtectedRoute>
              } />
              <Route path="/manage-assignments" element={
                <ProtectedRoute>
                  <ManageAssignmentsPage />
                </ProtectedRoute>
              } />
              <Route path="/students" element={
                <ProtectedRoute>
                  <StudentsPage />
                </ProtectedRoute>
              } />
              <Route path="/quizzes" element={<QuizListPage />} />
              <Route path="/quiz/:quizId" element={<QuizSessionPage />} />
              <Route path="/quiz/:quizId/results/:sessionId?" element={<QuizResultsPage />} />
              <Route path="/quiz-review/:quizId" element={<QuizReviewPage />} />
              <Route path="/quiz/:quizId/submission/:sessionId/review" element={
                <ProtectedRoute>
                  <QuizSubmissionReview />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              <Route path="/student-dashboard" element={
                <ProtectedRoute>
                  <StudentDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/instructor-dashboard" element={
                <ProtectedRoute>
                  <InstructorDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/admin-dashboard" element={
                <ProtectedRoute>
                  <AdminDashboardPage />
                </ProtectedRoute>
              } />
              </Routes>
            </Layout>
          </Router>
        </QuizProvider>
      </AuthProvider>
    </ModalProvider>
  );
}

export default App;
