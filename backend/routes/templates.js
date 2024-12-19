const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { 
  getTemplates,
  getTemplate,
  createTemplate 
} = require('../controllers/templateController');

router.get('/', auth, getTemplates);
router.get('/:id', auth, getTemplate);
router.post('/', auth, createTemplate);

module.exports = router; 