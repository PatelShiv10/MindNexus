const axios = require('axios');
const ChatSession = require('../models/ChatSession');

// POST /api/chat
exports.chatWithCortex = async (req, res) => {
    try {
        const { query, doc_ids, sessionId } = req.body;

        // 1. Call AI Engine
        const aiResponse = await axios.post('http://localhost:8000/chat', {
            query,
            doc_ids
        });

        const { answer, sources } = aiResponse.data;

        // 2. Handle Session Persistence
        let session;

        if (sessionId) {
            // Append to existing session
            session = await ChatSession.findOne({ _id: sessionId, user: req.user.id });
            if (!session) {
                return res.status(404).json({ message: 'Session not found' });
            }
        } else {
            // Create new session
            session = new ChatSession({
                user: req.user.id,
                title: query.substring(0, 30) + (query.length > 30 ? '...' : ''),
                messages: []
            });
        }

        // Add User Message
        session.messages.push({
            role: 'user',
            content: query
        });

        // Add AI Message
        session.messages.push({
            role: 'ai',
            content: answer,
            sources: sources
        });

        await session.save();

        res.json({
            answer,
            sources,
            sessionId: session._id
        });

    } catch (error) {
        console.error('AI Engine Error:', error.message);
        res.status(500).json({ message: 'Error communicating with AI Engine' });
    }
};

// GET /api/chat
exports.getChatHistory = async (req, res) => {
    try {
        const sessions = await ChatSession.find({ user: req.user.id })
            .select('_id title updatedAt')
            .sort({ updatedAt: -1 });
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching chat history' });
    }
};

// GET /api/chat/:id
exports.getSession = async (req, res) => {
    try {
        const session = await ChatSession.findOne({ _id: req.params.id, user: req.user.id });
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }
        res.json(session);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching session' });
    }
};

// DELETE /api/chat/:id
exports.deleteSession = async (req, res) => {
    try {
        const session = await ChatSession.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }
        res.json({ message: 'Session deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting session' });
    }
};
