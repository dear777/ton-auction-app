const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const token = process.env.TELEGRAM_TOKEN;
const mongoUri = process.env.MONGO_URI; 

// НАСТРОЙКИ КОШЕЛЬКОВ
const MY_WALLET = "UQDqKsn27Rq-w8NYpWE7gv-X2wWm2ntCFlvs6gboqDP8A0xu";
const USDT_MASTER = "EQCxE6mUtQWq7sznu_G9vhqS6S86shwyuS_T5qPOW_S2V8W1";

// БЕЛЫЙ СПИСОК (Друзья, которые не платят 5$)
const WHITELIST = [
    "UQDqKsn27Rq-w8NYpWE7gv-X2wWm2ntCFlvs6gboqDP8A0xu", // Твой кошелек (админ)
    "АДРЕС_КОШЕЛЬКА_ДРУГА_1",
    "АДРЕС_КОШЕЛЬКА_ДРУГА_2",
    "АДРЕС_КОШЕЛЬКА_ДРУГА_3"
];

const bot = new TelegramBot(token, {polling: true});
const app = express();
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(mongoUri).then(() => console.log('✅ База Marketplace подключена!'));

const userSchema = new mongoose.Schema({
    wallet: { type: String, unique: true },
    tgId: String,
    tgNick: String,
    lang: { type: String, default: 'ru' },
    isPaid: { type: Boolean, default: false },
    karma: { type: Number, default: 100 },
    agreedToTerms: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
    ownerWallet: String, title: String, description: String, mediaUrl: String,
    condition: String, category: String, startPrice: Number, currentBid: Number,
    currency: String, highestBidder: { type: String, default: "Ставок нет" },
    endTime: Date, expireAt: { type: Date, index: { expires: 0 } },
    questions: [{ userWallet: String, text: String, answer: String, createdAt: { type: Date, default: Date.now } }]
});
const Product = mongoose.model('Product', productSchema);

// ПРОВЕРКА ПЛАТЕЖЕЙ USDT
async function checkUsdtPayments() {
    try {
        const url = `https://toncenter.com/api/v2/getJettonTransactions?address=${MY_WALLET}&limit=15`;
        const res = await axios.get(url);
        if (!res.data.result) return;

        for (let tx of res.data.result) {
            if (tx.amount === "5000000" && tx.comment && tx.comment.startsWith("PAY-")) {
                const sender = tx.source;
                await User.findOneAndUpdate({ wallet: sender }, { isPaid: true });
                console.log(`💰 Оплата подтверждена: ${sender}`);
            }
        }
    } catch (e) { console.error("Ошибка API:", e.message); }
}
setInterval(checkUsdtPayments, 60000);

// API РОУТЫ
app.post('/api/user/register', async (req, res) => {
    const user = await User.findOneAndUpdate({ wallet: req.body.wallet }, { ...req.body }, { upsert: true, new: true });
    res.json(user);
});

app.get('/api/user/:wallet', async (req, res) => {
    const wallet = req.params.wallet;
    let user = await User.findOne({ wallet: wallet });

    // ПРОВЕРКА ИСКЛЮЧЕНИЙ (WHITELIST)
    if (WHITELIST.includes(wallet)) {
        if (!user) {
            user = await User.create({ wallet: wallet, isPaid: true, agreedToTerms: true });
        } else if (!user.isPaid) {
            user.isPaid = true;
            await user.save();
        }
    }
    res.json(user || {});
});

app.get('/api/products', async (req, res) => {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
});

app.post('/api/products', async (req, res) => {
    const endTime = new Date(Date.now() + 86400000);
    const product = await Product.create({ ...req.body, currentBid: req.body.startPrice, endTime, expireAt: new Date(endTime.getTime() + 86400000) });
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