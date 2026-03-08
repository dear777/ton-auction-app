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
    mediaUrl: String, // Ссылка на файл в облаке
    mediaType: String, // 'image' или 'video'
    startPrice: Number,
    currentBid: Number,
    currency: String,
    highestBidder: String,
    endTime: Date,
    questions: [{ 
        userWallet: String, 
        text: String, 
        answer: String,
        createdAt: { type: Date, default: Date.now }
    }]
});
const Product = mongoose.model('Product', productSchema);

// API для форума: Удаление вопроса
app.delete('/api/products/:id/question/:qId', async (req, res) => {
    const { wallet } = req.body;
    const product = await Product.findById(req.params.id);
    const question = product.questions.id(req.params.qId);
    
    if (question.userWallet === wallet) {
        question.deleteOne();
        await product.save();
        res.json({ success: true });
    } else {
        res.status(403).send("Нет прав");
    }
});

// API для форума: Изменение вопроса
app.put('/api/products/:id/question/:qId', async (req, res) => {
    const { wallet, text } = req.body;
    const product = await Product.findById(req.params.id);
    const question = product.questions.id(req.params.qId);
    
    if (question.userWallet === wallet) {
        question.text = text;
        await product.save();
        res.json(product);
    } else {
        res.status(403).send("Нет прав");
    }
});

app.get('/api/products', async (req, res) => {
    const products = await Product.find().sort({ endTime: -1 });
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

// Добавление вопроса
app.post('/api/products/:id/question', async (req, res) => {
    const product = await Product.findById(req.params.id);
    product.questions.push({ userWallet: req.body.wallet, text: req.body.text });
    await product.save();
    res.json(product);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));