const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Static files
const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads/audio', express.static(path.join(uploadsDir, 'audio')));
app.use('/uploads/images', express.static(path.join(uploadsDir, 'images')));
app.use('/uploads/video', express.static(path.join(uploadsDir, 'video')));

// Routes
const authRoutes = require('./routes/authRoutes');
const mediaRoutes = require('./routes/mediaRoutes'); 
const genreRoutes = require('./routes/genreRoutes');
const likesRoutes = require('./routes/likesRoutes');
const commentsRoutes = require('./routes/commentsRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const followsRoutes = require('./routes/followsRoutes');
const searchRoutes = require('./routes/searchRoutes');


//Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/media', likesRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/follows', followsRoutes);
app.use('/api/search', searchRoutes)


// Test route
app.get('/test', (req, res) => res.send('Server works'));

module.exports = app;
