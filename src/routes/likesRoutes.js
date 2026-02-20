const express = require('express');
const router = express.Router();

const auth = require('../middleware/authMiddleware');
const likesController = require('../controllers/likesController');

console.log('Likes routes loaded');

//get all media liked by logged-in user (under profile)
router.get('/profile/likes', auth, likesController.getProfileLikes);

// Like/unlike a media
// /:id/like → like a specific media ID
// auth ensures user is logged in
// Temporary console.log middleware for debugging
//Debugging
// router.post('/:id/like', (req, res, next) => {
//   console.log('POST /:id/like route hit - params:', req.params);
//   next();
// }, auth, likesController.like);

router.post('/:id/like', auth, likesController.like);

router.delete('/:id/like', auth, likesController.unlike);

// Get likes for a media(public)
router.get('/:id/likes', likesController.getLikes);


module.exports = router;


