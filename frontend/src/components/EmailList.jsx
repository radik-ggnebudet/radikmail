function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('ru', { day: '2-digit', month: 'short' });
}

function getDisplayAddress(email, folder) {
  if (folder === 'sent') return email.to_addr;
  return email.from_addr.replace(/<.*>/, '').trim() || email.from_addr;
}

export default function EmailList({ emails, loading, folder, selectedId, onSelect, onRefresh }) {
  if (loading) {
    return (
      <div className="email-list">
        <div className="list-header">
          <span className="list-title">{emails.length} писем</span>
        </div>
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="email-list">
      <div className="list-header">
        <span className="list-title">{emails.length} {emails.length === 1 ? 'письмо' : 'писем'}</span>
        <button className="refresh-btn" onClick={onRefresh} title="Обновить">↻</button>
      </div>

      {emails.length === 0 ? (
        <div className="empty">Писем нет</div>
      ) : (
        <ul>
          {emails.map((email) => (
            <li
              key={email.id}
              className={`email-item ${selectedId === email.id ? 'selected' : ''} ${!email.is_read ? 'unread' : ''}`}
              onClick={() => onSelect(email)}
            >
              <div className="email-item-from">
                {getDisplayAddress(email, folder)}
              </div>
              <div className="email-item-subject">
                {email.subject || '(без темы)'}
              </div>
              <div className="email-item-date">
                {formatDate(email.date || email.created_at)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
