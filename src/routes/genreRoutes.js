const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genreController'); 

// Get all genres
router.get('/', genreController.getGenre);

// Get genre by id
router.get('/:id', genreController.getGenreById);

module.exports = router;
