require('dotenv').config();
const User = require('../models/User');
const { hash, compare } = require('bcryptjs');
const { sign } = require('jsonwebtoken');
const { createTransport } = require('nodemailer');
const { Feexpay } = require('feexpay-sdk');
const mongoose = require('mongoose');
const Payment = require('../models/payment');
const path = require('path');
const fs = require('fs');
const fetchWithRetry = require("../utils/fetchWithRetry");
const logger = require("../utils/logger");
// Initialisation du SDK avec vos clés Feexpay
const feexpay = new Feexpay(
  process.env.FEEXPAY_API_KEY,
  {
    mode: 'LIVE',         // 'LIVE' ou 'TEST'
    timeout: 30000,       // Timeout des requêtes (en ms)
    maxRetries: 3         // Nombre de tentatives en cas d’échec
  }
);
const transporter = createTransport({
  service: 'gmail',
  auth: {
    user: process.env.user,
    pass: process.env.pass
  }
});
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }

    // Hasher le mot de passe
    const hashedPassword = await hash(password, 10);

    // Créer un nouvel utilisateur
    const user = new User({
      email,
      password: hashedPassword
    });   

    await user.save();

    // Créer le token JWT
    const token = sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      token
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'inscription", error: error.message });
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // Vérifier le mot de passe
    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // Créer le token JWT
    const token = sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: "Connexion réussie",
      token
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la connexion", error: error.message }); 

  }
}
exports.payments = async (req, res) => {
  try {
    const payment = await feexpay.payment.createGlobal({
      amount: req.body.amount,
      shop: req.body.shop,
      callback_info: req.body.callback_info,
      phoneNumber: req.body.phoneNumber,
      motif: req.body.motif,
      network: req.body.network,
      email: req.body.email
    });

    return res.json(payment);

  } catch (error) {
    res.status(400).json({ 
      success: false,
      error: {
        message: error.message,
        code: error.code || 'PAYMENT_FAILED'
      }
    });
  }
}

// Fonction pour logger dans un fichier
function logWebhook(data) {
  const logDir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

  const logPath = path.join(logDir, "webhook.log");
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${JSON.stringify(data)}\n`);
}
exports.webhook = async (req, res) => {
  try {
    const payload = req.body;
    const { reference, status, amount, first_name, last_name, email, date, reseau } = payload;
    logger.info("Webhook reçu", { payload });
    logWebhook(payload);
    console.log("Webhook reçu de FeexPay :", payload);

    if (status === "SUCCESSFUL" || status === "FAILED") {
      try {
        const { data, duration } = await fetchWithRetry(
          `https://api.feexpay.me/api/transactions/public/single/status/${reference}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.FEEXPAY_API_KEY}`,
            },
          },
          3,
          2000
        );
    
        console.log("Réponse API:", data);
        console.log(`Temps de réponse de la requête GET status: ${duration} ms`);
      } catch (apiError) {
        console.error("Erreur après plusieurs tentatives:", apiError.message);
      }
    
      console.log(`Mail simulé pour l'envoi de webhook ${status}`);
    }
    

    res.status(200).json({ message: "Webhook traité avec succès." });
  } catch (error) {
    logger.error("Erreur traitement webhook", { error: error.message });
    console.error("Erreur traitement webhook :", error);
    res.status(500).json({ message: "Erreur serveur lors du traitement du webhook." });
  }
};

// controllers/webhookController.js
// exports.webhook = async (req, res) => {
//   try {
//      const payload = req.body;
//     const { reference, status, amount, first_name, last_name, email, date, reseau } = payload

//     console.log("Webhook reçu :", payload);

//     // Ici, on ne fait pas la vérification. Juste un accusé de réception.
//     res.status(200).json({ message: "Webhook reçu avec succès." });
//   } catch (error) {
//     console.error("Erreur réception webhook :", error);
//     res.status(500).json({ message: "Erreur serveur." });
//   }
// };

