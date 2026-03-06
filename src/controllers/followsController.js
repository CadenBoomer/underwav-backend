
const pool = require('../config/db');

//Follow
exports.follow = async (req, res) => {
    try {

        //req.user.id comes from your JWT token decoded by auth middleware. This is the currently logged-in user (the follower).
        // req.params.userId is the user being followed.
        // trim() removes accidental spaces from the URL parameter.
        // parseInt(...) ensures it’s stored as an integer for MySQL (prevents type errors).

        const userId = req.user.id
        const followingId = parseInt(req.params.userId.trim())

        if (userId === followingId) {
            return res.status(400).json({ message: 'You cannot follow yourself' })
        }

        //         Runs an SQL INSERT into the follows table.
        // ? placeholders prevent SQL injection.
        // Returns a success JSON message.

        const [result] = await pool.query('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [userId, followingId]

        );
        res.json({ message: 'Followed successfully' })

    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Already following' })
        }
        console.log(err)
        res.status(500).json({ error: err.message })

    }
}

//UnFollow
exports.unfollow = async (req, res) => {
    try {
        const userId = req.user.id
        const followingId = parseInt(req.params.userId.trim())

        const [result] = await pool.query('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [userId, followingId]

        );

        //result.affectedRows tells how many rows were deleted.
        //If no rows were deleted → user wasn’t following that person → returns 404.

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Not following user' })
        }
        res.json({ message: 'Unfollowed successfully' })

    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })

    }
}

//Get followers of user
exports.getFollowers = async (req, res) => {
    try {

        //Gets all users following the logged-in user.
        // JOIN users u ON f.follower_id = u.id fetches actual user info instead of just IDs.
        // Returns an array of { id, username }.

        const userId = req.user.id; // from token
        const [rows] = await pool.query(
            'SELECT u.id, u.username FROM follows f JOIN users u ON f.follower_id = u.id WHERE f.following_id = ?',
            [userId]
        );
        res.status(200).json(rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
};


//Get following
exports.getFollowing = async (req, res) => {
    try {

        //Fetches all users that the logged-in user is following.
        // Joins on following_id to get user info.
        // Returns array of { id, username }.
        
        const userId = req.user.id; // from token
        const [rows] = await pool.query(
            'SELECT u.id, u.username FROM follows f JOIN users u ON f.following_id = u.id WHERE f.follower_id = ?',
            [userId]
        );
        res.status(200).json(rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
};

// Get followers of any user by ID
exports.getFollowersByUserId = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.avatar 
       FROM follows f 
       JOIN users u ON f.follower_id = u.id 
       WHERE f.following_id = ?`,
      [req.params.userId]
    );
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get following of any user by ID
exports.getFollowingByUserId = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.avatar 
       FROM follows f 
       JOIN users u ON f.following_id = u.id 
       WHERE f.follower_id = ?`,
      [req.params.userId]
    );
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};