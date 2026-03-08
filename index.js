const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

// Переменные окружения из настроек Render
const token = process.env.TELEGRAM_TOKEN;
const mongoUri = process.env.MONGO_URI; 

const bot = new TelegramBot(token, {polling: true});
const app = express();

app.use(express.json());
app.use(express.static('public'));

// 1. ПОДКЛЮЧЕНИЕ К БАЗЕ MONGO
mongoose.connect(mongoUri)
  .then(() => console.log('✅ База данных Marketplace подключена!'))
  .catch(err => console.error('❌ Ошибка базы:', err));

// 2. РАСШИРЕННАЯ МОДЕЛЬ ТОВАРА
const productSchema = new mongoose.Schema({
    ownerWallet: String,    // Кошелек создателя
    title: String,          // Название
    description: String,    // Описание и условия
    startPrice: Number,     // Начальная цена
    currentBid: Number,     // Текущая ставка
    currency: String,       // TON, USD, ILS, BTC
    highestBidder: String,  // Кошелек лидера
    endTime: Date,          // Время окончания
    createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

// 3. КОМАНДА /START
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `👋 Привет, ${msg.from.first_name}! \n\nДобро пожаловать в TON Marketplace. \nЗдесь ты можешь просматривать активные лоты или выставить свой товар на аукцион. \n\nНажми кнопку меню "Open Auction", чтобы войти.`);
});

// 4. API: ПОЛУЧИТЬ ВСЕ ЛОТЫ
app.get('/api/products', async (req, res) => {
    try {
        // Возвращаем только активные аукционы, отсортированные по времени создания
        const products = await Product.find({ endTime: { $gt: new Date() } }).sort({ createdAt: -1 });
        res.json(products);
    } catch (e) {
        res.status(500).json({ error: "Ошибка при получении списка товаров" });
    }
});

// 5. API: СОЗДАТЬ НОВЫЙ ЛОТ
app.post('/api/products', async (req, res) => {
    try {
        const { title, description, startPrice, currency, ownerWallet } = req.body;
        
        const newProduct = await Product.create({
            ownerWallet,
            title,
            description,
            startPrice: Number(startPrice),
            currentBid: Number(startPrice),
            currency,
            highestBidder: "Ставок нет",
            // По умолчанию аукцион длится 24 часа
            endTime: new Date(Date.now() + 24 * 60 * 60 * 1000) 
        });
        
        res.json(newProduct);
    } catch (e) {
        res.status(500).json({ error: "Не удалось создать лот" });
    }
});

// 6. API: СДЕЛАТЬ СТАВКУ (С АНТИСНАЙПЕРОМ 10 МИНУТ)
app.post('/api/bid', async (req, res) => {
    try {
        const { productId, userId, amount } = req.body;
        const product = await Product.findById(productId);
        const now = new Date();

        if (!product) return res.status(404).json({ message: "Лот не найден" });
        if (now > product.endTime) return res.status(400).json({ message: "Торги по этому лоту уже окончены" });
        if (amount <= product.currentBid) return res.status(400).json({ message: "Ставка должна быть выше текущей" });

        // ЛОГИКА АНТИСНАЙПЕРА (10 МИНУТ = 600 000 мс)
        const timeLeft = product.endTime - now;
        if (timeLeft < 10 * 60 * 1000) { 
            // Если до конца меньше 10 минут, продлеваем еще на 10 минут от текущего момента
            product.endTime = new Date(now.getTime() + 10 * 60 * 1000);
        }

        product.currentBid = amount;
        product.highestBidder = userId; // Здесь передаем адрес кошелька
        await product.save();

        res.json({ message: "Ставка принята!", product });
    } catch (e) {
        res.status(500).json({ error: "Ошибка при обработке ставки" });
    }
});

// ПОРТ ДЛЯ RENDER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Marketplace Server запущен на порту ${PORT}`);
});