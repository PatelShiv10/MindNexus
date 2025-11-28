const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Middleware to verify token (simplified version of what might be in authRoutes)
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access Denied' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: 'Invalid Token' });
    }
};

// Create a new Subject
router.post('/subject', verifyToken, async (req, res) => {
    try {
        const { name, description, documents } = req.body;
        const subject = new Subject({
            name,
            description,
            documents,
            user: req.user._id
        });
        const savedSubject = await subject.save();
        res.status(201).json(savedSubject);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get all Subjects for the user
router.get('/subject', verifyToken, async (req, res) => {
    try {
        const subjects = await Subject.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(subjects);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Generate Quiz
router.post('/generate', verifyToken, async (req, res) => {
    try {
        const { subjectId, difficulty } = req.body;

        // 1. Fetch Subject to get Document IDs
        const subject = await Subject.findOne({ _id: subjectId, user: req.user._id });
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        if (!subject.documents || subject.documents.length === 0) {
            return res.status(400).json({ message: 'Subject has no documents linked.' });
        }

        // 2. Call AI Engine
        const aiResponse = await axios.post(`${process.env.AI_ENGINE_URL}/generate_quiz`, {
            doc_ids: subject.documents, // Passing ObjectId array
            difficulty: difficulty || 'Medium',
            types: ["MCQ", "MSQ", "Descriptive"] // Default types
        });

        res.json(aiResponse.data);

    } catch (err) {
        console.error("Quiz Generation Error:", err.message);
        res.status(500).json({ message: 'Failed to generate quiz', error: err.message });
    }
});

module.exports = router;
