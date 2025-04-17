const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

exports.webhook = async (req, res) => {
  try {
    // const { reference,email } = req.body;
    
    // Vérifier si l'utilisateur existe
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(401).json({ message: "Utilisateur non trouvé" });
//     }
// // Si l'user exixte enregistrer la reference dans la base de données
//     user.reference.push(reference);
//     await user.save();
//     res.json({
//       message: "Webhook reçu avec succès",
//       user
//     });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la connexion", error: error.message }); 
  }
};