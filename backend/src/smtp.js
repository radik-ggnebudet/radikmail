const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const db = require('./db');

function createSMTPServer() {
  const domain = process.env.DOMAIN || 'localhost';

  const server = new SMTPServer({
    name: domain,
    banner: `RadikMail SMTP on ${domain}`,
    // Разрешить без TLS (в prod рекомендуется добавить сертификат)
    allowInsecureAuth: true,
    disabledCommands: ['AUTH'],

    onConnect(session, cb) {
      cb();
    },

    onMailFrom(address, session, cb) {
      cb();
    },

    onRcptTo(address, session, cb) {
      // Принимаем только письма для нашего домена
      if (!address.address.toLowerCase().endsWith('@' + domain.toLowerCase())) {
        const err = new Error('Relay not allowed');
        err.responseCode = 550;
        return cb(err);
      }
      cb();
    },

    async onData(stream, session, cb) {
      try {
        const parsed = await simpleParser(stream);

        for (const rcpt of session.envelope.rcptTo) {
          const toAddr = rcpt.address.toLowerCase();
          const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(toAddr);

          if (!user) {
            console.log(`[SMTP] Пользователь ${toAddr} не найден, письмо отброшено`);
            continue;
          }

          db.prepare(`
            INSERT INTO emails (message_id, from_addr, to_addr, subject, text_body, html_body, date, folder, user_id, is_read)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'inbox', ?, 0)
          `).run(
            parsed.messageId || null,
            parsed.from?.text || session.envelope.mailFrom?.address || 'unknown',
            toAddr,
            parsed.subject || '(без темы)',
            parsed.text || null,
            parsed.html || null,
            parsed.date?.toISOString() || new Date().toISOString(),
            user.id
          );

          console.log(`[SMTP] Письмо для ${toAddr}: "${parsed.subject}"`);
        }

        cb(null);
      } catch (err) {
        console.error('[SMTP] Ошибка обработки:', err);
        cb(err);
      }
    },
  });

  server.on('error', (err) => {
    console.error('[SMTP] Ошибка сервера:', err);
  });

  return server;
}

module.exports = { createSMTPServer };
