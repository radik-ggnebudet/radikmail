const FOLDERS = [
  { key: 'inbox', label: 'Входящие', icon: '📥' },
  { key: 'sent', label: 'Отправленные', icon: '📤' },
  { key: 'trash', label: 'Корзина', icon: '🗑️' },
];

export default function Sidebar({ folder, onFolderChange, onCompose, counts, userEmail, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="logo">✉️ RadikMail</span>
      </div>

      <button className="compose-btn" onClick={onCompose}>
        + Написать
      </button>

      <nav className="folders">
        {FOLDERS.map((f) => (
          <button
            key={f.key}
            className={`folder-item ${folder === f.key ? 'active' : ''}`}
            onClick={() => onFolderChange(f.key)}
          >
            <span className="folder-icon">{f.icon}</span>
            <span className="folder-label">{f.label}</span>
            {counts[f.key] > 0 && (
              <span className="badge">{counts[f.key]}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-email" title={userEmail}>{userEmail}</div>
        <button className="logout-btn" onClick={onLogout}>Выйти</button>
      </div>
    </aside>
  );
}
