const express = require('express');
const router = express.Router();

const auth = require('../middleware/authMiddleware');
const commentsController = require('../controllers/commentsController');

console.log('Comments routes loaded');

//This routing is for posting a comment
router.post('/:mediaId', auth, commentsController.createComment)

// This is for getting comments
router.get('/:mediaId', commentsController.getComments)

//This is for deleting a comment
router.delete('/:mediaId/:commentId', auth, commentsController.deleteComment)

//This is for editing a comment
router.patch('/:commentId', auth, commentsController.editComment)

router.post('/:commentId/like', auth, commentsController.likeComment);
router.delete('/:commentId/like', auth, commentsController.unlikeComment);

module.exports = router;