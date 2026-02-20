const pool = require('../config/db');

// Like media
exports.like = async (req, res) => {
    try {

        //userId comes from your JWT token (authMiddleware) → identifies who is liking.
        // mediaId comes from the URL parameter, e.g., /123/like.
        // { id: mediaId } is destructuring + rename: takes req.params.id and calls it mediaId.

        const userId = req.user.id;
        const { id: mediaId } = req.params;

        //Checks if the user already liked this media.
        // existing will be an array of rows from the query.

        const [existing] = await pool.query(
            'SELECT * FROM likes WHERE user_id = ? AND media_id = ?',
            [userId, mediaId]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Media already liked' });
        }

        //insert a new like record and return success.
        await pool.query('INSERT INTO likes (user_id, media_id) VALUES (?, ?)', [userId, mediaId]);
        res.status(200).json({ message: 'Media liked successfully' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// Unlike media
exports.unlike = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id: mediaId } = req.params;

        //Deletes the like from the database.

        const [result] = await pool.query(
            'DELETE FROM likes WHERE user_id = ? AND media_id = ?',
            [userId, mediaId]
        );

        //result.affectedRows tells you if any rows were actually deleted.
        if (result.affectedRows === 0) {
            return res.status(400).json({ message: 'Media not liked' });
        }

        res.json({ message: 'Media unliked successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// Get all media liked by logged-in user
exports.getProfileLikes = async (req, res) => {
    try {

        //Only returns media liked by this user (profile view).
        const userId = req.user.id;

        const [rows] = await pool.query(
            //SQL join:
            // media m = media table
            // JOIN likes l = only rows in likes for this user
            // Returns all columns of the media that the user liked.

            `SELECT m.*
             FROM media m
             JOIN likes l ON m.id = l.media_id
             WHERE l.user_id = ?`,
            [userId]
        );

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// Get likes for a specific media (public)
exports.getLikes = async (req, res) => {
    try {
        //Public endpoint → anyone can see who liked a specific media.
        const { id: mediaId } = req.params;

        const [rows] = await pool.query(

            //Get all users who liked this media
            // Returns their id and username only.
            
            `SELECT u.id, u.username
             FROM likes l
             JOIN users u ON l.user_id = u.id
             WHERE l.media_id = ?`,
            [mediaId]
        );

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};
