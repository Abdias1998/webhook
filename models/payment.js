const mongoose = require('mongoose');

// Modèle de paiement
const paymentSchema = new mongoose.Schema({
    shop: String,
    amount: Number,
    phoneNumber: String,
    network: String,
    country: String,
    motif: { type: String, required: false },
    email: { type: String, required: false },
    first_name: { type: String, required: false },
    last_name: { type: String, required: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);