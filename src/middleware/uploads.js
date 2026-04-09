// Imports Multer for handling file uploads.
// path is for file path handling.
// fs is for filesystem operations like creating folders.

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Sets base upload folder and subfolders for different media types.
// Ensure folders exist (relative to project root)
const uploadDir = path.join(__dirname, '../../uploads');
const folders = [
    path.join(uploadDir, 'audio'),
    path.join(uploadDir, 'images'),
    path.join(uploadDir, 'video'),
    path.join(uploadDir, 'others')
];

//Loops over the folders and creates them if they don’t exist.
// recursive: true ensures nested directories are created if needed.

folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
});

// Allowed MIME types (production-level restriction)
const allowedTypes = [
    // Audio
    'audio/mpeg',  // mp3
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',

    // Images
    'image/jpeg',
    'image/png',
    'image/webp',

    // Video
    'video/mp4'
];

// Multer file filter
const fileFilter = (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // Accept file
    } else {
        cb(new Error('Invalid file type. Only audio, images, and MP4 video are allowed.'), false);
    }
};

//Defines where uploaded files go based on type: audio, image, video, or others.
// cb(null, folder) → tells Multer which folder to use.

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let folder = path.join(uploadDir, 'others');
        if (file.mimetype.startsWith('audio')) folder = path.join(uploadDir, 'audio');
        else if (file.mimetype.startsWith('image')) folder = path.join(uploadDir, 'images');
        else if (file.mimetype.startsWith('video')) folder = path.join(uploadDir, 'video');
        cb(null, folder);
    },

    //Creates a unique filename for every upload.
    // Combines a timestamp + random number + original file extension.

    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

//Configures Multer:
// Uses the storage rules defined above.
// Sets max file size = 50MB.

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: fileFilter

});

module.exports = upload;



//1) The main job: Configure Multer (the core purpose)
// Everything important here is for Multer:
// Where files go (destination)
// How files are named (filename)
// File size limit (50MB)
// Exporting the configured middleware


// This part is the real purpose:

// const storage = multer.diskStorage({...});
// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 50 * 1024 * 1024 }
// });
// module.exports = upload;
//That’s the core.

//2) Nice but optional part:
// const fs = require('fs');
// folders.forEach(folder => {
//     if (!fs.existsSync(folder)) {
//         fs.mkdirSync(folder, { recursive: true });
//     }
// });

//What it does:
// Makes sure upload folders exist
// Prevents crashes if the folder isn’t there
// Without this:
// Multer would throw an error if the directory didn’t exist
// So this is support code, not the main purpose.


// 3) The file-type routing (still Multer logic)
//if (file.mimetype.startsWith('audio')) ...
// Just tells Multer:
// Audio → /uploads/audio
// Images → /uploads/images
// Video → /uploads/video
// Everything else → /uploads/others
// Still Multer configuration.


//Simple summary
// Uploads.js =
// 90% Multer setup
// 10% folder safety (fs)
// Or even simpler:
// This file exists so your routes can say:
// upload.single('file')
// and everything else (location, naming, limits) is already handled.


//This file is a middleware utility, not a controller.
// Flow:
// Request → Auth middleware → Upload middleware (Multer) → Controller → DB


//The one missing production-level thing in your upload setup is:

// Right now you are routing files based on: file.mimetype.startsWith('audio')

//MIME type can be faked.
// Someone can rename a malicious file to: virus.exe → virus.mp3

// And sometimes the mimetype can be spoofed by the client.
// So currently:
// You limit file size 
// You organize folders 
// You generate unique names 
// But you don’t strictly restrict allowed file types 


//What You Should Add: fileFilter
// Multer supports a fileFilter option to reject unwanted file types.

// ex: 
// const allowedTypes = [
//   'audio/mpeg',
//   'audio/wav',
//   'image/jpeg',
//   'image/png',
//   'video/mp4'
// ];

// const upload = multer({
//   storage: storage,
//   limits: { fileSize: 50 * 1024 * 1024 },
//   fileFilter: (req, file, cb) => {
//     if (allowedTypes.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error('Invalid file type'), false);
//     }
//   }
// });

//Now:
// Only specific file types are allowed
// Everything else gets rejected before hitting your controller




//Even More Production-Level (Optional Later)

// If you want to go even more serious:
// Validate file extension AND mimetype
// Scan uploads
// Store uploads in cloud storage (S3, GCS)
// Serve through CDN
// Store only file paths in DB
// But that’s next-level deployment stuff.