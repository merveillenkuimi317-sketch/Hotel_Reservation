const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erreur serveur');
  }

  return data;
}

export const authAPI = {
  login: (credentials) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  logout: () =>
    apiFetch('/auth/logout', { method: 'POST' }),
  me: () => apiFetch('/auth/me'),
};

export const chambresAPI = {
  lister: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/chambres${qs ? '?' + qs : ''}`);
  },
  detail: (id) => apiFetch(`/chambres/${id}`),
  creer: (data) =>
    apiFetch('/chambres', { method: 'POST', body: JSON.stringify(data) }),
  modifier: (id, data) =>
    apiFetch(`/chambres/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  supprimer: (id) =>
    apiFetch(`/chambres/${id}`, { method: 'DELETE' }),
};

export const reservationsAPI = {
  lister: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/reservations${qs ? '?' + qs : ''}`);
  },
  detail: (id) => apiFetch(`/reservations/${id}`),
  creer: (data) =>
    apiFetch('/reservations', { method: 'POST', body: JSON.stringify(data) }),
  modifier: (id, data) =>
    apiFetch(`/reservations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  annuler: (id) =>
    apiFetch(`/reservations/${id}/annuler`, { method: 'PATCH' }),
  statistiques: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/reservations-stats${qs ? '?' + qs : ''}`);
  },
};

export const predictionsAPI = {
  lister: (jours = 7) => apiFetch(`/predictions?jours=${jours}`),
  lancer: (jours = 7) =>
    apiFetch('/predictions/lancer', { method: 'POST', body: JSON.stringify({ jours }) }),
  alertes: () => apiFetch('/predictions/alertes'),
  marquerAlerteLue: (id) =>
    apiFetch(`/alertes/${id}/lue`, { method: 'PATCH' }),
};

export const dashboardAPI = {
  stats: () => apiFetch('/dashboard'),
};

export const clientsAPI = {
  lister: () => apiFetch('/clients'),
};

export const usersAPI = {
  lister:         ()          => apiFetch('/users'),
  changerRole:    (id, role)  => apiFetch(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  supprimer:      (id)        => apiFetch(`/users/${id}`, { method: 'DELETE' }),
};