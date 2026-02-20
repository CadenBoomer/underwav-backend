const express = require('express');
const router = express.Router();

const auth = require('../middleware/authMiddleware');
const playlistController = require('../controllers/playlistController');

console.log('Playlist routes loaded');

//Create playlist 
router.post('/playlists', auth, playlistController.createPlaylist)

//Show playlists to user
router.get('/playlists', auth, playlistController.getPlaylists)

//Get playlist by Id
router.get('/playlists/:playlistId', auth, playlistController.getPlaylistById)

//Update Playlist
router.patch('/playlists/:playlistId', auth, playlistController.updatePlaylist)

//Delete playlist 
router.delete('/playlists/:playlistId', auth, playlistController.deletePlaylist)

//Add songs to playlist 
router.post('/playlists/:playlistId/media/:mediaId', auth, playlistController.addSong)

//Get songs in the playlist 
router.get('/playlists/:playlistId/media', playlistController.getSongs)

//Get song by Id in playlist
router.get('/playlists/:playlistId/media/:mediaId', playlistController.getSongById)

//Remove a song from the playlist 
router.delete('/playlists/:playlistId/media/:mediaId', auth, playlistController.removeSong)


module.exports = router;