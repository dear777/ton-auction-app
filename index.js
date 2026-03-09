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

// МОДЕЛЬ ПОЛЬЗОВАТЕЛЯ
const userSchema = new mongoose.Schema({
    wallet: { type: String, unique: true },
    tgId: String,       // User ID Telegram
    tgNick: String,     // Никнейм
    lang: { type: String, default: 'ru' },
    isPaid: { type: Boolean, default: false }, // Статус подписки 5$
    karma: { type: Number, default: 100 },      // Кредитные баллы
    agreedToTerms: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

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
    expireAt: { type: Date, index: { expires: 0 } }, 
    questions: [{ userWallet: String, text: String, answer: String, createdAt: { type: Date, default: Date.now } }]
});
const Product = mongoose.model('Product', productSchema);

// API ПОЛЬЗОВАТЕЛЯ
app.post('/api/user/register', async (req, res) => {
    const user = await User.findOneAndUpdate(
        { wallet: req.body.wallet },
        { ...req.body },
        { upsert: true, new: true }
    );
    res.json(user);
});

app.get('/api/user/:wallet', async (req, res) => {
    const user = await User.findOne({ wallet: req.params.wallet });
    res.json(user);
});

app.get('/api/products', async (req, res) => {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
});

app.post('/api/products', async (req, res) => {
    const endTime = new Date(Date.now() + 24*60*60*1000);
    const product = await Product.create({
        ...req.body,
        currentBid: req.body.startPrice,
        endTime: endTime,
        expireAt: new Date(endTime.getTime() + 86400000)
    });
    res.json(product);
});

app.post('/api/bid', async (req, res) => {
    const { productId, wallet, amount } = req.body;
    const product = await Product.findById(productId);
    if (new Date() > product.endTime) return res.status(400).send("Finished");
    product.currentBid = Number(amount);
    product.highestBidder = wallet;
    await product.save();
    res.json(product);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Gold Auction Server Live`));