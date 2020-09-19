'use strict';

/**
 * chaincode constants
 */

/**
 * asset types
 */
exports.COURSE_TYPE = 'course';
exports.GRADE_TYPE = 'grade';

/**
 * attributes
 */
exports.ROLE_ATTRIBUTE = 'app_role';
exports.ENROLLMENT_ID_ATTRIBUTE = 'hf.EnrollmentID';

/**
 * user roles
 */
exports.STUDENT_ROLE = 'student';
exports.TEACHER_ROLE = 'teacher';
exports.SECRETARIAT_ROLE = 'secretariat';

/**
 * composite keys
 */
exports.STUDENT_COURSE_KEY = 'student~course';
