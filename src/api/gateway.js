const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL ?? '/api'

export async function gatewayRequest(path, options = {}) {
  const token = localStorage.getItem('smarthire_token')
  const response = await fetch(`${gatewayUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  const body = await response.json().catch(() => null)

  if (!response.ok) throw new Error(body?.message ?? 'Request failed. Please try again.')
  return body
}
