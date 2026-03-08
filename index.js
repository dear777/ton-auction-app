const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const mongoose = require('mongoose');

const token = process.env.TELEGRAM_TOKEN;
const mongoUri = process.env.MONGO_URI; 

const bot = new TelegramBot(token, {polling: true});
const app = express();
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(mongoUri).then(() => console.log('✅ База подключена!'));

// НОВАЯ СХЕМА ТОВАРА
const productSchema = new mongoose.Schema({
    ownerId: String,
    title: String,
    description: String,
    mediaUrl: String, // Фото или Видео
    startPrice: Number,
    currentBid: Number,
    currency: String, // TON, USD, ILS, BTC
    condition: String, // Новое, Б/У
    highestBidder: String,
    endTime: Date,
    questions: [{ user: String, text: String, answer: String }] // Обсуждение
});

const Product = mongoose.model('Product', productSchema);

// API: Создание лота пользователем
app.post('/api/products', async (req, res) => {
    const product = await Product.create({
        ...req.body,
        currentBid: req.body.startPrice,
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 часа по умолчанию
    });
    res.json(product);
});

// API: Ставка с Антиснайпером 10 минут
app.post('/api/bid', async (req, res) => {
    const { productId, userId, amount } = req.body;
    const product = await Product.findById(productId);
    const now = new Date();

    if (amount <= product.currentBid) return res.status(400).send("Ставка мала");
    
    // Антиснайпер: если до конца меньше 10 минут (600 000 мс)
    if (product.endTime - now < 600000) {
        product.endTime = new Date(now.getTime() + 600000); // Продлеваем на 10 мин
    }

    product.currentBid = amount;
    product.highestBidder = userId;
    await product.save();
    res.json(product);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Сервер на порту ${PORT}`));