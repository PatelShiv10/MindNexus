require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
const trainingRoutes = require('./routes/trainingRoutes');
app.use('/api/training', trainingRoutes);

// Bridge Endpoint
app.get('/api/system-status', async (req, res) => {
  try {
    const aiResponse = await axios.get(`${process.env.AI_ENGINE_URL}/health`);
    if (aiResponse.data.status === 'healthy') {
      res.json({ gateway: "Online", ai_engine: "Online" });
    } else {
      res.json({ gateway: "Online", ai_engine: "Offline" });
    }
  } catch (error) {
    console.error("Error connecting to AI Engine:", error.message);
    res.json({ gateway: "Online", ai_engine: "Offline" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
