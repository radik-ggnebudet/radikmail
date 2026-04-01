const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { userLoginProtection, loginLimiter, delay } = require('../middleware/security');

const router = express.Router();

router.post('/login', loginLimiter(userLoginProtection), async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    const { delay: delayMs, totalAttempts } = userLoginProtection.recordFailure(ip);

    console.log(
      `[SECURITY][USER_AUTH] Неудачная попытка входа: IP=${ip} email=${email} попытка=#${totalAttempts} задержка=${delayMs}мс`
    );

    // Прогрессивная задержка — замедляем ответ
    await delay(delayMs);

    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  // Успешный вход — сбрасываем счётчик
  userLoginProtection.recordSuccess(ip);
  console.log(`[SECURITY][USER_AUTH] Успешный вход: IP=${ip} email=${email}`);

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, email: user.email });
});

module.exports = router;
