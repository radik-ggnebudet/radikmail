const express = require('express');
const nodemailer = require('nodemailer');
const db = require('../db');

const router = express.Router();

// ВАЖНО: /counts/unread должен быть ДО /:id
router.get('/counts/unread', (req, res) => {
  const counts = db.prepare(`
    SELECT folder,
           COUNT(*) as total,
           SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread
    FROM emails
    WHERE user_id = ?
    GROUP BY folder
  `).all(req.user.id);
  res.json(counts);
});

// Список писем в папке
router.get('/', (req, res) => {
  const folder = req.query.folder || 'inbox';
  const emails = db.prepare(`
    SELECT id, from_addr, to_addr, subject, date, is_read, folder, created_at
    FROM emails
    WHERE user_id = ? AND folder = ?
    ORDER BY COALESCE(date, created_at) DESC
  `).all(req.user.id, folder);
  res.json(emails);
});

// Одно письмо
router.get('/:id', (req, res) => {
  const email = db
    .prepare('SELECT * FROM emails WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!email) return res.status(404).json({ error: 'Письмо не найдено' });

  if (!email.is_read) {
    db.prepare('UPDATE emails SET is_read = 1 WHERE id = ?').run(email.id);
    email.is_read = 1;
  }

  res.json(email);
});

// Отправить письмо
router.post('/send', async (req, res) => {
  const { to, subject, text } = req.body;
  if (!to || !subject) {
    return res.status(400).json({ error: 'Поля to и subject обязательны' });
  }

  const transportConfig = process.env.SMTP_RELAY_HOST
    ? {
        host: process.env.SMTP_RELAY_HOST,
        port: parseInt(process.env.SMTP_RELAY_PORT || '587'),
        secure: process.env.SMTP_RELAY_PORT === '465',
        auth: {
          user: process.env.SMTP_RELAY_USER,
          pass: process.env.SMTP_RELAY_PASS,
        },
        tls: { rejectUnauthorized: false },
      }
    : {
        host: 'localhost',
        port: parseInt(process.env.SMTP_PORT || '25'),
        direct: true,
        tls: { rejectUnauthorized: false },
      };

  try {
    const transporter = nodemailer.createTransport(transportConfig);
    const info = await transporter.sendMail({
      from: req.user.email,
      to,
      subject,
      text: text || '',
    });

    db.prepare(`
      INSERT INTO emails (message_id, from_addr, to_addr, subject, text_body, date, folder, user_id, is_read)
      VALUES (?, ?, ?, ?, ?, datetime('now'), 'sent', ?, 1)
    `).run(info.messageId, req.user.email, to, subject, text || '', req.user.id);

    res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error('Ошибка отправки:', err);
    res.status(500).json({ error: err.message });
  }
});

// Переместить в корзину или удалить навсегда
router.delete('/:id', (req, res) => {
  const email = db
    .prepare('SELECT * FROM emails WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!email) return res.status(404).json({ error: 'Не найдено' });

  if (email.folder === 'trash') {
    db.prepare('DELETE FROM emails WHERE id = ?').run(email.id);
    res.json({ ok: true, deleted: true });
  } else {
    db.prepare("UPDATE emails SET folder = 'trash' WHERE id = ?").run(email.id);
    res.json({ ok: true, moved: 'trash' });
  }
});

// Обновить письмо (отметить прочитанным, переместить)
router.patch('/:id', (req, res) => {
  const { is_read, folder } = req.body;
  const email = db
    .prepare('SELECT * FROM emails WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!email) return res.status(404).json({ error: 'Не найдено' });

  if (is_read !== undefined) {
    db.prepare('UPDATE emails SET is_read = ? WHERE id = ?').run(is_read ? 1 : 0, email.id);
  }
  if (folder) {
    db.prepare('UPDATE emails SET folder = ? WHERE id = ?').run(folder, email.id);
  }

  res.json({ ok: true });
});

module.exports = router;
