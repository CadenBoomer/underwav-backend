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
        await pool.query('UPDATE media SET comments = comments + 1 WHERE id = ?', [mediaId])

        res.status(201).json({ message: 'Comment created successfully' })

    } catch (err) {
        console.error(err)
        res.status(500).json({ error: err.message })
    }
};

//Getting comments
exports.getComments = async (req, res) => {
    try {
        const { mediaId } = req.params
        //Same as before, grabs mediaId from route.
        const [rows] = await pool.query('SELECT c.id, c.content, c.created_at, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.media_id = ?', [mediaId]

            //Step by step MySQL breakdown:

            // SELECT c.id, c.content, c.created_at, u.username → only fetches these columns.

            // FROM comments c → alias c for the comments table.

            // JOIN users u ON c.user_id = u.id → join users to get the username.

            // Why join? comments only has user_id, we want username.

            // Only returns comments where the user exists.

            // WHERE c.media_id = ? → filters to comments for the specific media.

            // [mediaId] → replaces ? with the mediaId from the URL.

            // const [rows] = ... → destructuring; MySQL query returns [rows, fields].

        );

        // Returns all the individual comments for that media.
        // Each row = one comment.
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
        console.error(err)
        res.status(500).json({ error: err.message })

    }
}

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