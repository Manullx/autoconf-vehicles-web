import type {
  CreateVehiclePayload,
  LoginResponse,
  User,
  ValidationErrorResponse,
  Vehicle,
  VehiclesResponse,
} from '../types/models'

const backendUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '')
const authTokenKey = 'authToken'
const authUserKey = 'authUser'

function storeUser(user: User): void {
  localStorage.setItem(authUserKey, JSON.stringify(user))
}

function clearAuth(): void {
  localStorage.removeItem(authTokenKey)
  localStorage.removeItem(authUserKey)
}

export function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem(authTokenKey))
}

export function getStoredUser(): User | null {
  const storedUser = localStorage.getItem(authUserKey)

  if (!storedUser) return null

  try {
    return JSON.parse(storedUser) as User
  } catch {
    localStorage.removeItem(authUserKey)
    return null
  }
}

export class ApiValidationError extends Error {
  errors: Record<string, string[]>

  constructor(errors: Record<string, string[]>) {
    super('Verifique os campos informados.')
    this.errors = errors
  }
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function login(email: string, password: string): Promise<LoginResponse> {
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

  if (!response.ok) {
    throw new ApiError('Não foi possível realizar o login.', response.status)
  }

  const data: LoginResponse = await response.json()
  const token = data.token.replace(/^Bearer\s+/i, '')

  localStorage.setItem(authTokenKey, token)
  storeUser(data.user)

  return data
}

export async function validateAuthToken(): Promise<User | null> {
  if (!backendUrl) {
    throw new Error('VITE_BACKEND_URL não está configurada.')
  }

  const token = localStorage.getItem(authTokenKey)

  if (!token) return null

  const response = await fetch(`${backendUrl}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.ok) {
    const user: User = await response.json()
    storeUser(user)
    return user
  }

  if (response.status === 401 || response.status === 403) {
    clearAuth()
    return null
  }

  throw new Error('Não foi possível validar sua sessão.')
}

export async function getVehicles(): Promise<VehiclesResponse> {
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

export async function createVehicle(vehicle: CreateVehiclePayload): Promise<Vehicle> {
  if (!backendUrl) {
    throw new Error('VITE_BACKEND_URL não está configurada.')
  }

  const token = localStorage.getItem(authTokenKey)
  const formData = new FormData()

  formData.append('placa', vehicle.placa)
  formData.append('chassi', vehicle.chassi)
  formData.append('marca', vehicle.marca)
  formData.append('modelo', vehicle.modelo)
  formData.append('versao', vehicle.versao)
  formData.append('valor_venda', vehicle.valor_venda)
  formData.append('cor', vehicle.cor)
  formData.append('km', String(vehicle.km))
  formData.append('cambio', vehicle.cambio)
  formData.append('combustivel', vehicle.combustivel)
  vehicle.images.forEach((image) => formData.append('files[]', image))

  if (vehicle.cover_index !== null) {
    formData.append('cover_index', String(vehicle.cover_index))
  }

  const response = await fetch(`${backendUrl}/api/vehicles`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  if (response.status === 422) {
    const data: ValidationErrorResponse = await response.json()
    throw new ApiValidationError(data.errors ?? {})
  }

  if (!response.ok) {
    throw new Error('Não foi possível criar o veículo.')
  }

  return response.json() as Promise<Vehicle>
}

export function getVehicleImageUrl(path: string): string {
  return `${backendUrl}/storage/${path.replace(/^\//, '')}`
}
