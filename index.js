const express = require('express');
const mongoose = require('mongoose');
const app = express();
app.use(express.json());
app.use(express.static('public'));

const mongoUri = process.env.MONGO_URI; 
mongoose.connect(mongoUri).then(() => console.log('✅ DB Connected'));

const productSchema = new mongoose.Schema({
    ownerWallet: String, title: String, description: String, mediaUrl: String,
    category: String, condition: String, 
    currency: { type: String, default: 'USDT' }, // ВАЛЮТА
    startPrice: Number, currentBid: Number,
    endTime: Date, 
    questions: [{ // ДИАЛОГИ
        userWallet: String, 
        text: String, 
        isSeller: Boolean,
        createdAt: { type: Date, default: Date.now } 
    }]
});
const Product = mongoose.model('Product', productSchema);

// API для отправки вопроса в лот
app.post('/api/products/:id/ask', async (req, res) => {
    const { wallet, text, isSeller } = req.body;
    const product = await Product.findById(req.params.id);
    product.questions.push({ userWallet: wallet, text, isSeller });
    await product.save();
    res.json(product);
});

app.get('/api/products', async (req, res) => res.json(await Product.find().sort({ createdAt: -1 })));
app.post('/api/products', async (req, res) => {
    const endTime = new Date(Date.now() + 86400000);
    const product = await Product.create({ ...req.body, currentBid: req.body.startPrice, endTime });
    res.json(product);
});

app.post('/api/bid', async (req, res) => {
    const { productId, wallet, amount } = req.body;
    const product = await Product.findById(productId);
    if (Number(amount) <= product.currentBid) return res.status(400).send("Low bid");
    product.currentBid = Number(amount);
    await product.save();
    res.json(product);
});

app.listen(process.env.PORT || 10000);