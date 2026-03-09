const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const mongoUri = process.env.MONGO_URI; 
const MY_WALLET = "UQDqKsn27Rq-w8NYpWE7gv-X2wWm2ntCFlvs6gboqDP8A0xu";
const WHITELIST_WALLETS = ["UQDqKsn27Rq-w8NYpWE7gv-X2wWm2ntCFlvs6gboqDP8A0xu"];

mongoose.connect(mongoUri).then(() => console.log('✅ DB Connected'));

const userSchema = new mongoose.Schema({
    tgId: { type: String, unique: true },
    wallet: String,
    isPaid: { type: Boolean, default: false },
    karma: { type: Number, default: 100 }
});
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
    ownerTgId: String, 
    title: String, 
    description: String, 
    mediaUrl: String,
    category: String, 
    currency: String,
    startPrice: Number, 
    currentBid: Number,
    endTime: Date, 
    questions: [{ 
        userTgId: String, 
        userName: String, 
        text: String, 
        isSeller: Boolean, 
        createdAt: { type: Date, default: Date.now } 
    }]
});
const Product = mongoose.model('Product', productSchema);

app.post('/api/auth', async (req, res) => {
    const { tgId, wallet } = req.body;
    let user = await User.findOne({ tgId });
    const isVip = WHITELIST_WALLETS.includes(wallet);
    if (!user) {
        user = await User.create({ tgId, wallet, isPaid: isVip, karma: 100 });
    } else if (isVip) {
        user.isPaid = true; await user.save();
    }
    res.json(user);
});

app.get('/api/products', async (req, res) => res.json(await Product.find().sort({ createdAt: -1 })));

app.post('/api/products', async (req, res) => {
    const product = await Product.create({ 
        ...req.body, 
        currentBid: req.body.startPrice,
        endTime: new Date(Date.now() + 86400000) 
    });
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