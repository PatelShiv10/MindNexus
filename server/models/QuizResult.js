const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema({
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('QuizResult', quizResultSchema);
