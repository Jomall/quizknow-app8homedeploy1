# TODO: Fix Retake Quiz Button Bug

## Completed Tasks
- [x] Update QuizResultsPage.jsx to use correct field name 'allowRetakes' instead of 'allowMultipleAttempts' for enabling retake button
- [x] Add permission check in quiz.js to allow students with submissions to access quiz data for results
- [x] Test the fix by creating a quiz with retakes enabled, assigning to student, and verifying button appears on student results page

# TODO: Add Passing Score to Quiz Creation

## Tasks
- [x] Update BasicInfoForm.jsx to add a TextField for passingScore (number input, 0-100%)
- [x] Change 'allowRetakes' to 'allowMultipleAttempts' in BasicInfoForm.jsx for consistency with CreateQuizPage.jsx
- [x] Ensure form validation for passingScore (required, min 0, max 100)
- [ ] Test the quiz creation form to confirm passingScore can be set by the instructor

# TODO: Fix Quiz Submission 500 Error

## Tasks
- [x] Fix missing timeLimit in QuizSession creation in submissions.js
- [x] Fix points calculation in QuizSession answers
- [ ] Test quiz submission to ensure no 500 error occurs

# TODO: Fix Retake Quiz Button Not Appearing

## Tasks
- [x] Update QuizResultsPage.jsx to check maxAttempts > 1 instead of allowMultipleAttempts for enabling retake button
- [x] Add attempt limit check in quiz.js start endpoint to prevent starting quiz when maxAttempts reached
- [x] Update QuizSessionPage.jsx to check completed attempts count against maxAttempts instead of just presence of any completed session
- [x] Allow instructors to take their own quizzes multiple times without attempt limits
- [ ] Test that retake button appears when maxAttempts > 1 and allows retaking the quiz
