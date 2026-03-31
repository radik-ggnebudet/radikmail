import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../api';

function StatCard({ label, value, icon, color }) {
  return (
    <div className="admin-stat-card" style={{ borderLeftColor: color }}>
      <div className="admin-stat-icon">{icon}</div>
      <div className="admin-stat-info">
        <div className="admin-stat-value">{value}</div>
        <div className="admin-stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function AdminPanel({ onLogout }) {
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [emails, setEmails] = useState([]);
  const [emailsTotal, setEmailsTotal] = useState(0);
  const [emailSearch, setEmailSearch] = useState('');
  const [emailPage, setEmailPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // Create user form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [creating, setCreating] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const data = await adminApi.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadEmails = useCallback(async () => {
    try {
      const data = await adminApi.getEmails(50, emailPage * 50, emailSearch);
      setEmails(data.emails);
      setEmailsTotal(data.total);
    } catch (err) {
      console.error(err);
    }
  }, [emailPage, emailSearch]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadStats(), loadUsers(), loadEmails()]).finally(() => setLoading(false));
  }, [loadStats, loadUsers, loadEmails]);

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreating(true);
    try {
      const result = await adminApi.createUser(newEmail, newPassword);
      setCreateSuccess(`Почта ${result.user.email} создана`);
      setNewEmail('');
      setNewPassword('');
      loadUsers();
      loadStats();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteUser(id) {
    try {
      await adminApi.deleteUser(id);
      setDeleteConfirm(null);
      loadUsers();
      loadStats();
    } catch (err) {
      alert(err.message);
    }
  }

  function handleEmailSearch(e) {
    e.preventDefault();
    setEmailPage(0);
    loadEmails();
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  if (loading && !stats) {
    return (
      <div className="admin-page">
        <div className="admin-loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <span className="admin-logo">RadikMail</span>
          <span className="admin-badge">Admin</span>
        </div>
        <nav className="admin-nav">
          <button className={`admin-nav-btn ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>
            Статистика
          </button>
          <button className={`admin-nav-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
            Почтовые ящики
          </button>
          <button className={`admin-nav-btn ${tab === 'emails' ? 'active' : ''}`} onClick={() => setTab('emails')}>
            Все письма
          </button>
        </nav>
        <button className="admin-logout-btn" onClick={onLogout}>Выйти</button>
      </header>

      <main className="admin-content">
        {/* === DASHBOARD === */}
        {tab === 'dashboard' && stats && (
          <div className="admin-dashboard">
            <h2>Обзор</h2>
            <div className="admin-stats-grid">
              <StatCard label="Почтовые ящики" value={stats.totalUsers} icon="👤" color="#1a73e8" />
              <StatCard label="Всего писем" value={stats.totalEmails} icon="📧" color="#34a853" />
              <StatCard label="Входящие" value={stats.inboxEmails} icon="📥" color="#fbbc04" />
              <StatCard label="Отправленные" value={stats.sentEmails} icon="📤" color="#4285f4" />
              <StatCard label="В корзине" value={stats.trashEmails} icon="🗑️" color="#ea4335" />
              <StatCard label="Непрочитанные" value={stats.unreadEmails} icon="🔔" color="#ff6d01" />
              <StatCard label="За сегодня" value={stats.todayEmails} icon="📅" color="#46bdc6" />
              <StatCard label="За неделю" value={stats.weekEmails} icon="📊" color="#9334e6" />
            </div>

            <h3>Активность по ящикам</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Создан</th>
                    <th>Всего</th>
                    <th>Входящие</th>
                    <th>Отправленные</th>
                    <th>Непрочитанные</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.emailsByUser.map((u) => (
                    <tr key={u.email}>
                      <td className="admin-td-email">{u.email}</td>
                      <td>{formatDate(u.created_at)}</td>
                      <td>{u.total_emails}</td>
                      <td>{u.inbox_count}</td>
                      <td>{u.sent_count}</td>
                      <td>{u.unread_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* === USERS === */}
        {tab === 'users' && (
          <div className="admin-users">
            <h2>Почтовые ящики</h2>

            <div className="admin-create-card">
              <h3>Создать новый ящик</h3>
              <form onSubmit={handleCreateUser} className="admin-create-form">
                <div className="admin-create-row">
                  <div className="admin-input-group">
                    <label>Email (или имя без @)</label>
                    <input
                      type="text"
                      placeholder={`user@${stats?.domain || 'example.com'}`}
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="admin-input-group">
                    <label>Пароль (мин. 6 символов)</label>
                    <input
                      type="text"
                      placeholder="Пароль"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <button type="submit" className="admin-create-btn" disabled={creating}>
                    {creating ? 'Создание...' : 'Создать'}
                  </button>
                </div>
                {createError && <div className="admin-msg error">{createError}</div>}
                {createSuccess && <div className="admin-msg success">{createSuccess}</div>}
              </form>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Email</th>
                    <th>Создан</th>
                    <th>Писем</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td className="admin-td-email">{u.email}</td>
                      <td>{formatDate(u.created_at)}</td>
                      <td>{u.total_emails}</td>
                      <td>
                        {deleteConfirm === u.id ? (
                          <span className="admin-delete-confirm">
                            Удалить?{' '}
                            <button className="admin-yes" onClick={() => handleDeleteUser(u.id)}>Да</button>
                            <button className="admin-no" onClick={() => setDeleteConfirm(null)}>Нет</button>
                          </span>
                        ) : (
                          <button className="admin-delete-btn" onClick={() => setDeleteConfirm(u.id)}>
                            Удалить
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={5} className="admin-empty">Нет пользователей</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* === EMAILS === */}
        {tab === 'emails' && (
          <div className="admin-emails">
            <h2>Все письма</h2>

            <form onSubmit={handleEmailSearch} className="admin-search-form">
              <input
                type="text"
                placeholder="Поиск по отправителю, получателю или теме..."
                value={emailSearch}
                onChange={(e) => setEmailSearch(e.target.value)}
              />
              <button type="submit">Найти</button>
            </form>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>От</th>
                    <th>Кому</th>
                    <th>Тема</th>
                    <th>Дата</th>
                    <th>Папка</th>
                    <th>Владелец</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.map((e) => (
                    <tr key={e.id} className={e.is_read ? '' : 'admin-unread'}>
                      <td>{e.id}</td>
                      <td className="admin-td-email">{e.from_addr}</td>
                      <td className="admin-td-email">{e.to_addr}</td>
                      <td className="admin-td-subject">{e.subject}</td>
                      <td className="admin-td-date">{formatDate(e.date)}</td>
                      <td>
                        <span className={`admin-folder-badge ${e.folder}`}>{e.folder}</span>
                      </td>
                      <td className="admin-td-email">{e.user_email}</td>
                    </tr>
                  ))}
                  {emails.length === 0 && (
                    <tr><td colSpan={7} className="admin-empty">Нет писем</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {emailsTotal > 50 && (
              <div className="admin-pagination">
                <button disabled={emailPage === 0} onClick={() => setEmailPage((p) => p - 1)}>
                  Назад
                </button>
                <span>
                  Стр. {emailPage + 1} из {Math.ceil(emailsTotal / 50)} (всего {emailsTotal})
                </span>
                <button disabled={(emailPage + 1) * 50 >= emailsTotal} onClick={() => setEmailPage((p) => p + 1)}>
                  Вперёд
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
