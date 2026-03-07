const express = require('express');
const router = express.Router();

const auth = require('../middleware/authMiddleware');
const commentsController = require('../controllers/commentsController');

// Static routes FIRST
router.post('/like-status', auth, commentsController.getCommentLikeStatus);

// Comment likes - before /:mediaId/:commentId
router.post('/comment/:commentId/like', auth, commentsController.likeComment);
router.delete('/comment/:commentId/like', auth, commentsController.unlikeComment);

// Media comment routes
router.post('/:mediaId', auth, commentsController.createComment);
router.get('/:mediaId', commentsController.getComments);
router.delete('/:mediaId/:commentId', auth, commentsController.deleteComment);
router.patch('/:commentId', auth, commentsController.editComment);

module.exports = router;