require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/emails');
const adminRoutes = require('./routes/admin');
const authMiddleware = require('./middleware/auth');
const { createSMTPServer } = require('./smtp');

const app = express();
const API_PORT = parseInt(process.env.API_PORT || '3000');
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '25');

// Доверяем первому прокси (nginx) — иначе req.ip будет 127.0.0.1
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// === Уровень 2: Express rate limiting ===

// Общий лимит на всё API — 100 запросов в минуту с одного IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Подождите.' },
});
app.use('/api', globalLimiter);

// Строгий лимит на эндпоинты логина — 7 запросов в минуту с одного IP
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 7,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Слишком много попыток входа. Подождите минуту.' },
});
app.use('/api/auth/login', loginLimiter);
app.use('/api/admin/login', loginLimiter);

// === Маршруты ===
app.use('/api/auth', authRoutes);
app.use('/api/emails', authMiddleware, emailRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, domain: process.env.DOMAIN });
});

// === Предупреждения безопасности при старте ===
if (process.env.JWT_SECRET === 'change-this-to-a-long-random-secret') {
  console.warn('[SECURITY] ВНИМАНИЕ: JWT_SECRET стоит значение по умолчанию! Смените его в .env');
}
if (process.env.ADMIN_PANEL_PASSWORD === 'admin-secret-change-me') {
  console.warn('[SECURITY] ВНИМАНИЕ: ADMIN_PANEL_PASSWORD стоит значение по умолчанию! Смените его в .env');
}

app.listen(API_PORT, () => {
  console.log(`[API] Запущен на порту ${API_PORT}`);
});

const smtpServer = createSMTPServer();
smtpServer.listen(SMTP_PORT, () => {
  console.log(`[SMTP] Слушает порт ${SMTP_PORT}`);
});
