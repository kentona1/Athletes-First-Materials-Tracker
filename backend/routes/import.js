const express = require('express');
const router = express.Router();
const multer = require('multer');
const importController = require('../controllers/importController');

// Configure multer for memory storage (file stays in memory as buffer)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Preview CSV before importing
router.post('/preview', upload.single('file'), importController.previewCSV.bind(importController));

// Import single CSV file
router.post('/players', upload.single('file'), importController.importCSV.bind(importController));

// Batch import multiple CSV files (will be processed newest to oldest)
router.post('/batch', upload.array('files', 10), importController.batchImport.bind(importController));

// Fetch ESPN photos for players missing photos
router.post('/fetch-photos', importController.fetchEspnPhotos.bind(importController));

module.exports = router;
