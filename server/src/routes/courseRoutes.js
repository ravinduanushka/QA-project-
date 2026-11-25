const express = require('express');
const router = express.Router();
const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  uploadLearningPathPdf,
  getLearningPathPdf,
  uploadAssignmentPdf,
  getAssignmentPdf,
  submitAssignmentProgress,
  getAdminAssignmentStats,
  getStudentSubmissions,
} = require('../controllers/courseController');

const { protect, authorize } = require('../middlewares/authMiddleware');
const { conditionalUpload } = require('../middlewares/uploadMiddleware');

// PDF upload & view routes for Learning Paths and Assignments
// Supports both multipart/form-data via multer and base64 JSON payloads
// SEC-03 fix: only an admin can upload PDFs (auth runs before the file is parsed)
router.post('/learning-path-pdf', protect, authorize('admin'), conditionalUpload('file'), uploadLearningPathPdf);
router.get('/learning-path-pdf/:pathId', getLearningPathPdf);
router.post('/assignment-pdf', protect, authorize('admin'), conditionalUpload('file'), uploadAssignmentPdf);
router.get('/assignment-pdf/:assignmentId', getAssignmentPdf);

// Assignment submission and admin statistics routes
router.post('/assignment-submit', submitAssignmentProgress);
// SEC-04 fix: every student's marks are admin-only
router.get('/admin-assignment-stats', protect, authorize('admin'), getAdminAssignmentStats);
router.get('/student-submissions', getStudentSubmissions);

router.get('/', getCourses);
router.get('/:id', getCourseById);

// SEC-02 / DEF-05 fix: same roles as course update and delete
router.post('/', protect, authorize('instructor', 'admin'), createCourse);

router.put('/:id', protect, authorize('instructor', 'admin'), updateCourse);
router.delete('/:id', protect, authorize('instructor', 'admin'), deleteCourse);

module.exports = router;
