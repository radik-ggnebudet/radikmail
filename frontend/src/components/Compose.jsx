import { useState } from 'react';

export default function Compose({ initial = {}, fromEmail, onSend, onClose }) {
  const [to, setTo] = useState(initial.to || '');
  const [subject, setSubject] = useState(initial.subject || '');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSend(e) {
    e.preventDefault();
    if (!to || !subject) {
      setError('Укажи получателя и тему');
      return;
    }
    setSending(true);
    setError('');
    try {
      await onSend(to, subject, text);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  }

  return (
    <div className="compose-overlay" onClick={onClose}>
      <div className="compose-modal" onClick={(e) => e.stopPropagation()}>
        <div className="compose-header">
          <span>Новое письмо</span>
          <button className="compose-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSend}>
          <div className="compose-field">
            <label>От</label>
            <span className="compose-from">{fromEmail}</span>
          </div>
          <div className="compose-field">
            <label>Кому</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="получатель@example.com"
              autoFocus={!initial.to}
              required
            />
          </div>
          <div className="compose-field">
            <label>Тема</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Тема письма"
              required
            />
          </div>
          <textarea
            className="compose-body"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Текст письма..."
            rows={10}
          />
          {error && <div className="error">{error}</div>}
          <div className="compose-footer">
            <button type="submit" className="btn-send" disabled={sending}>
              {sending ? 'Отправка...' : '📤 Отправить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
