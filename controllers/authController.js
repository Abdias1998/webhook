import { config } from 'dotenv';
config();
import User, { findOne } from '../models/User';
import { hash, compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { createTransport } from 'nodemailer';
import { Feexpay } from 'feexpay-sdk';
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
export async function register(req, res) {
  try {
    const { email, password } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await findOne({ email });
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

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await findOne({ email });
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
export async function payments(req, res) {
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

export async function webhook(req, res) {
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

    // Log pour vérification (à supprimer en prod)
    console.log("Webhook reçu de FeexPay :", payload);

    const user = await findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
   
    
    if (status === 'SUCCESSFUL') {
      const mailOptions = {
        from: process.env.user,
        to: email,
        subject: 'Transaction traitée',
        text: `La transaction ${reference} a été traitée avec succès.`,
      };

      await transporter.sendMail(mailOptions);
      user.reference.push(reference);
      user.status = status;
      await user.save();
    }

    // res.status(200).json({ message: "Webhook traité avec succès." });
  } catch (error) {
    console.error("Erreur traitement webhook :", error);
    res.status(500).json({ message: "Erreur serveur lors du traitement du webhook." });
  }
}


