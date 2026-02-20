const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploads');
const auth = require('../middleware/authMiddleware');
const mediaController = require('../controllers/mediaController');

console.log('Media routes loaded');

//Routing order matters. 
// Dashboard
router.get('/dashboard', auth, mediaController.dashboard);

// Upload
router.post('/uploads', auth, upload.single('file'), mediaController.uploadMedia);

// Get all user media
router.get('/', auth, mediaController.getUserMedia);

// Get media by ID
router.get('/:id', auth, mediaController.getMediaById);

// Delete media
router.delete('/:id', auth, mediaController.deleteMedia);

// Update media
router.patch('/:id', auth, mediaController.updateMedia);

// Protected stream
router.get('/:id/stream', auth, mediaController.streamMedia);

// Protected download
router.get('/:id/download', auth, mediaController.downloadMedia);

module.exports = router;
