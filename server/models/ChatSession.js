const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    messages: [{
        role: {
            type: String,
            enum: ['user', 'ai'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        sources: [String],
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('ChatSession', chatSessionSchema);
