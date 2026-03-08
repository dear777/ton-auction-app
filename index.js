const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const mongoose = require('mongoose');

const token = process.env.TELEGRAM_TOKEN;
const mongoUri = process.env.MONGO_URI; 

const bot = new TelegramBot(token, {polling: true});
const app = express();
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(mongoUri).then(() => console.log('✅ База Marketplace подключена!'));

const productSchema = new mongoose.Schema({
    ownerWallet: String,
    title: String,
    description: String,
    mediaUrl: String,
    condition: String,
    category: String,
    startPrice: Number,
    currentBid: Number,
    currency: String,
    highestBidder: { type: String, default: "Ставок нет" },
    endTime: Date,
    questions: [{ userWallet: String, text: String, answer: String, createdAt: { type: Date, default: Date.now } }]
});
const Product = mongoose.model('Product', productSchema);

app.get('/api/products', async (req, res) => {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
});

app.post('/api/products', async (req, res) => {
    const product = await Product.create({
        ...req.body,
        currentBid: req.body.startPrice,
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    res.json(product);
});

app.post('/api/bid', async (req, res) => {
    const { productId, wallet, amount } = req.body;
    const product = await Product.findById(productId);
    const now = new Date();
    if (now > product.endTime) return res.status(400).send("Торги окончены");
    if (amount <= product.currentBid) return res.status(400).send("Ставка мала");
    if (product.endTime - now < 600000) product.endTime = new Date(now.getTime() + 600000);
    product.currentBid = amount;
    product.highestBidder = wallet;
    await product.save();
    res.json(product);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Сервер запущен`));