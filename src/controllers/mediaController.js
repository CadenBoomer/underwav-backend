const path = require('path');
const fs = require('fs');
const pool = require('../config/db');

// Array.isArray()
// if (Array.isArray(req.body.genreIds)) { ... }
// Array.isArray() is a built-in JavaScript method that checks if a value is an array.
// Why? Because sometimes req.body.genreIds could be:

// [1, 2, 3]  // array ✅
// "1,2,3"    // string ❌
// undefined  // ❌

// Using Array.isArray() ensures the code only runs if genreIds is actually an array.
// Without it, your .map() (next part) would crash if genreIds wasn’t an array.



// .map() method
// const genreValues = req.body.genreIds.map(genreId => [mediaId, genreId]);
// .map() is an array method that transforms each element of the array into something new.
// It returns a new array of the same length.
// Example:

// const numbers = [1, 2, 3];
// const doubled = numbers.map(n => n * 2);
// console.log(doubled); // [2, 4, 6]

// In your case
// req.body.genreIds.map(genreId => [mediaId, genreId])
// req.body.genreIds might be [2, 4]
// mediaId might be 5
// For each genreId, we create a pair [mediaId, genreId] → needed for bulk insert.
// So the resulting genreValues is:
// [[5, 2], [5, 4]]


// MySQL can insert all these rows in one query:
// INSERT INTO media_genres (media_id, genre_id) VALUES (5, 2), (5, 4);
// This is a super-efficient way to link a media to multiple genres at once.

// Dashboard
exports.dashboard = (req, res) => {
  res.json({
    message: `Welcome to your dashboard, ${req.user.username}`
  });
};

