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
    currency: String,
    endTime: Date,
    questions: [{ 
        userWallet: String, 
        text: String, 
        answer: String,
        id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() }
    }]
});
const Product = mongoose.model('Product', productSchema);

// API: Все лоты
app.get('/api/products', async (req, res) => {
    const products = await Product.find().sort({ endTime: -1 });
    res.json(products);
});

// API: Создать (Блокировка изменения после публикации)
app.post('/api/products', async (req, res) => {
    const product = await Product.create({
        ...req.body,
        currentBid: req.body.startPrice,
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    res.json(product);
});

// API Форума: Удаление/Изменение вопроса
app.post('/api/products/:id/question/delete', async (req, res) => {
    const product = await Product.findById(req.params.id);
    product.questions = product.questions.filter(q => q._id.toString() !== req.body.qId);
    await product.save();
    res.json(product);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Сервер на порту ${PORT}`));