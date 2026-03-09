const pool = require('../config/db'); // make sure this is mysql2/promise connection
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/email');



//jwt: 
//Test
// {
//     "username": "Cboomer",
//     "email": "cboomer@gmail.com",
//     "password": "password123"
// }

//  {
//      "username": "Bob123",
//     "email": "Bob123@gmail.com",
//     "password": "password123"
//  }


//api/auth/login or api/auth/signup
// api/auth/profile (DELETE or PATCH)
// api/media/uploads (Uploading file)(POST)
// /api/media use GET method or add if at end

// {
//   "first_name": "Caden",
//   "last_name": "Boomer",
//   "address": "123 Street",
//   "city": "Ajax",
//   "country": "Canada",
//   "phone": "5551234567",
//   "bio": "I love music",
//   "avatar": "profile.png"
// }

//For updating uploads: /api/media/4
//GET requests don’t have a body. 


//Source	                    Where it comes from	                      How you access it
// URL parameters	                /api/media/4	                      req.params
// Request body	JSON sent in        POST/PATCH	                          req.body
// Auth middleware	                Decoded JWT	                          req.user

//When to Use Each
// req.params = When resource is in URL

// When user is sending data = Create/update:
// req.body


// When action depends on logged-in user
// Like
// Comment
// Create playlist
// Get my profile
//req.user


//| Problem            | Likely issue             |
// | ------------------ | ------------------------ |
// | req.body empty     | missing express.json()   |
// | req.params empty   | route path wrong         |
// | req.user undefined | auth middleware not used |

//example
// router.post('/:mediaId', auth, createComment);

// POST /api/comments/5
// Body:
// {
//   "content": "Fire track"
// }

// const userId = req.user.id;        // from JWT
// const { mediaId } = req.params;    // from URL
// const { content } = req.body;      // from body




// const [rows] = ...
// means:
// Give me the query results (ignore metadata)
//rows = array of results
//Example: [
//   {
//     id: 5,
//     content: "Nice track!",
//     created_at: "...",
//     username: "john"
//   }
// ]


//For Signup with email verification token
exports.signup = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ message: 'All fields required' });

  try {
    // Check if email exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0)
      return res.status(400).json({ message: 'Email already exists' });

    // Hash password. Salting 10. 
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (unverified by default)
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, is_verified) VALUES (?, ?, ?, false)',
      [username, email, hashedPassword]
    );

    const userId = result.insertId;

    // Create verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt]
    );

    // Send Verification Email
    await sendEmail(
      email,
      "Verify your Underwav account",
      `
    <h2>Welcome to Underwav 🎵</h2>
    <p>Click the link below to verify your email:</p>
    <a href="http://localhost:3000/api/auth/verify-email/${token}">
      Verify Email
    </a>
    <p>This link expires in 1 hour.</p>
  `
    );

    res.status(201).json({
      message: 'User created. Please verify your email.',
      userId
    });

  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


//Verify Email

