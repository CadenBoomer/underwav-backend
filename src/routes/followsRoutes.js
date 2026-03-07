const express = require('express');
const router = express.Router();

const auth = require('../middleware/authMiddleware');
const followsController = require('../controllers/followsController');

console.log('Follows routes loaded');

//Follow a user
router.post('/follow/:userId', auth, followsController.follow)

//Unfollow a user
router.delete('/unfollow/:userId', auth, followsController.unfollow)

//Get followers
router.get('/followers', auth, followsController.getFollowers)

//Get following
router.get('/following', auth, followsController.getFollowing)


router.get('/followers/:userId', followsController.getFollowersByUserId);
router.get('/following/:userId', followsController.getFollowingByUserId);

module.exports = router;