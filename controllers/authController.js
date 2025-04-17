const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
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
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer un nouvel utilisateur
    const user = new User({
      email,
      password: hashedPassword
    });

    await user.save();

    // Créer le token JWT
    const token = jwt.sign(
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
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // Créer le token JWT
    const token = jwt.sign(
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
};

// webhookController.js

// controllers/feexpayWebhookController.js


exports.feexpayWebhook = async (req, res) => {
  try {
    const {
      reference,
      status,
      amount,
      first_name,
      last_name,
      email,
      phoneNumber,
      type,
      date,
      reseau,
      ref_link,
    } = req.body;

    console.log('Webhook reçu :', req.body);

    if (status === 'FAILED') {
      // 👉 Action personnalisée : envoyer un mail de remerciement
     
      const mailOptions = {
        from: `"FeexPay" <${process.env.user}>`,
        to: email,
        subject: 'Merci pour votre paiement ! 🙏',
        html: `
          <h2>Bonjour ${first_name},</h2>
          <p>Nous avons bien reçu votre paiement de <strong>${amount} FCFA</strong>.</p>
          <p>Merci de votre confiance !</p>
          <p>Référence : ${reference}</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log('Mail envoyé à', email);
    }

    // Tu peux aussi enregistrer la transaction dans la base de données ici

    res.status(200).json({ message: 'Webhook reçu avec succès' });
  } catch (error) {
    console.error('Erreur webhook :', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};





