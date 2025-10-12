# TODO: Reset Data and Add Like Feature to Admin Dashboard

## Current Progress
- [x] 1. Clear the database (drop 'quizknow' database via reset-db.js).
- [x] 2. Run initialization scripts (create-admin-user.js) to set up initial admin.
- [x] 3. Update models/Quiz.js: Add likes field.
- [x] 4. Update routes/quizzes.js: Add POST /api/quizzes/:id/like endpoint.
- [ ] 5. Update client/src/pages/AdminDashboardPage.jsx: 
  - Fetch total quizzes for stats.
  - Add "Quizzes Management" tab.
  - Display quizzes with title, instructor, like count, and like/unlike button.
- [ ] 6. Test the application: Start servers if needed, login as admin, verify reset and like functionality.
