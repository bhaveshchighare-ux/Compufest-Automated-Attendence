export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const request = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...getAuthHeaders(),
    ...(options.headers || {}),
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers,
  })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const error = new Error(data.message || 'Something went wrong')
    error.status = res.status
    if (data.errors) error.errors = data.errors
    throw error
  }
  return data
}

export const authAPI = {
  signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
}

export const memberAPI = {
  getAll: (q = '') => request(`/members?q=${encodeURIComponent(q)}`),
  add: (body) => request('/members', { method: 'POST', body: JSON.stringify(body) }),
  edit: (id, body) => request(`/members/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => request(`/members/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  import: (members) => request('/members/import', { method: 'POST', body: JSON.stringify({ members }) }),
}

export const sessionAPI = {
  getAll: () => request('/sessions'),
  create: (body) => request('/sessions', { method: 'POST', body: JSON.stringify(body) }),
  getById: (id) => request(`/sessions/${encodeURIComponent(id)}`),
  updateAttendance: (sessionId, registrationNumber, status) => 
    request(`/sessions/${encodeURIComponent(sessionId)}/attendance`, { 
      method: 'PUT', 
      body: JSON.stringify({ registrationNumber, status }) 
    }),
  delete: (id) => request(`/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
