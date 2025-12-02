const express = require('express');
const router = express.Router();
const multer = require('multer');
const documentController = require('../controllers/documentController');
const auth = require('../middleware/auth');

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.post('/upload', auth, upload.single('file'), documentController.uploadDocument);
router.get('/', auth, documentController.getUserDocuments);
router.delete('/purge', auth, documentController.purgeAllData);
router.delete('/:id', auth, documentController.deleteDocument);
router.post('/podcast', auth, documentController.generatePodcast);

module.exports = router;
