import { useState } from 'react';
import { api, adminApi } from '../api';

export default function Login({ onLogin, onAdminLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Admin login state
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(email, password);
      onLogin(data.token, data.email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminSubmit(e) {
    e.preventDefault();
    setAdminError('');
    setAdminLoading(true);
    try {
      const data = await adminApi.login(adminPassword);
      onAdminLogin(data.token);
    } catch (err) {
      setAdminError(err.message);
    } finally {
      setAdminLoading(false);
    }
  }

  return (
    <div className="login-page">
      <button className="admin-toggle-btn" onClick={() => setShowAdmin(!showAdmin)} title="Админ-панель">
        {showAdmin ? '✉️' : '⚙️'}
      </button>

      {!showAdmin ? (
        <div className="login-box">
          <div className="login-logo">✉️</div>
          <h1>RadikMail</h1>
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <div className="error">{error}</div>}
            <button type="submit" disabled={loading}>
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        </div>
      ) : (
        <div className="login-box">
          <div className="login-logo">⚙️</div>
          <h1>Админ-панель</h1>
          <p className="admin-hint">Введите пароль администратора</p>
          <form onSubmit={handleAdminSubmit}>
            <input
              type="password"
              placeholder="Пароль админки"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
              autoFocus
            />
            {adminError && <div className="error">{adminError}</div>}
            <button type="submit" disabled={adminLoading}>
              {adminLoading ? 'Вход...' : 'Войти в админку'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
