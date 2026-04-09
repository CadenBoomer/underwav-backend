// const pool = require('../config/db');

// // The controller handles a search endpoint for both media and artists.
// // It supports:
// // Filtering by title/artist
// // Optional genre filtering
// // Media visibility (public)
// // Pagination
// // Returns a single JSON object with both media and artists arrays.


// // Pulls query parameters from the URL. Example: /api/search?q=love&page=2&limit=10
// // q → search keyword
// // genres → optional, comma-separated genre IDs
// // type → 'media', 'artist', or 'all' (default 'all')
// // is_public → filter media to public ones only (default 'true')
// // page → pagination page number (default 1)
// // limit → items per page (default 20)

// exports.search = async (req, res) => {
//     try {
//         const { q, genres, type = 'all', is_public = 'true', page = 1, limit = 20 } = req.query;

//         //Calculates the SQL OFFSET for pagination.
//         // Example: page 2 with limit 20 → skip (2-1)*20 = 20 rows.

//         const offset = (page - 1) * limit;

//         // If genres exists, split the comma-separated string into an array of numbers.
//         // Example: "1,3,5" → [1, 3, 5]
//         // If no genres are provided, genreFilter is null.

//         const genreFilter = genres ? genres.split(',').map(Number) : null;

//         //Prepares the search keyword for SQL LIKE.
//         // % means “anything before or after” the text.
//         // Example: q = "love" → %love% matches "Love Song", "All About Love", etc.

//         const keyword = `%${q}%`;

//         //Initialize an empty object to store the search results.
//         // Will later hold results.media and results.artists.

//         const results = {};


//         // Checks if the search should include media.
//         // Runs the media query if the user wants media or everything (all).


//         //  SELECT m.id, m.title, m.user_id, u.username, u.display_name → get media info plus creator info
//         // JOIN users u ON m.user_id = u.id → join to fetch the creator’s username and display name
//         // LEFT JOIN media_genres mg ON m.id = mg.media_id → join to filter by genres (optional)
//         // WHERE m.is_public = ? → only public media if is_public=true
//         // AND (m.title LIKE ? OR u.username LIKE ? OR u.display_name LIKE ?) → search keyword matches either media title or creator name
//         // ${genreFilter ? ...} → dynamically adds genre filter if any genres are specified
//         // GROUP BY m.id → ensures each media item appears only once (important if it has multiple genres)
//         // ORDER BY m.created_at DESC → newest first
//         // LIMIT ? OFFSET ? → pagination
//         // The array [ ... ] after the template fills in the ? parameters safely (prevents SQL injection)

//         if (type === 'media' || type === 'all') {
//             const [mediaRows] = await db.execute(
//                 `
//         SELECT m.id, m.title, m.user_id, u.username, u.display_name
//         FROM media m
//         JOIN users u ON m.user_id = u.id
//         LEFT JOIN media_genres mg ON m.id = mg.media_id
//         WHERE m.is_public = ?
//         AND (m.title LIKE ? OR u.username LIKE ? OR u.display_name LIKE ?)
//         ${genreFilter ? `AND mg.genre_id IN (${genreFilter.join(',')})` : ''}
//         GROUP BY m.id
//         ORDER BY m.created_at DESC
//         LIMIT ? OFFSET ?;
//         `,
//                 [is_public === 'true' ? 1 : 0, keyword, keyword, keyword, parseInt(limit), parseInt(offset)]
//             );

//             //Save the media query result to results.media.
//             results.media = mediaRows;
//         }

//         //Checks if we should search for artists (users).

//         if (type === 'artist' || type === 'all') {

//             //Selects users whose username or display_name matches the search keyword.
//             // Orders alphabetically (ASC)
//             // Uses pagination (LIMIT + OFFSET)
//             // Stores results in artistRows.

//             const [artistRows] = await db.execute(
//                 `
//         SELECT id, username, display_name
//         FROM users
//         WHERE username LIKE ? OR display_name LIKE ?
//         ORDER BY username ASC
//         LIMIT ? OFFSET ?;
//         `,
//                 [keyword, keyword, parseInt(limit), parseInt(offset)]
//             );

//             results.artists = artistRows;
//         }

//         //Send JSON response back to client.
//         // Includes:
//         // page → current page number
//         // limit → items per page
//         // results.media → media results
//         // results.artists → artist results

//         res.json({
//             page: parseInt(page),
//             limit: parseInt(limit),
//             ...results
//         });

//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Server error' });
//     }
// };



const pool = require('../config/db');

exports.search = async (req, res) => {
  try {
    const q = req.query.q || '';
    const keyword = `%${q}%`;

    if (q.trim().length < 2) {
      return res.json({ tracks: [], artists: [] });
    }

    const [tracks] = await pool.query(
      `SELECT m.id, m.title, m.filename, m.cover_image, m.views, m.likes_count, m.description, m.lyrics, m.user_id,
              u.username as artist
       FROM media m
       JOIN users u ON m.user_id = u.id
       WHERE (m.title LIKE ? OR u.username LIKE ?)
       AND m.is_public = 1 AND m.type = 'audio'
       ORDER BY m.views DESC
       LIMIT 20`,
      [keyword, keyword]
    );

    const [artists] = await pool.query(
      `SELECT u.id, u.username, u.avatar, COUNT(m.id) as track_count
       FROM users u
       LEFT JOIN media m ON u.id = m.user_id AND m.is_public = 1
       WHERE u.username LIKE ?
       GROUP BY u.id
       ORDER BY track_count DESC
       LIMIT 10`,
      [keyword]
    );

    res.json({ tracks, artists });

  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
