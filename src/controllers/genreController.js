const pool = require('../config/db');

exports.getGenre = async (req, res) => {
    try {

        //Fetches all rows from the genre table.
        // ORDER BY name ASC → sorts genres alphabetically
        //[rows] → destructuring because pool.query returns [rows, fields].

        const [rows] = await pool.query('SELECT * FROM genre ORDER BY name ASC');

        // res.json(rows) → sends the list of genres back as JSON.
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.getGenreById = async (req, res) => {
    try {

        //req.params.id → gets the id from the URL (e.g., /api/genres/5).
        // ? placeholder prevents SQL injection.
        // Returns rows matching that genre ID.

        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM genre WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Genre not found' });
        }

        //Returns the first row (there should only ever be one row because id is unique).
        
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

