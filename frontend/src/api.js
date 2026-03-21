const BASE = '/api';

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

async function request(url, options = {}) {
  const res = await fetch(BASE + url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  login(email, password) {
    return request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  },

  getEmails(folder = 'inbox') {
    return request(`/emails?folder=${folder}`, { headers: headers() });
  },

  getEmail(id) {
    return request(`/emails/${id}`, { headers: headers() });
  },

  sendEmail(to, subject, text) {
    return request('/emails/send', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ to, subject, text }),
    });
  },

  deleteEmail(id) {
    return request(`/emails/${id}`, { method: 'DELETE', headers: headers() });
  },

  patchEmail(id, data) {
    return request(`/emails/${id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(data),
    });
  },

  getUnreadCounts() {
    return request('/emails/counts/unread', { headers: headers() });
  },
};
