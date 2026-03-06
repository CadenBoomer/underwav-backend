const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploads');
const auth = require('../middleware/authMiddleware');
const mediaController = require('../controllers/mediaController');


// Dashboard
router.get('/dashboard', auth, mediaController.dashboard);

// Public routes - MUST be before /:id
router.get('/public/recent', mediaController.getRecentPublic);
router.get('/public/trending-week', mediaController.getTrendingThisWeek);
router.get('/public/most-viewed', mediaController.getMostViewed);
router.get('/public/genre/:id', mediaController.getTracksByGenre);
router.get('/trending', mediaController.getTrendingMedia);

// Upload
router.post('/uploads', auth, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), mediaController.uploadMedia);

// Get all user media
router.get('/', auth, mediaController.getUserMedia);

// Update media
router.patch('/:id', auth, upload.fields([{ name: 'cover', maxCount: 1 }]), mediaController.updateMedia);

// Delete media
router.delete('/:id', auth, mediaController.deleteMedia);

// Protected stream - MUST be before /:id
router.get('/:id/stream', auth, mediaController.streamMedia);

// Protected download - MUST be before /:id  
router.get('/:id/download', auth, mediaController.downloadMedia);

// Get media by ID - ALWAYS LAST
router.get('/public/user/:id', mediaController.getPublicUserTracks);

router.get('/followed', auth, mediaController.getFollowedTracks);
router.get('/genre-mix', auth, mediaController.getGenreMix);


router.get('/:id', auth, mediaController.getMediaById);



module.exports = router;