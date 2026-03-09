const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const token = process.env.TELEGRAM_TOKEN;
const mongoUri = process.env.MONGO_URI; 

const MY_WALLET = "UQDqKsn27Rq-w8NYpWE7gv-X2wWm2ntCFlvs6gboqDP8A0xu";
const USDT_MASTER = "UQCMBGKDkemwCw5ri-26tLDuEc2DgZ-Nn3DJeAjaOzqHhst_";

// Исключения для друзей
const WHITELIST = ["UQDqKsn27Rq-w8NYpWE7gv-X2wWm2ntCFlvs6gboqDP8A0xu"]; 

const app = express();
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(mongoUri).then(() => console.log('✅ DB Connected'));

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
    category: String, condition: String, startPrice: Number, currentBid: Number,
    currency: String, highestBidder: { type: String, default: "Ставок нет" },
    endTime: Date, expireAt: { type: Date, index: { expires: 0 } },
    questions: [{ userWallet: String, text: String, answer: String }]
});
const Product = mongoose.model('Product', productSchema);

// Авто-проверка оплаты подписки 5 USDT
async function checkUsdtPayments() {
    try {
        const res = await axios.get(`https://toncenter.com/api/v2/getJettonTransactions?address=${MY_WALLET}&limit=15`);
        if (!res.data.result) return;
        for (let tx of res.data.result) {
            if (tx.amount === "5000000" && tx.comment && tx.comment.startsWith("PAY-")) {
                await User.findOneAndUpdate({ wallet: tx.source }, { isPaid: true });
            }
        }
    } catch (e) { console.error("TON API Error"); }
}
setInterval(checkUsdtPayments, 60000);

app.get('/api/user/:wallet', async (req, res) => {
    const wallet = req.params.wallet;
    let user = await User.findOne({ wallet });
    if (WHITELIST.includes(wallet)) {
        if (!user) user = await User.create({ wallet, isPaid: true, agreedToTerms: true });
        else { user.isPaid = true; await user.save(); }
    }
    res.json(user || {});
});

app.post('/api/user/register', async (req, res) => {
    const user = await User.findOneAndUpdate({ wallet: req.body.wallet }, { ...req.body }, { upsert: true, new: true });
    res.json(user);
});

app.get('/api/products', async (req, res) => {
    res.json(await Product.find().sort({ createdAt: -1 }));
});

app.post('/api/products', async (req, res) => {
    const endTime = new Date(Date.now() + 86400000);
    const product = await Product.create({ ...req.body, currentBid: req.body.startPrice, endTime, expireAt: new Date(endTime.getTime() + 86400000) });
    res.json(product);
});

app.post('/api/bid', async (req, res) => {
    const { productId, wallet, amount } = req.body;
    const product = await Product.findById(productId);
    product.currentBid = Number(amount);
    product.highestBidder = wallet;
    await product.save();
    res.json(product);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));