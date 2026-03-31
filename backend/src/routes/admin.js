const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

// Middleware: проверка admin-токена
function adminAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Вход в админку по паролю
router.post('/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PANEL_PASSWORD;

  if (!adminPassword) {
    return res.status(500).json({ error: 'ADMIN_PANEL_PASSWORD не настроен' });
  }

  if (!password || password !== adminPassword) {
    return res.status(401).json({ error: 'Неверный пароль' });
  }

  const token = jwt.sign(
    { isAdmin: true },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token });
});

// Статистика
router.get('/stats', adminAuth, (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const totalEmails = db.prepare('SELECT COUNT(*) as count FROM emails').get().count;
  const inboxEmails = db.prepare("SELECT COUNT(*) as count FROM emails WHERE folder = 'inbox'").get().count;
  const sentEmails = db.prepare("SELECT COUNT(*) as count FROM emails WHERE folder = 'sent'").get().count;
  const trashEmails = db.prepare("SELECT COUNT(*) as count FROM emails WHERE folder = 'trash'").get().count;
  const unreadEmails = db.prepare('SELECT COUNT(*) as count FROM emails WHERE is_read = 0').get().count;

  const todayEmails = db.prepare(`
    SELECT COUNT(*) as count FROM emails
    WHERE date >= date('now', 'start of day')
  `).get().count;

  const weekEmails = db.prepare(`
    SELECT COUNT(*) as count FROM emails
    WHERE date >= date('now', '-7 days')
  `).get().count;

  const emailsByUser = db.prepare(`
    SELECT u.email, u.created_at,
           COUNT(e.id) as total_emails,
           SUM(CASE WHEN e.folder = 'inbox' THEN 1 ELSE 0 END) as inbox_count,
           SUM(CASE WHEN e.folder = 'sent' THEN 1 ELSE 0 END) as sent_count,
           SUM(CASE WHEN e.is_read = 0 THEN 1 ELSE 0 END) as unread_count
    FROM users u
    LEFT JOIN emails e ON u.id = e.user_id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();

  res.json({
    totalUsers,
    totalEmails,
    inboxEmails,
    sentEmails,
    trashEmails,
    unreadEmails,
    todayEmails,
    weekEmails,
    emailsByUser,
    domain: process.env.DOMAIN,
  });
});

// Список всех пользователей
router.get('/users', adminAuth, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.email, u.created_at,
           COUNT(e.id) as total_emails
    FROM users u
    LEFT JOIN emails e ON u.id = e.user_id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();
  res.json(users);
});

// Создать нового пользователя (почтовый ящик)
router.post('/users', adminAuth, (req, res) => {
  const { email, password } = req.body;
  const domain = process.env.DOMAIN;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
  }

  // Если ввели только имя — добавляем домен
  const fullEmail = email.includes('@') ? email : `${email}@${domain}`;

  // Проверяем, что домен совпадает
  if (!fullEmail.toLowerCase().endsWith('@' + domain.toLowerCase())) {
    return res.status(400).json({ error: `Email должен быть в домене @${domain}` });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(fullEmail.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(fullEmail.toLowerCase(), hash);

  res.json({
    ok: true,
    user: { id: result.lastInsertRowid, email: fullEmail.toLowerCase() },
  });
});

// Удалить пользователя
router.delete('/users/:id', adminAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  db.prepare('DELETE FROM emails WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

  res.json({ ok: true });
});

// Все письма (для таблицы в админке)
router.get('/emails', adminAuth, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  const search = req.query.search || '';

  let query = `
    SELECT e.id, e.from_addr, e.to_addr, e.subject, e.date, e.folder, e.is_read, e.user_id,
           u.email as user_email
    FROM emails e
    LEFT JOIN users u ON e.user_id = u.id
  `;
  const params = [];

  if (search) {
    query += ` WHERE e.from_addr LIKE ? OR e.to_addr LIKE ? OR e.subject LIKE ?`;
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ` ORDER BY COALESCE(e.date, e.created_at) DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const emails = db.prepare(query).all(...params);

  let countQuery = 'SELECT COUNT(*) as count FROM emails e';
  const countParams = [];
  if (search) {
    countQuery += ` WHERE e.from_addr LIKE ? OR e.to_addr LIKE ? OR e.subject LIKE ?`;
    const s = `%${search}%`;
    countParams.push(s, s, s);
  }
  const total = db.prepare(countQuery).get(...countParams).count;

  res.json({ emails, total });
});

module.exports = router;
