const express = require('express');
const router = express.Router();

const auth = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');

console.log('Auth routes loaded');



//The auth middleware runs first.

// It:
// Reads the token from header
// Verifies JWT
// Decodes it
// Attaches user info to request

// TEMP test
router.get('/test', (req, res) => res.send('Auth route works'));

// Signup/Login
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Profile
router.get('/profile', auth, authController.getProfile);
router.patch('/profile', auth, authController.updateProfile);
router.delete('/profile', auth, authController.deleteProfile);

// Tokens
router.post('/refresh-token', authController.refreshToken);
router.get('/verify-email/:token', authController.verifyEmail);

// Password
router.patch('/update-password', auth, authController.updatePassword);
router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password/:token', authController.showResetPasswordForm);
router.post('/reset-password/:token', authController.resetPassword);



// Email change
router.post('/request-email-change', auth, authController.requestEmailChange);
router.get('/confirm-email-change/:token', authController.confirmEmailChange);

module.exports = router;
