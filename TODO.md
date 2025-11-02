# TODO: Fix ESLint Errors in React Components

## Files to Edit
- `client/src/pages/QuizSessionPage.jsx`
- `client/src/pages/StudentDashboardPage.jsx`
- `client/src/pages/StudentsPage.jsx`

## Steps
1. Fix QuizSessionPage.jsx:
   - Remove unused 'user' variable from destructuring.
   - Add 'loadQuiz' to first useEffect dependency array.
   - Add 'checkCompleted' to second useEffect dependency array.

2. Fix StudentDashboardPage.jsx:
   - Remove unused imports: CardActions, LinearProgress, IconButton, Tabs, Tab, MoreVertIcon.
   - Remove unused variables: contentProgress, loading, error, latestSubmission.
   - Add 'loadDashboardData' to useEffect dependency array.

3. Fix StudentsPage.jsx:
   - Remove unused import: PeopleIcon.

4. Run `npm run build` to verify fixes.
