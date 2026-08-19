const backendUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '')
const authTokenKey = 'authToken'

export type Vehicle = {
  id: number
  active: number
  placa: string
  marca: string
  modelo: string
  versao: string
  valor_venda: number
  cor: string
  km: number
  cambio: string
  combustivel: string
  vehicle_images: Array<{
    id: number
    path: string
    is_cover: boolean
  }>
}

type VehiclesResponse = {
  current_page: number
  data: Vehicle[]
}

export async function login(email: string, password: string) {
  if (!backendUrl) {
    throw new Error('VITE_BACKEND_URL não está configurada.')
  }

  const response = await fetch(`${backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  })

  if (response.ok) {
    const data: { token: string } = await response.json()
    const token = data.token.replace(/^Bearer\s+/i, '')

    localStorage.setItem(authTokenKey, token)
  }

  return response
}

export async function getVehicles() {
  if (!backendUrl) {
    throw new Error('VITE_BACKEND_URL não está configurada.')
  }

  const token = localStorage.getItem(authTokenKey)

  const response = await fetch(`${backendUrl}/api/vehicles`, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  })

  if (!response.ok) {
    throw new Error('Não foi possível carregar os veículos.')
  }

  return response.json() as Promise<VehiclesResponse>
}

export function getVehicleImageUrl(path: string) {
  return `${backendUrl}/storage/${path.replace(/^\//, '')}`
}
