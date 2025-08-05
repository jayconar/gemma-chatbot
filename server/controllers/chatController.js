const axios = require('axios');
const db = require('../db');
const abortControllers = {};

const createNewChat = async (req, res) => {
  try {
    const title = `Chat ${Date.now()}`;
    const result = await db.query(
      'INSERT INTO chats (title) VALUES ($1) RETURNING *',
      [title]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating chat:', error.message);
    res.status(500).json({ error: 'Failed to create chat' });
  }
};

const getAllChats = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM chats ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching chats:', error.message);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

const getChatById = async (req, res) => {
  const { chatId } = req.params;
  try {
    const chatResult = await db.query(
      'SELECT * FROM chats WHERE id = $1',
      [chatId]
    );
    if (chatResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    const messagesResult = await db.query(
      'SELECT * FROM messages WHERE chat_id = $1 ORDER BY timestamp ASC',
      [chatId]
    );
    res.json({ 
      chat: chatResult.rows[0],
      messages: messagesResult.rows 
    });
  } catch (error) {
    console.error('Error fetching chat by ID:', error.message);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
};

const sendMessage = async (req, res) => {
  const { chatId } = req.params;
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  try {
    // Verify chat exists
    const chatExists = await db.query(
      'SELECT 1 FROM chats WHERE id = $1',
      [chatId]
    );
    if (chatExists.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    // Insert user message
    await db.query(
      'INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3)',
      [chatId, 'user', content]
    );

    // Fetch full conversation history
    const historyResult = await db.query(
      'SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY timestamp ASC',
      [chatId]
    );
    
    // Prepare prompt with full history
    const messages = historyResult.rows;
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    const abortController = new AbortController();
    abortControllers[chatId] = abortController;

    // Call Ollama with full context
    const response = await axios.post(
      'http://localhost:11434/api/generate',
      {
        model: 'gemma3:1b',
        prompt: prompt,
        stream: true
      },
      { 
        responseType: 'stream',
        signal: abortController.signal
      }
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let assistantReply = '';
    let buffer = '';
    
    response.data.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      lines.forEach(line => {
        if (!line.trim()) return;
        try {
          const json = JSON.parse(line);
          if (json.response) {
            assistantReply += json.response;
            res.write(json.response);
          }
        } catch (err) {
          console.error('Invalid chunk:', line);
        }
      });
    });

    response.data.on('end', async () => {
      // Insert assistant response
      await db.query(
        'INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3)',
        [chatId, 'assistant', assistantReply]
      );
      delete abortControllers[chatId];
      res.end();
    });

    response.data.on('error', (err) => {
      console.error('Stream error:', err);
      res.status(500).end();
    });
    
  } catch (error) {
    console.error('Error in sendMessage:', error.message);
    if (axios.isCancel(error)) {
      console.log(`Stream aborted for chat ${chatId}`);
      res.end();
    } else {
      res.status(500).json({ error: 'Failed to generate or store message.' });
    }
  }
};

const renameChat = async (req, res) => {
  const { chatId } = req.params;
  const { title } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title cannot be empty.' });
  }

  try {
    const result = await db.query(
      'UPDATE chats SET title = $1 WHERE id = $2 RETURNING *',
      [title.trim(), chatId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found.' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error renaming chat:', err.message);
    res.status(500).json({ error: 'Failed to rename chat' });
  }
};

const deleteChat = async (req, res) => {
  const { chatId } = req.params;
  try {
    const result = await db.query(
      'DELETE FROM chats WHERE id = $1 RETURNING id',
      [chatId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found.' });
    }
    
    res.json({ deleted: true });
  } catch (err) {
    console.error('Error deleting chat:', err.message);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
};

const deleteMessagesAfter = async (req, res) => {
  const { chatId, messageId } = req.params;
  try {
    const messageIdNum = BigInt(messageId);
    const timestampResult = await db.query(
      'SELECT timestamp FROM messages WHERE id = $1',
      [messageIdNum.toString()]
    );
    
    if (timestampResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const timestamp = timestampResult.rows[0].timestamp;
    await db.query(
      'DELETE FROM messages WHERE chat_id = $1 AND timestamp > $2',
      [chatId, timestamp]
    );
    
    res.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting messages:', error.message);
    res.status(500).json({ error: 'Failed to delete messages' });
  }
};

const stopGeneration = (req, res) => {
  const { chatId } = req.params;
  const controller = abortControllers[chatId];
  
  if (!controller) {
    return res.status(404).json({ error: 'No ongoing stream to stop.' });
  }
  
  controller.abort();
  delete abortControllers[chatId];
  res.json({ stopped: true });
};

module.exports = {
  createNewChat,
  getAllChats,
  getChatById,
  sendMessage,
  stopGeneration,
  renameChat,
  deleteChat,
  deleteMessagesAfter
};