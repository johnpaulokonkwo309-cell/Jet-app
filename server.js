const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB Atlas Connected Successfully'))
.catch(err => console.error('MongoDB Connection Error:', err));

// Database Schemas & Models
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    isPro: { type: Boolean, default: false }
});

const postSchema = new mongoose.Schema({
    caption: String,
    videoUrl: String,
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    likes: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);

// 1. Root Status Route
app.get('/', (req, res) => {
    res.send('Jet App Backend with Monetization (Powered by Jersp AI) is running successfully!');
});

// 2. Posts Feed API Route
app.get('/api/posts/feed', async (req, res) => {
    try {
        const posts = await Post.find().populate('creator', 'username').sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching posts' });
    }
});

// 3. Paystack Payment Initialization Route
app.post('/api/paystack/initialize', async (req, res) => {
    try {
        const { email, amount } = req.body;
        const response = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            { email, amount: amount * 100 }, // Paystack expects amount in kobo/cents
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.response?.data || error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Jet App backend server is running on port ${PORT}`);
});
