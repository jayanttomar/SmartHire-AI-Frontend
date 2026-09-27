import { authBaseUrl, gatewayRequest } from './gateway'

export function login(credentials) {
  return gatewayRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) })
}

export function register(account) {
  return gatewayRequest('/auth/register', { method: 'POST', body: JSON.stringify(account) })
}

export function currentUser() {
  return gatewayRequest('/auth/me', { endSessionOnUnauthorized: true })
}

export function exchangeGoogleCode(code) {
  return gatewayRequest('/auth/oauth/exchange', { method: 'POST', body: JSON.stringify({ code }) })
}

export function requestPasswordReset(email) {
  return gatewayRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
}

export function beginGoogleLogin(role = 'CANDIDATE') {
  const selectedRole = role === 'RECRUITER' ? 'RECRUITER' : 'CANDIDATE'
  window.location.assign(`${authBaseUrl}/oauth2/authorization/google?role=${selectedRole}`)
}

export function resetPassword(token, password) {
  return gatewayRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) })
}
