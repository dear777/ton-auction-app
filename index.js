const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const token = process.env.TELEGRAM_TOKEN;
const mongoUri = process.env.MONGO_URI; 
const webAppUrl = 'https://ton-auction-bot.onrender.com/'; 

const bot = new TelegramBot(token, {polling: true});
const app = express();

app.use(express.json());
app.use(express.static('public'));

mongoose.connect(mongoUri)
  .then(() => console.log('✅ База данных подключена!'))
  .catch(err => console.error('❌ Ошибка базы:', err));

const auctionSchema = new mongoose.Schema({
    lotId: String,
    currentBid: Number,
    highestBidder: String,
    endTime: Date
});
const Auction = mongoose.model('Auction', auctionSchema);

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    let auction = await Auction.findOne({ lotId: "lot_1" });
    if (!auction) {
        auction = await Auction.create({
            lotId: "lot_1",
            currentBid: 10,
            highestBidder: "Никто",
            endTime: new Date(Date.now() + 24 * 60 * 60 * 1000) 
        });
    }
    bot.sendMessage(chatId, `👋 Привет, ${msg.from.first_name}! Аукцион запущен. Нажми на синюю кнопку в меню, чтобы открыть приложение.`);
});

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

    if (auction.endTime - now < 120000) {
        auction.endTime = new Date(now.getTime() + 300000);
    }

    auction.currentBid = amount;
    auction.highestBidder = userId;
    await auction.save();
    res.json({ message: "Ставка принята!", auction });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Сервер на порту ${PORT}`));