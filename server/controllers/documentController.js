const Document = require('../models/Document');
const ChatSession = require('../models/ChatSession');
const axios = require('axios');
const FormData = require('form-data');

exports.uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Create initial document record
        const doc = new Document({
            title: req.file.originalname,
            user: req.user.id, // Assuming auth middleware adds user to req
            fileType: req.file.mimetype,
            size: req.file.size,
            status: 'processing'
        });

        await doc.save();

        // Prepare form data for AI Engine
        const formData = new FormData();
        formData.append('file', req.file.buffer, req.file.originalname);
        formData.append('doc_id', doc._id.toString());

        // Forward to AI Engine
        // Note: We don't await this if we want to return immediately, 
        // but the requirement says "If Python responds with success, update... status to ready"
        // and "Return the document to the client". 
        // Usually this is async, but for this step we'll await to confirm ingestion.

        try {
            const aiResponse = await axios.post(`${process.env.AI_ENGINE_URL}/ingest`, formData, {
                headers: {
                    ...formData.getHeaders()
                }
            });

            if (aiResponse.status === 200) {
                doc.status = 'ready';
                await doc.save();
            }
        } catch (aiError) {
            console.error('AI Engine Ingest Error:', aiError.message);
            doc.status = 'error';
            await doc.save();
            // We still return the document, but with error status
        }

        res.status(201).json(doc);

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getUserDocuments = async (req, res) => {
    try {
        const documents = await Document.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(documents);
    } catch (error) {
        console.error('Fetch Documents Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);

        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Check user ownership
        if (doc.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // 1. Delete from AI Engine (Chroma + Neo4j)
        try {
            await axios.delete(`${process.env.AI_ENGINE_URL}/document/${doc._id}`);
            console.log(`AI Memory wiped for doc: ${doc._id}`);
        } catch (aiError) {
            console.error('AI Engine Delete Error:', aiError.message);
            // Continue to delete from Mongo even if AI fails (to avoid zombie records in UI)
        }

        // 2. Delete from MongoDB
        await doc.deleteOne();
        res.json({ message: 'Document removed' });
    } catch (error) {
        console.error('Delete Document Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.purgeAllData = async (req, res) => {
    try {
        // 1. Wipe AI Engine (Chroma + Neo4j)
        try {
            await axios.delete(`${process.env.AI_ENGINE_URL}/purge`);
            console.log('AI Memory Purged');
        } catch (aiError) {
            console.error('AI Engine Purge Error:', aiError.message);
            // Continue to wipe Mongo even if AI fails
        }

        // 2. Wipe MongoDB Documents
        await Document.deleteMany({ user: req.user.id });
        console.log('MongoDB Documents Purged');

        // 3. Wipe Chat History
        await ChatSession.deleteMany({ user: req.user.id });
        console.log('Chat History Purged');

        res.json({ message: 'System Reset Complete' });

    } catch (error) {
        console.error('Purge Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.generatePodcast = async (req, res) => {
    try {
        const { doc_id } = req.body;

        if (!doc_id) {
            return res.status(400).json({ message: 'Document ID is required' });
        }

        // Call AI Engine
        const response = await axios.post(`${process.env.AI_ENGINE_URL}/podcast`, { doc_id });

        res.json(response.data);
    } catch (error) {
        console.error('Podcast Generation Error:', error.message);
        res.status(500).json({ message: 'Failed to generate podcast' });
    }
};
