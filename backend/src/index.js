require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/emails');
const adminRoutes = require('./routes/admin');
const authMiddleware = require('./middleware/auth');
const { createSMTPServer } = require('./smtp');

const app = express();
const API_PORT = parseInt(process.env.API_PORT || '3000');
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '25');

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/emails', authMiddleware, emailRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, domain: process.env.DOMAIN });
});

app.listen(API_PORT, () => {
  console.log(`[API] Запущен на порту ${API_PORT}`);
});

const smtpServer = createSMTPServer();
smtpServer.listen(SMTP_PORT, () => {
  console.log(`[SMTP] Слушает порт ${SMTP_PORT}`);
});
