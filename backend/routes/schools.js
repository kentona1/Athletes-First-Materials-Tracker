const express = require('express');
const router = express.Router();
const schoolsController = require('../controllers/schoolsController');

// School routes
router.get('/search', schoolsController.searchSchools.bind(schoolsController));
router.get('/lookup', schoolsController.lookupSchool.bind(schoolsController));
router.get('/conferences', schoolsController.getConferences.bind(schoolsController));

// School name mismatch detection and fixing
router.get('/mismatches', schoolsController.findMismatches.bind(schoolsController));
router.post('/mismatches/fix', schoolsController.fixSchoolMismatch.bind(schoolsController));
router.post('/mismatches/fix-multiple', schoolsController.fixMultipleMismatches.bind(schoolsController));

router.get('/:id', schoolsController.getSchool.bind(schoolsController));
router.get('/', schoolsController.getAllSchools.bind(schoolsController));
router.put('/:id', schoolsController.updateSchool.bind(schoolsController));

module.exports = router;
