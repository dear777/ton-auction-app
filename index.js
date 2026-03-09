const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const mongoUri = process.env.MONGO_URI; 
const MY_WALLET = "UQDqKsn27Rq-w8NYpWE7gv-X2wWm2ntCFlvs6gboqDP8A0xu";

// БЕЛЫЙ СПИСОК (АДМИНЫ)
const WHITELIST = [
    "UQDqKsn27Rq-w8NYpWE7gv-X2wWm2ntCFlvs6gboqDP8A0xu",
    "UQCMBGKDkemwCw5ri-26tLDuEc2DgZ-Nn3DJeAjaOzqHhst_"
];

const app = express();
app.use(express.json());
app.use(express.static('public'));

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
    startPrice: Number, currentBid: Number,
    endTime: Date, questions: Array
});
const Product = mongoose.model('Product', productSchema);

// API: Проверка юзера
app.get('/api/user/:wallet', async (req, res) => {
    const wallet = req.params.wallet;
    let user = await User.findOne({ wallet });
    const isAdmin = WHITELIST.includes(wallet);

    if (isAdmin) {
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

app.listen(process.env.PORT || 10000);