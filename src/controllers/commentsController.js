const pool = require('../config/db');


// The SQL Query
// SELECT c.id, c.content, c.created_at, u.username
// Means:
// Return only these columns
// From:
// comments table (alias c)
// users table (alias u)
// Why not SELECT *?
// Because:
// Faster
// Cleaner
// Better API control


//Table Aliases
// FROM comments c
// JOIN users u

// Aliases:
// comments → c
// users → u

// Now you write:
// c.content
// u.username

// Instead of:
// comments.content
// users.username

// Cleaner and standard SQL practice.



//) JOIN (Important)
// JOIN users u ON c.user_id = u.id

// This connects the tables.

// Meaning:
// For each comment, find the user whose id matches comment.user_id

// Why?
// Because comments table only has:
// user_id

// But you want:
// username

// So MySQL combines the tables.

// Visual:

// comments
// id	user_id	content
// 1	5	Nice

// users
// id	username
// 5	john

// After JOIN:
// id	content	username
// 1	Nice	john



// WHERE clause
// WHERE c.media_id = ?

// Means:
// Only comments for this media

// The ? is replaced by:
// [mediaId]

// If:
// mediaId = 4

// MySQL runs:
// WHERE c.media_id = 4



// SQL Translation in English
// Step by step:
// Look in comments
// Find rows where media_id = X
// For each row:
// Find the user whose id = comment.user_id

// Return:
// comment id
// content
// timestamp
// username


//Posting a comment
exports.createComment = async (req, res) => {
    try {
        const userId = req.user.id
        const { mediaId } = req.params
        const { content } = req.body

        //req.user.id → comes from your auth middleware (JWT). This is the logged-in user.
        // req.params.mediaId → the mediaId from the URL, e.g., /api/comments/4 → mediaId = 4
        // req.body.content → the comment text the user sent in Postman or frontend.

        if (!content) {
            return res.status(400).json({ message: 'Comment is required' })
        }

        //MySQL insert using parameterized query (?) to prevent SQL injection.
        // Adds a row to comments with:
        // user_id = logged-in user
        // media_id = the media being commented on
        // content = the text of the comment

        await pool.query('INSERT INTO comments (user_id, media_id, content) VALUES (?, ?, ?)', [userId, mediaId, content])

        //Increases comment count on specific media
        await pool.query('UPDATE media SET comment_count = comment_count + 1 WHERE id = ?', [mediaId])

        res.status(201).json({ message: 'Comment created successfully' })

    } catch (err) {
        console.error(err)
        res.status(500).json({ error: err.message })
    }
};

exports.getComments = async (req, res) => {
    try {
        const { mediaId } = req.params;
        const [rows] = await pool.query(
            `SELECT c.id, c.content, c.created_at, c.user_id, u.username,
              COUNT(cl.id) as likes_count
       FROM comments c 
       JOIN users u ON c.user_id = u.id
       LEFT JOIN comment_likes cl ON c.id = cl.comment_id
       WHERE c.media_id = ?
       GROUP BY c.id, c.content, c.created_at, c.user_id, u.username`,
            [mediaId]
        );

        const [countRows] = await pool.query(
            'SELECT comment_count FROM media WHERE id = ?',
            [mediaId]
        );

        if (!countRows[0]) return res.status(404).json({ message: 'Media not found' });

        res.json({
            totalComments: countRows[0].comment_count,
            comments: rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// Deleting a comment
exports.deleteComment = async (req, res) => {
    try {
        const userId = req.user.id
        const { commentId } = req.params

        // Find the media ID for this comment
        const [[comment]] = await pool.query(
            'SELECT media_id FROM comments WHERE id = ?',
            [commentId]
        );

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // // Now we have mediaId
        const mediaId = comment.media_id;

        //Gets logged-in user and the comment ID from the route (/api/comments/:mediaId/:commentId).
        const [result] = await pool.query('DELETE FROM comments WHERE id = ? AND user_id = ?', [commentId, userId]

        );

        // Decrement comment_count when comment is deleted
        await pool.query(
            'UPDATE media SET comment_count = comment_count - 1 WHERE id = ? AND comment_count > 0',
            [mediaId]
        );
        if (result.affectedRows === 0) {
            //Deletes the comment only if the logged-in user owns it.

            // result.affectedRows → how many rows were deleted.
            return res.status(404).json({ message: 'Comment not found' })

        } res.json({ message: 'Comment deleted successfully' })

    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
};

//Editing a comment
exports.editComment = async (req, res) => {
    try {
        const userId = req.user.id
        const { commentId } = req.params
        const { content } = req.body
        //Grab logged-in user ID, comment ID, and new content from route + request body.
        if (!content) {
            return res.status(400).json({ message: 'Content is required' });
        }
        const [result] = await pool.query('UPDATE comments SET content = ? WHERE id = ? AND user_id = ?', [content, commentId, userId]
            //Updates the comment only if owned by this user.

            // result.affectedRows → how many rows were updated.
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Comment not found' })

        } res.json({ message: 'Comment updated successfully' })


    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

exports.likeComment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { commentId } = req.params;

        const [existing] = await pool.query(
            'SELECT * FROM comment_likes WHERE user_id = ? AND comment_id = ?',
            [userId, commentId]
        );
        if (existing.length > 0) return res.status(400).json({ message: 'Already liked' });

        await pool.query('INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)', [userId, commentId]);
        await pool.query('UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?', [commentId]);

        const [[comment]] = await pool.query('SELECT likes_count FROM comments WHERE id = ?', [commentId]);
        res.json({ message: 'Comment liked', likesCount: comment.likes_count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.unlikeComment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { commentId } = req.params;

        const [result] = await pool.query(
            'DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?',
            [userId, commentId]
        );
        if (result.affectedRows === 0) return res.status(400).json({ message: 'Not liked' });

        await pool.query('UPDATE comments SET likes_count = likes_count - 1 WHERE id = ? AND likes_count > 0', [commentId]);

        const [[comment]] = await pool.query('SELECT likes_count FROM comments WHERE id = ?', [commentId]);
        res.json({ message: 'Comment unliked', likesCount: comment.likes_count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.getCommentLikeStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const commentIds = req.body.commentIds;

        if (!commentIds || !commentIds.length) return res.json({ likedIds: [] });

        const [rows] = await pool.query(
            `SELECT comment_id FROM comment_likes WHERE user_id = ? AND comment_id IN (?)`,
            [userId, commentIds]
        );

        res.json({ likedIds: rows.map(r => r.comment_id) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};