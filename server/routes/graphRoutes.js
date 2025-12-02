const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

// GET /api/graph
router.get('/', auth, async (req, res) => {
    try {
        const response = await axios.get(`${AI_ENGINE_URL}/graph`, { params: req.query });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching graph data:', error.message);
        res.status(500).json({ message: 'Error fetching graph data' });
    }
});

module.exports = router;
