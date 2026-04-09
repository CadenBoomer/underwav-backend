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

        //Increase like count
        await pool.query('UPDATE media SET likes_count = likes_count + 1 WHERE id = ?', [mediaId]);

        //Get updated like count
        const [[media]] = await pool.query('SELECT likes_count FROM media WHERE id = ?', [mediaId]);

        res.status(200).json({ message: 'Media liked successfully', likesCount: media.likes_count });

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

        await pool.query('UPDATE media SET likes_count = likes_count - 1 WHERE id = ? AND likes_count > 0', [mediaId]);

        // Get updated like count
        const [[media]] = await pool.query('SELECT likes_count FROM media WHERE id = ?', [mediaId]);

        res.json({ message: 'Media unliked successfully', likesCount: media.likes_count });

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



// req.user.id — this comes from your auth middleware which reads the JWT token and attaches 
// the user object to the request. So req.user is always the logged in user.
// { id: mediaId } — destructuring with rename. Takes req.params.id and assigns it to a variable 
// called mediaId instead. Just cleaner than writing req.params.id everywhere.
// Checks for existing like first to prevent duplicates, inserts the like, increments the count with 
// likes_count + 1, then fetches the updated count to send back

// [[media]] — double destructuring. pool.query returns [rows, fields], and since you expect exactly 
// one row, the inner [media] pulls out just that first row. So media.likes_count gives you the number directly.
// unlike

// Deletes the like row, checks result.affectedRows === 0 — if nothing was deleted it means the media 
// wasn't liked in the first place, so returns a 400
// likes_count > 0 in the UPDATE is a safety guard — prevents the count going negative if something gets
//  out of sync

// getProfileLikes

// SQL JOIN — connects two tables together. JOIN likes l ON m.id = l.media_id means only return media rows 
// that have a matching entry in the likes table for this user. SELECT m.* returns all columns from the media 
// table for those matches.

// getLikes

// Public endpoint, no auth needed
// Joins in the opposite direction — starts from likes, joins to users to get their username. Returns just 
// id and username, not the full user object, since that's all you need for a likes list