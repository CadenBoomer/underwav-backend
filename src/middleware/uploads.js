const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure folders exist (relative to project root)
const uploadDir = path.join(__dirname, '../../uploads');
const folders = [
    path.join(uploadDir, 'audio'),
    path.join(uploadDir, 'images'),
    path.join(uploadDir, 'video'),
    path.join(uploadDir, 'others')
];
folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let folder = path.join(uploadDir, 'others');
        if (file.mimetype.startsWith('audio')) folder = path.join(uploadDir, 'audio');
        else if (file.mimetype.startsWith('image')) folder = path.join(uploadDir, 'images');
        else if (file.mimetype.startsWith('video')) folder = path.join(uploadDir, 'video');
        cb(null, folder);
    },
    filename: function (req, file, cb){
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

module.exports = upload;
