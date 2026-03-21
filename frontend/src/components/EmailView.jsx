function formatFullDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('ru', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function EmailView({ email, onDelete, onReply }) {
  if (!email) {
    return (
      <div className="email-view empty-view">
        <div className="empty-hint">Выберите письмо</div>
      </div>
    );
  }

  const hasHtml = email.html_body && email.html_body.trim();

  return (
    <div className="email-view">
      <div className="email-view-header">
        <h2 className="email-subject">{email.subject || '(без темы)'}</h2>
        <div className="email-actions">
          <button className="btn-reply" onClick={() => onReply(email)}>
            ↩ Ответить
          </button>
          <button className="btn-delete" onClick={() => onDelete(email.id)}>
            🗑️ Удалить
          </button>
        </div>
      </div>

      <div className="email-meta">
        <div><span className="meta-label">От:</span> {email.from_addr}</div>
        <div><span className="meta-label">Кому:</span> {email.to_addr}</div>
        <div><span className="meta-label">Дата:</span> {formatFullDate(email.date || email.created_at)}</div>
      </div>

      <div className="email-body">
        {hasHtml ? (
          <iframe
            className="html-body"
            srcDoc={email.html_body}
            sandbox="allow-same-origin"
            title="email body"
          />
        ) : (
          <pre className="text-body">{email.text_body || '(пустое письмо)'}</pre>
        )}
      </div>
    </div>
  );
}
