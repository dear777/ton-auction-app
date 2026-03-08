const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

// Данные подтянутся из настроек Render (Environment Variables)
const token = process.env.TELEGRAM_TOKEN;
const mongoUri = process.env.MONGO_URI; 
const webAppUrl = 'https://ton-auction-bot.onrender.com'; 

const bot = new TelegramBot(token, {polling: true});
const app = express();

app.use(express.json());
app.use(express.static('public'));

// 1. ПОДКЛЮЧЕНИЕ К БАЗЕ
mongoose.connect(mongoUri)
  .then(() => console.log('✅ Успешное подключение к MongoDB Atlas!'))
  .catch(err => console.error('❌ Ошибка подключения к базе:', err));

// 2. МОДЕЛЬ ДАННЫХ
const auctionSchema = new mongoose.Schema({
    lotId: String,
    currentBid: Number,
    highestBidder: String,
    endTime: Date
});

const Auction = mongoose.model('Auction', auctionSchema);

// 3. КОМАНДА /START
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    // Создаем лот, если база пустая
    let auction = await Auction.findOne({ lotId: "lot_1" });
    if (!auction) {
        auction = await Auction.create({
            lotId: "lot_1",
            currentBid: 10,
            highestBidder: "Никто",
            endTime: new Date(Date.now() + 24 * 60 * 60 * 1000) 
        });
    }

    bot.sendMessage(chatId, `💎 Добро пожаловать на Аукцион, ${msg.from.first_name}!`, {
        reply_markup: {
            inline_keyboard: [[
                { text: 'Открыть приложение', web_app: { url: webAppUrl } }
            ]]
        }
    });
});

// 4. API ДЛЯ ВЗАИМОДЕЙСТВИЯ С INDEX.HTML
app.get('/api/auction', async (req, res) => {
    try {
        const auction = await Auction.findOne({ lotId: "lot_1" });
        res.json(auction);
    } catch (e) {
        res.status(500).json({ error: "Ошибка базы данных" });
    }
});

app.post('/api/bid', async (req, res) => {
    const { userId, amount } = req.body;
    const auction = await Auction.findOne({ lotId: "lot_1" });
    const now = new Date();

    if (now > auction.endTime) {
        return res.status(400).json({ message: "Аукцион уже завершен!" });
    }

    if (amount <= auction.currentBid) {
        return res.status(400).json({ message: "Ставка должна быть выше текущей!" });
    }

    // ЛОГИКА АНТИСНАЙПА (Продление на 5 минут)
    const timeLeft = auction.endTime - now;
    if (timeLeft < 2 * 60 * 1000) { 
        auction.endTime = new Date(now.getTime() + 5 * 60 * 1000);
    }

    auction.currentBid = amount;
    auction.highestBidder = userId;
    await auction.save();

    res.json({ message: "Ставка принята!", auction });
});

// ПОРТ ДЛЯ RENDER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});