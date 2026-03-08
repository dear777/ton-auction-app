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
  .then(() => console.log('✅ База данных подключена!'))
  .catch(err => console.error('❌ Ошибка базы (проверь IP Whitelist):', err));

// 2. МОДЕЛЬ АУКЦИОНА
const auctionSchema = new mongoose.Schema({
    lotId: String,
    currentBid: Number,
    highestBidder: String,
    endTime: Date
});
const Auction = mongoose.model('Auction', auctionSchema);

// 3. КОМАНДА /START (БЕЗ КНОПОК В ТЕКСТЕ)
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        let auction = await Auction.findOne({ lotId: "lot_1" });
        if (!auction) {
            auction = await Auction.create({
                lotId: "lot_1",
                currentBid: 10,
                highestBidder: "Никто",
                endTime: new Date(Date.now() + 24 * 60 * 60 * 1000) 
            });
        }

        bot.sendMessage(chatId, `👋 Привет, ${msg.from.first_name}! Аукцион запущен. Нажми на синюю кнопку слева от поля ввода, чтобы открыть приложение.`);
    } catch (err) {
        console.error('Ошибка в /start:', err);
    }
});

// 4. API ДЛЯ ПРИЛОЖЕНИЯ
app.get('/api/auction', async (req, res) => {
    const auction = await Auction.findOne({ lotId: "lot_1" });
    res.json(auction);
});

app.post('/api/bid', async (req, res) => {
    const { userId, amount } = req.body;
    const auction = await Auction.findOne({ lotId: "lot_1" });
    const now = new Date();

    if (now > auction.endTime) return res.status(400).json({ message: "Торги окончены" });
    if (amount <= auction.currentBid) return res.status(400).json({ message: "Ставка слишком мала" });

    // Антиснайп: продление на 5 мин
    if (auction.endTime - now < 120000) {
        auction.endTime = new Date(now.getTime() + 300000);
    }

    auction.currentBid = amount;
    auction.highestBidder = userId;
    await auction.save();
    res.json({ message: "Ставка принята!", auction });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});