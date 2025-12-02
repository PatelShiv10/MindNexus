const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

router.post('/', auth, chatController.chatWithCortex);
router.get('/', auth, chatController.getChatHistory);
router.get('/:id', auth, chatController.getSession);
router.delete('/:id', auth, chatController.deleteSession);

module.exports = router;