// Upload Media
exports.uploadMedia = async (req, res) => {
  try {
    // Get file and user from auth middleware
    const { user } = req;
    const file = req.file;

    // Default to public (1) if not provided
    const is_public = req.body.is_public !== undefined ? (req.body.is_public ? 1 : 0) : 1;

    // No file → error
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // If no title provided, default to original filename
    const title = req.body.title || file.originalname;

    let type = 'others';
    // Determine type of file
    if (file.mimetype.startsWith('audio')) type = 'audio';
    else if (file.mimetype.startsWith('image')) type = 'image';
    else if (file.mimetype.startsWith('video')) type = 'video';

    // Save to DB
    const [result] = await pool.query(
      `INSERT INTO media 
       (user_id, type, filename, original, original_name, title, is_public) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, type, file.filename, file.originalname, file.originalname, title, is_public]
    );

    // After inserting a new media record into the media table, MySQL returns an object with the insertId 
    // — this is the ID of the new media.
    //need this to link the media to its genres in the media_genres join table
    const mediaId = result.insertId;

    // Insert into media_genres if genreIds provided
    //Checks if the client sent a genreIds field in the request body.
    // Ensures it’s an array and has at least one ID.
    if (req.body.genreIds && Array.isArray(req.body.genreIds) && req.body.genreIds.length > 0) {

      //creates an array of arrays that MySQL can bulk insert. Example: if mediaId = 5 and genreIds = [2, 4], genreValues becomes: [[5, 2], [5, 4]]
      const genreValues = req.body.genreIds.map(genreId => [mediaId, genreId]);
      //Bulk inserts the media → genre links into the media_genres table.
      await pool.query('INSERT INTO media_genres (media_id, genre_id) VALUES ?', [genreValues]);
    }

    res.status(201).json({ message: 'File uploaded', mediaId });

  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};


// Update Media
exports.updateMedia = async (req, res) => {
  try {
    // mediaId = req.params.id → grabs the media ID from URL
    // userId = req.user.id → from JWT auth; ensures only owner can update
    // { title, description, type, is_public } = req.body → fields user wants to update
    const mediaId = req.params.id;
    const userId = req.user.id;
    const { title, description, type, is_public, genre_Ids } = req.body;

    const [rows] = await pool.query(
      `SELECT * FROM media WHERE id = ? AND user_id = ?`,
      [mediaId, userId]
    );

    // Ensures:
    // - Media exists
    // - Logged-in user owns it
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Media not found or unauthorized' });
    }

    // Arrays to build dynamic SQL update query (only update provided fields)
    const fields = [];
    const values = [];

    if (title !== undefined) {
      fields.push('title = ?');
      values.push(title);
    }

    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }

    if (type !== undefined) {
      fields.push('type = ?');
      values.push(type);
    }

    if (is_public !== undefined) {
      fields.push('is_public = ?');
      // Ensure boolean is 0 or 1
      values.push(is_public ? 1 : 0);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    // Push mediaId and userId to match placeholders
    values.push(mediaId, userId);

    const sql = `UPDATE media SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;

    await pool.query(sql, values);

    // Handle genres update
    // Checks if the user sent genreIds to update the media’s genres.
    if (genreIds && Array.isArray(genreIds)) {

      // Remove old genre links
      //Deletes all previous links between this media and genres.
      // Prevents duplicates and ensures the update fully replaces old genres.
      await pool.query('DELETE FROM media_genres WHERE media_id = ?', [mediaId]);

      // Add new ones
      // If the user provided any new genres, we insert them.
      if (genreIds.length > 0) {

        const genreValues = genreIds.map(genreId => [mediaId, genreId]);
        //Same as in upload — prepares the values for bulk insert.

        await pool.query('INSERT INTO media_genres (media_id, genre_id) VALUES ?', [genreValues]);
        // Creates the new links, effectively updating the genres for this media.
      }
    }

    res.json({ message: 'Media updated successfully' });

  } catch (err) {
    console.error('Update media error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get All Media for Logged-in User
exports.getUserMedia = async (req, res) => {
  try {
    const [rows] = await pool.query(
      // Returns only that user's files
      // Security: users can't see other users' media
      `SELECT id, type, filename, original_name, title, created_at, is_public
       FROM media 
       WHERE user_id = ?`,
      [req.user.id]
    );

    res.json(rows);

  } catch (err) {
    console.error('Fetch media error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Media By ID (Owner or Public)
exports.getMediaById = async (req, res) => {
  try {
    const mediaId = parseInt(req.params.id);
    const userId = req.user.id;

    const [rows] = await pool.query(
      // Owner can see any media, others can only see public
      `SELECT id, type, filename, original_name, title, created_at, user_id, is_public
       FROM media 
       WHERE id = ? AND (user_id = ? OR is_public = 1)`,
      [mediaId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Media not found or access denied' });
    }

    res.json(rows[0]);

  } catch (err) {
    console.error('Fetch media error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete Media
exports.deleteMedia = async (req, res) => {
  try {
    const mediaId = req.params.id;

    const [rows] = await pool.query(
      // Ownership check: user can only delete their own media
      `SELECT filename, type 
       FROM media 
       WHERE id = ? AND user_id = ?`,
      [mediaId, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Media not found or unauthorized' });
    }

    // Deletes from DB only, physical file remains on disk
    await pool.query(
      `DELETE FROM media WHERE id = ?`,
      [mediaId]
    );

    res.json({ message: 'Media deleted successfully' });

  } catch (err) {
    console.error('Delete media error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};


// Protected Stream (Owner or Public)
exports.streamMedia = async (req, res) => {
  try {
    const mediaId = parseInt(req.params.id);
    const userId = req.user.id;

    const [rows] = await pool.query(
      // Owner can stream any media; others only public
      `SELECT filename, type, user_id, is_public 
       FROM media 
       WHERE id = ? AND (user_id = ? OR is_public = 1)`,
      [mediaId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Media not found or access denied' });
    }

    const { filename, type } = rows[0];
    const filePath = path.join(__dirname, '../../uploads', type, filename);

    // Extra safety: file might have been deleted from disk
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    //Increases view count on media
    await pool.query(
      'UPDATE media SET views = views + 1 WHERE id = ?',
      [mediaId]
    )
    // Streams file to client
    // Browser behavior:
    // - Audio → plays inline
    // - Video → streams
    // - Image → shows inline
    res.sendFile(filePath);

  } catch (err) {
    console.error('Stream error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Protected Download (Owner or Public)
exports.downloadMedia = async (req, res) => {
  try {
    const mediaId = parseInt(req.params.id);
    const userId = req.user.id;

    const [rows] = await pool.query(
      // Owner can download any media; others only public
      `SELECT filename, type, original_name, user_id, is_public
       FROM media
       WHERE id = ? AND (user_id = ? OR is_public = 1)`,
      [mediaId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Media not found or access denied' });
    }

    const { filename, type, original_name } = rows[0];
    const filePath = path.join(__dirname, '../../uploads', type, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Sends file to client with download prompt
    // User gets original_name instead of hashed filename on server
    res.download(filePath, original_name);

  } catch (err) {
    console.error('Download error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

//Views count as 1 point each
// Likes count more because they indicate engagement
// Comments count the most because they’re even more interactive

//score = views + (likes * 2) + (comments * 3)
exports.getTrendingMedia = async (req, res) => {
  try {
    const [rows] = await pool.query(
      //ORDER BY score DESC sorts by trending.
      // LIMIT 20 returns the top 20 trending items.
      `SELECT 
        m.*,
        (m.views + m.likes_count * 2 + m.comments_count * 3) AS score
      FROM media m
      WHERE m.is_public = 1
      ORDER BY score DESC
      LIMIT 20
    `
    );
    res.json(rows);
  } catch (err) {
    console.error('Trending media error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
}
