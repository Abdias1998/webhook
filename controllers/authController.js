const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

    // Log pour vérification (à supprimer en prod)
    console.log("Webhook reçu de FeexPay :", payload);

    // Exemple de traitement :
    // 1. Vérifier si la transaction existe déjà dans la BDD (optionnel selon logique)
    const transaction = await User.findOne({ reference });
    if (!transaction) {
      return res.status(404).json({ message: "Transaction non trouvée" });
    }
    // 2. Enregistrer ou mettre à jour la transaction
    transaction.status = status;
    await transaction.save();
    
    // 3. Modifier l’état d’une commande liée à cette transaction (si applicable)
  
    // 4. Envoi d'un email ou d'une notification si besoin
    

    const mailOptions = {
      from: process.env.user,
      to: email,
      subject: 'Transaction traitée',
      text: `La transaction ${reference} a été traitée avec succès.`,
    };

    await transporter.sendMail(mailOptions);

    // Exemple basique (fictif) avec MongoDB :
    // await Transaction.create({ ...payload }); 
    // ou
    // await Transaction.updateOne({ reference }, { status });

    res.status(200).json({ message: "Webhook traité avec succès." });
  } catch (error) {
    console.error("Erreur traitement webhook :", error);
    res.status(500).json({ message: "Erreur serveur lors du traitement du webhook." });
  }
};


