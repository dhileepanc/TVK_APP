const API_URL = 'http://localhost:5001/api'
const TOKEN_KEY = 'naamjap_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('naamjap_admin')
  localStorage.removeItem('naamjap_lang')
}

export async function login(username, password) {
  const res = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return res.json()
}

export async function fetchPublicSettings() {
  const res = await fetch(`${API_URL}/app-settings`)
  return res.json()
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (res.status === 401) clearSession()
  return res
}

export async function apiFetch(path, options = {}) {
  return request(path, options)
}

export function apiGet(path) {
  return request(path)
}
export function apiPost(path, body) {
  return request(path, { method: 'POST', body: JSON.stringify(body) })
}
export function apiPut(path, body) {
  return request(path, { method: 'PUT', body: JSON.stringify(body) })
}
export function apiDelete(path) {
  return request(path, { method: 'DELETE' })
}
