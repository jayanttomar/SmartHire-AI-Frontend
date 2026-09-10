import { gatewayRequest } from './gateway'

export function login(credentials) {
  return gatewayRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) })
}

export function register(account) {
  return gatewayRequest('/auth/register', { method: 'POST', body: JSON.stringify(account) })
}
