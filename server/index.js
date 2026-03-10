require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ──────────────────────────────────────────────
// NOTE: This server now handles ONLY Authentication.
// All other routes (documents, chat, graph) are served
// by the Python FastAPI gateway (python-gateway/).
// ──────────────────────────────────────────────

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Auth Routes only
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/auth/health', (req, res) => {
  res.json({ status: 'Auth server running', port: PORT });
});

app.listen(PORT, () => {
  console.log(`[Auth Server] Running on port ${PORT}`);
});
