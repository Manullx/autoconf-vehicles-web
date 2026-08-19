const backendUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '')

export function login(email: string, password: string) {
  if (!backendUrl) {
    throw new Error('VITE_BACKEND_URL não está configurada.')
  }

  return fetch(`${backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  })
}
