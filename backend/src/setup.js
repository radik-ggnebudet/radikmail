require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db = require('./db');

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Укажи ADMIN_EMAIL и ADMIN_PASSWORD в .env');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

if (existing) {
  console.log(`Пользователь ${email} уже существует.`);
} else {
  db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, hash);
  console.log(`Пользователь ${email} создан.`);
}
