// Calling the local backend directly avoids Windows/Vite proxy socket failures
// during development. Production continues to use the same-origin API path.
export const gatewayUrl = (import.meta.env.VITE_API_GATEWAY_URL ?? (import.meta.env.DEV ? 'http://127.0.0.1:8080/api' : '/api')).replace(/\/$/, '')

// OAuth is served by the backend root, while API requests are served below /api.
// This supports both same-origin and separately hosted API deployments.
const defaultAuthBaseUrl = gatewayUrl.replace(/\/api$/, '').replace('http://127.0.0.1:', 'http://localhost:')
export const authBaseUrl = (import.meta.env.VITE_AUTH_BASE_URL ?? defaultAuthBaseUrl).replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export async function gatewayRequest(path, options = {}) {
  const token = localStorage.getItem('smarthire_token')
  const { headers: suppliedHeaders, endSessionOnUnauthorized = false, ...requestOptions } = options
  const headers = new Headers(suppliedHeaders ?? {})
  const isFormData = typeof FormData !== 'undefined' && requestOptions.body instanceof FormData

  if (!isFormData && requestOptions.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)

  let response
  try {
    response = await fetch(`${gatewayUrl}${path}`, { ...requestOptions, headers })
  } catch {
    throw new ApiError('Network error. Please check that SmartHire services are running.', 0, null)
  }

  const contentType = response.headers.get('content-type') ?? ''
  const body = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '')

  if (!response.ok) {
    if (response.status === 401 && endSessionOnUnauthorized) {
      localStorage.removeItem('smarthire_token')
      localStorage.removeItem('smarthire_user')
      window.dispatchEvent(new Event('smarthire:session-expired'))
    }
    if (response.status === 401) {
      const fallback = path === '/auth/login' ? 'Invalid email or password.'
        : path === '/auth/oauth/exchange' ? 'Google sign-in expired. Please try again.'
        : 'Your session has expired. Please sign in again.'
      throw new ApiError(body?.message || fallback, response.status, body)
    }
    const message = typeof body === 'object' && body
      ? body.message ?? body.error ?? 'Request failed. Please try again.'
      : 'Request failed. Please try again.'
    throw new ApiError(message, response.status, body)
  }

  return body
}
