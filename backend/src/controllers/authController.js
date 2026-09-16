const { db } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { JWT_SECRET } = require('../middleware/auth');

function register(req, res) {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nombre, email y contraseña son obligatorios' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado' });
    }

    const id = 'user-' + uuidv4().substring(0, 8);
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (id, name, email, password, phone, role)
      VALUES (?, ?, ?, ?, ?, 'student')
    `).run(id, name, email, hashedPassword, phone || '');

    const token = jwt.sign({ id, email, name, role: 'student' }, JWT_SECRET, { expiresIn: '30d' });

    const user = { id, name, email, phone: phone || '', role: 'student' };

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado con éxito',
      token,
      user
    });
  } catch (error) {
    console.error('Error en register:', error);
    return res.status(500).json({ success: false, message: 'Error interno en el servidor' });
  }
}

function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email y contraseña requeridos' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at
    };

    return res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ success: false, message: 'Error interno en el servidor' });
  }
}

function getProfile(req, res) {
  try {
    const user = db.prepare('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    return res.json({ success: true, user });
  } catch (error) {
    console.error('Error en getProfile:', error);
    return res.status(500).json({ success: false, message: 'Error interno en el servidor' });
  }
}

function updateProfile(req, res) {
  try {
    const { name, phone } = req.body;
    const userId = req.user.id;

    db.prepare(`
      UPDATE users 
      SET name = COALESCE(?, name), 
          phone = COALESCE(?, phone),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, phone, userId);

    const updatedUser = db.prepare('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?').get(userId);

    return res.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error en updateProfile:', error);
    return res.status(500).json({ success: false, message: 'Error interno en el servidor' });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};
