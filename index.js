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

// МОДЕЛЬ ТОВАРА С ОБСУЖДЕНИЕМ
const productSchema = new mongoose.Schema({
    ownerWallet: String,
    title: String,
    description: String,
    mediaUrl: String,      // Ссылка на фото или видео
    startPrice: Number,
    currentBid: Number,
    currency: String,
    highestBidder: String,
    endTime: Date,
    questions: [{ 
        user: String, 
        text: String, 
        answer: String,
        createdAt: { type: Date, default: Date.now }
    }]
});
const Product = mongoose.model('Product', productSchema);

// API: Список лотов
app.get('/api/products', async (req, res) => {
    const products = await Product.find().sort({ endTime: -1 });
    res.json(products);
});

// API: Создать лот (БЕЗ ВОЗМОЖНОСТИ ИЗМЕНЕНИЯ ПОЗЖЕ)
app.post('/api/products', async (req, res) => {
    const product = await Product.create({
        ...req.body,
        currentBid: req.body.startPrice,
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    res.json(product);
});

// API: Задать вопрос
app.post('/api/products/:id/question', async (req, res) => {
    const product = await Product.findById(req.params.id);
    product.questions.push({ user: req.body.user, text: req.body.text });
    await product.save();
    res.json(product);
});

// API: Ответить на вопрос (только для автора)
app.post('/api/products/:id/answer', async (req, res) => {
    const product = await Product.findById(req.params.id);
    const question = product.questions.id(req.body.questionId);
    if (product.ownerWallet.toLowerCase() === req.body.wallet.toLowerCase()) {
        question.answer = req.body.answer;
        await product.save();
        res.json(product);
    } else {
        res.status(403).send("Только автор может отвечать");
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));