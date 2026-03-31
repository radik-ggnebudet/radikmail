import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import EmailList from './components/EmailList';
import EmailView from './components/EmailView';
import Compose from './components/Compose';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('userEmail');
    return token && email ? { token, email } : null;
  });

  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken'));

  const [folder, setFolder] = useState('inbox');
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [counts, setCounts] = useState({});

  const loadEmails = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setSelectedEmail(null);
    try {
      const data = await api.getEmails(folder);
      setEmails(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [folder, user]);

  const loadCounts = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getUnreadCounts();
      const map = {};
      data.forEach((r) => { map[r.folder] = r.unread; });
      setCounts(map);
    } catch {}
  }, [user]);

  useEffect(() => {
    loadEmails();
    loadCounts();
  }, [loadEmails, loadCounts]);

  // Обновление каждые 30 сек
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadEmails();
      loadCounts();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadEmails, loadCounts, user]);

  function handleLogin(token, email) {
    localStorage.setItem('token', token);
    localStorage.setItem('userEmail', email);
    setUser({ token, email });
  }

  function handleAdminLogin(token) {
    localStorage.setItem('adminToken', token);
    setAdminToken(token);
  }

  function handleAdminLogout() {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setUser(null);
    setEmails([]);
    setSelectedEmail(null);
  }

  async function handleSelectEmail(email) {
    try {
      const full = await api.getEmail(email.id);
      setSelectedEmail(full);
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, is_read: 1 } : e))
      );
      loadCounts();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteEmail(id);
      setSelectedEmail(null);
      await loadEmails();
      await loadCounts();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSend(to, subject, text) {
    await api.sendEmail(to, subject, text);
    setComposing(false);
    if (folder === 'sent') await loadEmails();
  }

  // Admin panel
  if (adminToken) {
    return <AdminPanel onLogout={handleAdminLogout} />;
  }

  if (!user) {
    return <Login onLogin={handleLogin} onAdminLogin={handleAdminLogin} />;
  }

  return (
    <div className="app">
      <Sidebar
        folder={folder}
        onFolderChange={(f) => setFolder(f)}
        onCompose={() => setComposing(true)}
        counts={counts}
        userEmail={user.email}
        onLogout={handleLogout}
      />

      <EmailList
        emails={emails}
        loading={loading}
        folder={folder}
        selectedId={selectedEmail?.id}
        onSelect={handleSelectEmail}
        onRefresh={() => { loadEmails(); loadCounts(); }}
      />

      <EmailView
        email={selectedEmail}
        onDelete={handleDelete}
        onReply={(email) => {
          setComposing({ to: email.from_addr, subject: `Re: ${email.subject}` });
        }}
      />

      {composing && (
        <Compose
          initial={typeof composing === 'object' ? composing : {}}
          fromEmail={user.email}
          onSend={handleSend}
          onClose={() => setComposing(false)}
        />
      )}
    </div>
  );
}