exports.verifyEmail = async (req, res) => {

  //Get token from URL
  try {
    const { token } = req.params;

    //   Does this token exist?
    // Which user does it belong to?
    // When does it expire?
    const [rows] = await pool.query(
      'SELECT user_id, expires_at FROM verification_tokens WHERE token = ?',
      [token]
    );

    if (rows.length === 0) return res.status(400).json({ message: 'Invalid token' });

    //Get token data
    const tokenRow = rows[0];

    //Checks the expiration of the token

    if (new Date(tokenRow.expires_at) < new Date()) {
      return res.status(400).json({ message: 'Token expired' });

    }

    //Update user to verified

    await pool.query('UPDATE users SET is_verified = true WHERE id = ?', [tokenRow.user_id]);

    //Delete token
    //Token can’t be reused.
    await pool.query('DELETE FROM verification_tokens WHERE token = ?', [token]);

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Email verification error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


//Refresh Token
exports.refreshToken = async (req, res) => {
  try {

    //req.body is an object. So doing const token = req.body will not work in db.
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token required' });

    // Find token in DB
    //  Is this refresh token valid?
    // Who owns it?
    // When does it expire?
    const [rows] = await pool.query('SELECT * FROM refresh_tokens WHERE token = ?', [token]);
    if (rows.length === 0) return res.status(400).json({ message: 'Invalid token' });

    const tokenRow = rows[0];

    if (new Date(tokenRow.expires_at) < new Date()) {
      return res.status(400).json({ message: 'Token expired' });
    }

    //Create new access token
    const [userRows] = await pool.query('SELECT id, email FROM users WHERE id = ?', [tokenRow.user_id]);
    const user = userRows[0];

    const jwtToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ token: jwtToken });

  } catch (err) {
    console.error('Token refresh error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'All fields are required' });

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(400).json({ message: 'User not found' });

    const user = rows[0];

    // Check if email is verified
    if (!user.is_verified) return res.status(400).json({ message: 'Email not verified' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Invalid password' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });

    res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

//Get Profile Details

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      `SELECT id, username, email, first_name, last_name, address, city, country, 
              phone, bio, avatar, show_email 
       FROM users WHERE id = ?`,
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Get profile error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

//Update Profile

exports.updateProfile = async (req, res) => {
  const userId = req.user.id;

  //Pull fields from request.
  // If client sends only { bio: "hello" }
  // then: username = undefined 
  // avatar = undefined
  const { username, email, first_name, last_name, address, city, country, phone, bio, avatar, show_email } = req.body;

  //COALESCE(value, column)
  // Means:
  // If value is NOT null → use it
  // If value IS null → keep existing column value. Basically stops overwriting the file if a specific field wasnt updated. 
  try {
    const [result] = await pool.query(
      `UPDATE users SET 
    username = COALESCE(?, username), 
    email = COALESCE(?, email), 
    first_name = COALESCE(?, first_name), 
    last_name = COALESCE(?, last_name), 
    address = COALESCE(?, address), 
    city = COALESCE(?, city), 
    country = COALESCE(?, country), 
    phone = COALESCE(?, phone), 
    bio = COALESCE(?, bio), 
    avatar = COALESCE(?, avatar),
    show_email = ?
   WHERE id = ?`,
      [username, email, first_name, last_name, address, city, country, phone, bio, avatar, show_email ?? 0, userId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ message: 'Profile updated successfully' });

  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }

};

//Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    //Extracts email from request body
    const { email } = req.body;

    //  Looks in users table for that email.
    // ? prevents SQL injection.
    // Returns matching rows.
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]
    );
    if (rows.length === 0) {
      return res.status(200).json({ message: 'If that email exists, a reset link was sent.' });
    }


    //Gets the user’s ID.
    // Needed to link the reset token to the user.
    const userId = rows[0].id;

    //Creates a secure reset token.
    // Generates 32 random bytes
    // Converts to hex string
    const token = crypto.randomBytes(32).toString('hex');
    //token expires in 60 minutes.
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);


    //Stores reset token in database.
    await pool.query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [userId, token, expiresAt]);
    await sendEmail(email,
      "Reset Your Underwav Password",
      `
    <h2>Password Reset</h2>
    <p>Click below to reset your password:</p>
    <a href="http://localhost:3000/api/auth/reset-password/${token}">
      Reset Password
    </a>
    <p>This link expires in 1 hour.</p>
  `
    );


    res.status(200).json({ message: 'Password reset link sent to email' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


// Show reset password form in browser
exports.showResetPasswordForm = async (req, res) => {
  const { token } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ?',
      [token]
    );
    if (rows.length === 0) return res.send('Invalid or expired token');

    const tokenRow = rows[0];
    if (new Date(tokenRow.expires_at) < new Date()) return res.send('Token expired');

    // Show a simple HTML form
    res.send(`
      <form action="/api/auth/reset-password/${token}" method="POST">
        <input name="newPassword" type="password" placeholder="New password" required />
        <button type="submit">Reset Password</button>
      </form>
    `);
  } catch (err) {
    console.error(err);
    res.send('Server error');
  }
};

//Reset Password
exports.resetPassword = async (req, res) => {

  try {
    //token = the reset token sent to the user’s email
    // newPassword = what they want to change their password to

    const { token } = req.params;
    const { newPassword } = req.body;

    //Stops the request if no password is provided.
    if (!newPassword) return res.status(400).json({ message: 'New password required' });

    //Look up the token in DB
    // Does this token exist?
    // Which user_id does it belong to?
    // When does it expire?

    const [rows] = await pool.query('SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ?', [token]);
    if (rows.length === 0) return res.status(400).json({ message: 'Invalid token' });

    //Check if token expired
    const tokenRow = rows[0];
    if (new Date(tokenRow.expires_at) < new Date())
      return res.status(400).json({ message: 'Token expired' });

    //Uses bcrypt to hash the new password before storing it in the database.
    // Salt rounds = 10
    // Never store plain passwords in the database.
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    //Update user password
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, tokenRow.user_id]);
    //Delete the token (important). Makes sure the token can only be used once.
    await pool.query('DELETE FROM password_reset_tokens WHERE token = ?', [token]);

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

//Update Password

exports.updatePassword = async (req, res) => {
  try {

    //This comes from auth middleware.
    // User must be logged in.

    const userId = req.user.id;

    //Input
    const { currentPassword, newPassword } = req.body;

    //Get current hashed password
    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
    const user = rows[0];

    //Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    //UPDATE users SET password = ?
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// Delete Profile
exports.deleteProfile = async (req, res) => {
  const userId = req.user.id;
  const fs = require('fs');
  const path = require('path');

  try {
    // Query media table for all files associated with the user and delete them from filesystem
    const [mediaRows] = await pool.query(
      'SELECT filename, type FROM media WHERE user_id = ?',
      [userId]
    );

    // Delete each media file from disk
    mediaRows.forEach(file => {
      //Delete files from disk
      const filepath = path.join(__dirname, '..', 'uploads', file.type, file.filename);
      //Checks if file exists.
      if (fs.existsSync(filepath)) {
        //fs.unlinkSync(filePath). Deletes file.
        fs.unlinkSync(filepath);
      }
    });

    // Delete media rows
    await pool.query(
      'DELETE FROM media WHERE user_id = ?',
      [userId]
    );

    // Delete user
    await pool.query(
      'DELETE FROM users WHERE id = ?',
      [userId]
    );

    res.status(200).json({ message: 'Profile deleted successfully' });
  } catch (err) {
    console.error('Delete profile error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Request Email Change

exports.requestEmailChange = async (req, res) => {
  try {
    //Gets the logged-in user’s ID.
    // This only works if:
    // JWT middleware decoded token
    // Middleware attached user to req.user
    const userId = req.user.id;

    //Reads the new email from the request body.
    const { newEmail } = req.body;

    //Validation
    if (!newEmail) return res.status(400).json({ message: 'New email required' });

    //Checks if someone else is using that email already.
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [newEmail]);
    //Prevents duplicate emails.
    if (existing.length > 0) return res.status(400).json({ message: 'Email already in use' });

    //Creates a secure random token:
    const token = crypto.randomBytes(32).toString('hex');
    //Sets expiry time: 1hr
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    //Stores the request in DB:
    // Who requested
    // What email
    // Token
    // Expiry
    await pool.query('INSERT INTO email_change_tokens (user_id, new_email, token, expires_at) VALUES (?, ?, ?, ?)',
      [userId, newEmail, token, expiresAt]
    );

    await sendEmail(
      newEmail,
      "Confirm Your New Underwav Email",
      `
    <h2>Confirm Email Change</h2>
    <p>Click below to confirm your new email address:</p>
    <a href="http://localhost:3000/api/auth/confirm-email-change/${token}">
      Confirm Email
    </a>
    <p>This link expires in 1 hour.</p>
  `
    );

    res.status(200).json({ message: 'Email change request sent' });
  } catch (err) {
    console.error('Request email change error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message })
  }
};

//Confirm Email Change

exports.confirmEmailChange = async (req, res) => {
  try {
    //Gets token from URL:
    const { token } = req.params;
    //Looks up token in DB.
    const [rows] = await pool.query('SELECT user_id, new_email, expires_at FROM email_change_tokens WHERE token = ?', [token]
    );
    //If it doesnt match then invalid
    if (rows.length === 0) return res.status(400).json({ message: 'Invalid token' });
    //Checks if we get a matching record.
    const tokenRow = rows[0];
    //Checks if token is expired or not. 
    if (new Date(tokenRow.expires_at) < new Date()) return res.status(400).json({ message: 'Token expired' });

    //Updates the user’s email.
    await pool.query('UPDATE users SET email = ? WHERE id = ?', [tokenRow.new_email, tokenRow.user_id])
    //Deletes the token so it cannot be used
    await pool.query('DELETE FROM email_change_tokens WHERE user_id = ?', [tokenRow.user_id]);

    res.status(200).json({ message: 'Email changed successfully' });
  } catch (err) {
    console.error('Confirm email change error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Suggested Artists
exports.getSuggestedArtists = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.avatar,
              COUNT(m.id) as track_count
       FROM users u
       JOIN media m ON u.id = m.user_id
       WHERE m.is_public = 1
       AND u.id != ?
       AND u.id NOT IN (
         SELECT following_id FROM follows WHERE follower_id = ?
       )
       GROUP BY u.id
       ORDER BY track_count DESC
       LIMIT 10`,
      [userId, userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Suggested artists error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get public profile by ID
exports.getPublicProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, avatar, bio, city, country, created_at,
              first_name, last_name, phone,
              CASE WHEN show_email = 1 THEN email ELSE NULL END as email
       FROM users WHERE id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Public profile error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Check if logged-in user follows this profile
exports.checkFollowing = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id FROM follows WHERE follower_id = ? AND following_id = ?`,
      [req.user.id, req.params.id]
    );
    res.json({ isFollowing: rows.length > 0 });
  } catch (err) {
    console.error('Check following error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    await pool.query(
      'UPDATE users SET avatar = ? WHERE id = ?',
      [file.filename, userId]
    );

    res.json({
      message: 'Avatar updated',
      avatar: `http://localhost:3000/uploads/images/${file.filename}`
    });
  } catch (err) {
    console.error('Avatar update error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};