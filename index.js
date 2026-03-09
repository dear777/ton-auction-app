const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const mongoUri = process.env.MONGO_URI; 
const MY_WALLET = "UQDqKsn27Rq-w8NYpWE7gv-X2wWm2ntCFlvs6gboqDP8A0xu";
const WHITELIST = [
    "UQDqKsn27Rq-w8NYpWE7gv-X2wWm2ntCFlvs6gboqDP8A0xu",
    "UQCMBGKDkemwCw5ri-26tLDuEc2DgZ-Nn3DJeAjaOzqHhst_"
];

mongoose.connect(mongoUri).then(() => console.log('✅ DB Connected'));

const userSchema = new mongoose.Schema({
    wallet: { type: String, unique: true },
    isPaid: { type: Boolean, default: false },
    karma: { type: Number, default: 100 }
});
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
    ownerWallet: String, title: String, description: String, mediaUrl: String,
    category: String, currency: { type: String, default: "USDT" },
    startPrice: Number, currentBid: Number, endTime: Date,
    questions: [{ userWallet: String, text: String, isSeller: Boolean, createdAt: { type: Date, default: Date.now } }]
});
const Product = mongoose.model('Product', productSchema);

app.get('/api/user/:wallet', async (req, res) => {
    const wallet = req.params.wallet;
    let user = await User.findOne({ wallet });
    if (WHITELIST.includes(wallet)) {
        if (!user) user = await User.create({ wallet, isPaid: true, karma: 100 });
        else { user.isPaid = true; await user.save(); }
    }
    res.json(user || { karma: 0, isPaid: false });
});

app.get('/api/products', async (req, res) => res.json(await Product.find().sort({ createdAt: -1 })));

app.post('/api/products', async (req, res) => {
    const product = await Product.create({ ...req.body, currentBid: req.body.startPrice, endTime: new Date(Date.now() + 86400000) });
    res.json(product);
});

app.post('/api/bid', async (req, res) => {
    const { productId, amount } = req.body;
    const product = await Product.findById(productId);
    product.currentBid = Number(amount);
    await product.save();
    res.json(product);
});

app.post('/api/products/:id/ask', async (req, res) => {
    const product = await Product.findById(req.params.id);
    product.questions.push(req.body);
    await product.save();
    res.json(product);
});

app.listen(process.env.PORT || 10000);