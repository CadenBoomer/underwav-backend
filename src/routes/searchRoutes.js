const express = require('express');
const router = express.Router();

const searchController = require('../controllers/searchController');

console.log('Search routes loaded');

router.get('/', searchController.search);

module.exports = router;