import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

export const scanMessage = (message, sender = 'demo-user', channel = 'email') =>
  api.post('/scan', { message, sender, channel }).then(r => r.data)

export const redactMessage = (message) =>
  api.post('/redact', { message }).then(r => r.data)

export const fetchLogs = (limit = 50, offset = 0) =>
  api.get('/logs', { params: { limit, offset } }).then(r => r.data)

export const fetchStats = () =>
  api.get('/stats').then(r => r.data)

export default api
