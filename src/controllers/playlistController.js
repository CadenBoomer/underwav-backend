const pool = require('../config/db');

//Create a playlist
exports.createPlaylist = async (req, res) => {
    try {

        //req.user.id → comes from your auth middleware (JWT). Ensures the playlist is tied to the logged-in user.
        // title and description come from the request body.

        const userId = req.user.id
        const { title, description, is_public } = req.body

        //// Default to public if not explicitly set
        const publicFlag = is_public !== undefined ? is_public : 1;

        //Validation: a playlist must have a title.
        if (!title) {
            return res.status(400).json({ message: 'Title is required' })

        }
        //Inserts a new playlist into the database with the logged-in user as the owner.

        const [result] = await pool.query('INSERT INTO playlists (user_id, title, description, is_public) VALUES (?, ?, ?, ?)', [userId, title, description || null, publicFlag])
        res.status(201).json({ message: 'Playlist created successfully', playlistId: result.insertId }
            //Returns the new playlist ID so frontend can reference it.
            //result.insertId → the primary key ID of the new playlist
        );

    } catch (err) {
        console.error(err)
        res.status(500).json({ error: err.message })
    }

}

//Fetches all playlists owned by the logged-in user.
// Prevents users from seeing other users’ playlists (security).
//Get playlists
exports.getPlaylists = async (req, res) => {
    try {
        //Fetches all playlists owned by the logged-in user.
        // Prevents users from seeing other users’ playlists (security).
        const userId = req.user.id
        const [row] = await pool.query('SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC', [userId]

        );
        res.json(row)

    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })

    }
}

//Get playlist by Id
exports.getPlaylistById = async (req, res) => {
    try {
        const { playlistId } = req.params;
        const userId = req.user.id;

        // Only return playlist if user owns it OR it is public
        const [rows] = await pool.query(
            'SELECT * FROM playlists WHERE id = ? AND (user_id = ? OR is_public = 1)',
            [playlistId, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Playlist not found or private' });
        }

        res.json(rows[0]);

    } catch (err) {
        console.error('Get playlist error:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Update Playlist
exports.updatePlaylist = async (req, res) => {
    try {
        const { playlistId } = req.params;
        const userId = req.user.id;
        const { title, description, is_public } = req.body;

        // Make sure user owns playlist
        const [rows] = await pool.query(
            'SELECT * FROM playlists WHERE id = ? AND user_id = ?',
            [playlistId, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Playlist not found or unauthorized' });
        }

        // Build dynamic SQL update query
        //fields is an array that will collect only the columns you actually want to update.
        // values stores the corresponding values for those columns.
        
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

        if (is_public !== undefined) {
            fields.push('is_public = ?');
            values.push(is_public);
        }

        if (fields.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(playlistId, userId);
        const sql = `UPDATE playlists SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;

        await pool.query(sql, values);

        res.json({ message: 'Playlist updated successfully' });

    } catch (err) {
        console.error('Update playlist error:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


//Delete playlist
exports.deletePlaylist = async (req, res) => {
    try {

        //Takes playlistId from the URL, e.g., /api/playlists/5.
        // userId ensures only owners can delete.
        const userId = req.user.id
        const { playlistId } = req.params


        //Deletes playlist only if it belongs to the user.
        const [result] = await pool.query('DELETE FROM playlists WHERE id = ? AND user_id = ?', [playlistId, userId]

        );
        //Security: prevents a user from deleting someone else’s playlist.
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Not your playlist' })

        }
        res.json({ message: 'Playlist deleted successfully' })

    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })

    }
}

//Add songs to playlist

exports.addSong = async (req, res) => {
    try {

        // playlistId → the playlist to add to.
        // mediaId → the media/song to add.
        // userId → ensures only the owner can modify playlist content.

        const userId = req.user.id
        const { playlistId, mediaId } = req.params


        //Checks that the playlist exists and belongs to the user before adding.
        // Security: prevents unauthorized access.
        const [playlist] = await pool.query('SELECT id FROM playlists WHERE id = ? AND user_id = ?', [playlistId, userId]

        );

        if (playlist.length === 0) {
            return res.status(404).json({ message: 'Playlist not found' })

        };

        //Inserts into playlist_media table (join table for many-to-many relationship):
        // One playlist → many songs
        // One song → can be in many playlists

        await pool.query('INSERT INTO playlist_media (playlist_id, media_id) VALUES (?, ?)', [playlistId, mediaId]

        )
        res.json({ message: 'Song added successfully' })

    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Song already in playlist' })
        }
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

//Get songs in playlist
exports.getSongs = async (req, res) => {
    try {
        const { playlistId } = req.params;
        const userId = req.user.id;

        // Check if playlist is owned by user OR is public
        const [playlistCheck] = await pool.query(
            'SELECT * FROM playlists WHERE id = ? AND (user_id = ? OR is_public = 1)',
            [playlistId, userId]
        );

        if (playlistCheck.length === 0) {
            return res.status(404).json({ message: 'Playlist not found or private' });
        }

        // Fetch all songs in the playlist
        const [rows] = await pool.query(
            'SELECT m.* FROM playlist_media pm JOIN media m ON pm.media_id = m.id WHERE pm.playlist_id = ? ORDER BY pm.id ASC',
            [playlistId]
        );

        res.json(rows);

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
};


//Get song by Id in playlist
exports.getSongById = async (req, res) => {
    try {
        const { playlistId, mediaId } = req.params;
        const userId = req.user.id;

        // Check if playlist is owned by user OR is public
        const [playlistCheck] = await pool.query(
            'SELECT * FROM playlists WHERE id = ? AND (user_id = ? OR is_public = 1)',
            [playlistId, userId]
        );

        if (playlistCheck.length === 0) {
            return res.status(404).json({ message: 'Playlist not found or private' });
        }

        // Fetch the specific song
        const [rows] = await pool.query(
            'SELECT m.* FROM playlist_media pm JOIN media m ON pm.media_id = m.id WHERE pm.playlist_id = ? AND pm.media_id = ?',
            [playlistId, mediaId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Song not found in playlist' });
        }

        res.json(rows[0]);

    } catch (err) {
        console.error('GET song error:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


//Remove a song
exports.removeSong = async (req, res) => {
    try {

        //Removes a song from a playlist.
        // Ensures only the owner can remove.

        const userId = req.user.id
        const { playlistId, mediaId } = req.params

        //Check playlist exists and belongs to user.
        const [playlist] = await pool.query('SELECT id FROM playlists WHERE id = ? AND user_id = ?', [playlistId, userId]
        );

        if (playlist.length === 0) {
            return res.status(404).json({ message: 'Playlist not found' })
        }

        //Deletes the link between playlist and song.
        // affectedRows === 0 → song wasn’t in the playlist.

        const [result] = await pool.query('DELETE FROM playlist_media WHERE playlist_id = ? AND media_id = ?', [playlistId, mediaId]

        )
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Song not in playlist' })
        }
        res.json({ message: 'Song removed successfully' })

    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}