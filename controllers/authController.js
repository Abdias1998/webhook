require('dotenv').config();
const User = require('../models/User');
const { hash, compare } = require('bcryptjs');
const { sign } = require('jsonwebtoken');
const { createTransport } = require('nodemailer');
const { Feexpay } = require('feexpay-sdk');
const mongoose = require('mongoose');
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
// webhookController.js
exports.webhook = async (req, res) => {
  try {
    const payload = req.body;

    const {
      reference,
      status,
      amount,
      callback_info,
      last_name,
      first_name,
      email,
      type,
      phoneNumber,
      date,
      reseau,
      ref_link,
    } = payload;

    console.log("Webhook reçu de FeexPay :", payload);

    let mailOptions;
if (status === "SUCCESSFUL") {
  mailOptions = {
    from: process.env.user,
    to: email,
    subject: "✅ Transaction traitée avec succès",
    text: `Bonjour ${first_name || ""} ${last_name || ""},

Votre transaction ${reference} d’un montant de ${amount} XOF a été traitée avec succès le ${new Date(date).toLocaleString()}.

Merci d’avoir utilisé notre service.

-- 
L’équipe FeexPay
    `,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background:#f9f9f9;">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 0 5px rgba(0,0,0,0.1);">
          <div style="background:#4CAF50;color:#fff;padding:15px;text-align:center;">
            <h2>Transaction réussie ✅</h2>
          </div>
          <div style="padding:20px;color:#333;">
            <p>Bonjour <b>${first_name || ""} ${last_name || ""}</b>,</p>
            <p>Nous avons le plaisir de vous informer que votre transaction a été <b>traitée avec succès</b>.</p>
            <ul>
              <li><b>Référence :</b> ${reference}</li>
              <li><b>Montant :</b> ${amount} XOF</li>
              <li><b>Date :</b> ${new Date(date).toLocaleString()}</li>
              <li><b>Réseau :</b> ${reseau}</li>
            </ul>
            <p>Merci d’avoir choisi <b>FeexPay</b> 🚀</p>
          </div>
          <div style="background:#f1f1f1;padding:10px;text-align:center;font-size:12px;color:#777;">
            © ${new Date().getFullYear()} FeexPay - Tous droits réservés
          </div>
        </div>
      </div>
    `
  };
} else if (status === "FAILED") {
  mailOptions = {
    from: process.env.user,
    to: email,
    subject: "❌ Transaction échouée",
    text: `Bonjour ${first_name || ""} ${last_name || ""},

Votre transaction ${reference} d’un montant de ${amount} XOF a échoué le ${new Date(date).toLocaleString()}.

Si vous pensez qu’il s’agit d’une erreur, merci de contacter le support FeexPay.

-- 
L’équipe FeexPay
    `,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background:#f9f9f9;">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 0 5px rgba(0,0,0,0.1);">
          <div style="background:#E53935;color:#fff;padding:15px;text-align:center;">
            <h2>Transaction échouée ❌</h2>
          </div>
          <div style="padding:20px;color:#333;">
            <p>Bonjour <b>${first_name || ""} ${last_name || ""}</b>,</p>
            <p>Votre transaction a malheureusement <b>échoué</b>. Voici les détails :</p>
            <ul>
              <li><b>Référence :</b> ${reference}</li>
              <li><b>Montant :</b> ${amount} XOF</li>
              <li><b>Date :</b> ${new Date(date).toLocaleString()}</li>
              <li><b>Réseau :</b> ${reseau}</li>
            </ul>
            <p>Si vous pensez qu’il s’agit d’une erreur, veuillez <a href="mailto:support@feexpay.me">contacter notre support</a>.</p>
          </div>
          <div style="background:#f1f1f1;padding:10px;text-align:center;font-size:12px;color:#777;">
            © ${new Date().getFullYear()} FeexPay - Tous droits réservés
          </div>
        </div>
      </div>
    `
  };
}


    if (status === "SUCCESSFUL" || status === "FAILED") {
      try {
        const response = await fetch(
          `https://api.feexpay.me/api/transactions/public/single/status/${reference}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.FEEXPAY_API_KEY}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Erreur API: ${response.status}`);
        }

        const data = await response.json();
        console.log("Réponse API:", data);
      } catch (apiError) {
        console.error("Erreur lors de l'appel API:", apiError);
      }

      // Envoi de l'email seulement si mailOptions existe
      if (mailOptions) {
        await transporter.sendMail(mailOptions);
      }
    }

    res.status(200).json({ message: "Webhook traité avec succès." });
  } catch (error) {
    console.error("Erreur traitement webhook :", error);
    res
      .status(500)
      .json({ message: "Erreur serveur lors du traitement du webhook." });
  }
};
