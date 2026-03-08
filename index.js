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
    startPrice: Number,
    currentBid: Number,
    currency: { type: String, default: "TON" },
    endTime: Date,
    questions: [{ 
        userWallet: String, 
        text: String, 
        answer: String,
        createdAt: { type: Date, default: Date.now }
    }]
});
const Product = mongoose.model('Product', productSchema);

// ПОЛУЧЕНИЕ ВСЕХ ЛОТОВ
app.get('/api/products', async (req, res) => {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
});

// СОЗДАНИЕ ЛОТА (БЕЗ ПРАВА ПРАВКИ)
app.post('/api/products', async (req, res) => {
    const product = await Product.create({
        ...req.body,
        currentBid: req.body.startPrice,
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    res.json(product);
});

// ФОРУМ: ДОБАВИТЬ ВОПРОС
app.post('/api/products/:id/question', async (req, res) => {
    const product = await Product.findById(req.params.id);
    product.questions.push({ userWallet: req.body.wallet, text: req.body.text });
    await product.save();
    res.json(product);
});

// ФОРУМ: УДАЛИТЬ ВОПРОС
app.post('/api/products/:id/question/delete', async (req, res) => {
    const product = await Product.findById(req.params.id);
    product.questions = product.questions.filter(q => q._id.toString() !== req.body.qId);
    await product.save();
    res.json(product);
});

// ФОРУМ: ОТВЕТ АВТОРА
app.post('/api/products/:id/answer', async (req, res) => {
    const product = await Product.findById(req.params.id);
    const question = product.questions.id(req.body.qId);
    if (product.ownerWallet.toLowerCase() === req.body.wallet.toLowerCase()) {
        question.answer = req.body.answer;
        await product.save();
        res.json(product);
    } else {
        res.status(403).send("Только автор отвечает");
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Сервер на порту ${PORT}`));