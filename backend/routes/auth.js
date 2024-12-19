const express = require('express');
const router = express.Router();
const { register, login, test } = require('../controllers/authController');
const { body } = require('express-validator');
const auth = require('../middleware/auth');

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Auth server is running' });
});

// Register route with validation
router.post('/register', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
], register);

// Login route with validation
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], login);

// Add this route
router.get('/validate', auth, (req, res) => {
  res.json({ valid: true });
});

module.exports = router; 