const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected Successfully to JetCluster'))
.catch(err => console.error('MongoDB connection error:', err));

// ==========================
// SCHEMAS & MODELS
// ==========================
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    profilePicUrl: { type: String, default: 'https://via.placeholder.com/150' },
    bio: { type: String, default: '' },
    isPro: { type: Boolean, default: false },
    walletBalance: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const postSchema = new mongoose.Schema({
    username: { type: String, required: true },
    mediaUrl: { type: String, required: true },
    caption: { type: String },
    isExclusive: { type: Boolean, default: false },
    likes: [{ type: String }],
    tipsCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});
const Post = mongoose.model('Post', postSchema);

const commentSchema = new mongoose.Schema({
    postId: { type: mongoose.Schema.Types.ObjectId, required: true },
    username: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', commentSchema);

const transactionSchema = new mongoose.Schema({
    username: { type: String, required: true },
    type: { type: String, enum: ['deposit', 'tip', 'subscription'], required: true },
    amount: { type: Number, required: true },
    recipient: { type: String },
    reference: { type: String },
    status: { type: String, default: 'completed' },
    createdAt: { type: Date, default: Date.now }
});
const Transaction = mongoose.model('Transaction', transactionSchema);

// ==========================
// BASIC ROUTE
// ==========================
app.get('/', (req, res) => {
    res.send('Jet App Backend with Monetization (Powered by Jersp AI) is running successfully!');
});

// ==========================
// USER & MONETIZATION ROUTES
// ==========================
app.get('/api/users/profile', async (req, res) => {
    try {
        const user = await User.findOne() || { 
            username: 'JetUser', 
            profilePicUrl: 'https://via.placeholder.com/150', 
            bio: 'Welcome to Jet!',
            isPro: false,
            walletBalance: 0 
        };
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

app.post('/api/posts/:postId/tip', async (req, res) => {
    try {
        const { postId } = req.params;
        const { senderUsername, amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid tip amount required' });
        }

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        post.tipsCount += amount;
        await post.save();

        const transaction = new Transaction({
            username: senderUsername || 'Anonymous',
            type: 'tip',
            amount,
            recipient: post.username
        });
        await transaction.save();

        res.status(200).json({ success: true, message: `Tipped $${amount} to @${post.username}!`, post });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send tip' });
    }
});

app.post('/api/payments/webhook', async (req, res) => {
    try {
        const { username, amount, reference } = req.body;
        
        await User.findOneAndUpdate(
            { username },
            { $inc: { walletBalance: amount } },
            { upsert: true }
        );

        const tx = new Transaction({ username, type: 'deposit', amount, reference });
        await tx.save();

        res.status(200).json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
  
