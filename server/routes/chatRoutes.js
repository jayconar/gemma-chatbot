const express = require('express');
const router = express.Router();
const {
  createNewChat,
  getAllChats,
  getChatById,
  sendMessage,
  stopGeneration,
  renameChat,
  deleteChat,
  deleteMessagesAfter
} = require('../controllers/chatController');

router.post('/', createNewChat);
router.get('/', getAllChats);
router.get('/:chatId', getChatById);
router.post('/:chatId/message', sendMessage);
router.post('/:chatId/stop', stopGeneration);
router.delete('/:chatId/messages/after/:messageId', deleteMessagesAfter);
router.put('/:chatId', renameChat);
router.delete('/:chatId', deleteChat);

module.exports = router;
