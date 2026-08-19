import type {
  CreatedUserResponse,
  CreateUserPayload,
  CreateVehiclePayload,
  LoginResponse,
  RegisterPayload,
  User,
  UsersResponse,
  ValidationErrorResponse,
  Vehicle,
  VehicleImage,
  VehicleListParams,
  VehiclesResponse,
  UpdateVehiclePayload,
} from '../types/models'

const configuredBaseUrl = (
  import.meta.env.VITE_API_BASE_URL
  || import.meta.env.VITE_BACKEND_URL
)?.replace(/\/$/, '')
const apiBaseUrl = configuredBaseUrl
  ? configuredBaseUrl.endsWith('/api') ? configuredBaseUrl : `${configuredBaseUrl}/api`
  : undefined
const authTokenKey = 'authToken'
const authUserKey = 'authUser'

// Remove credenciais persistentes deixadas por versões anteriores da aplicação.
localStorage.removeItem(authTokenKey)
localStorage.removeItem(authUserKey)

function storeUser(user: User): void {
  sessionStorage.setItem(authUserKey, JSON.stringify(user))
}

function clearAuth(): void {
  sessionStorage.removeItem(authTokenKey)
  sessionStorage.removeItem(authUserKey)
  localStorage.removeItem(authTokenKey)
  localStorage.removeItem(authUserKey)
}

async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init)

  if (response.status === 401) {
    clearAuth()

    if (window.location.pathname !== '/login') {
      window.location.replace('/login')
    }
  }

  return response
}

function requireApiBaseUrl(): string {
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL não está configurada.')
  }

  return apiBaseUrl
}

function getAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem(authTokenKey)

  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function throwResponseError(response: Response, fallbackMessage: string): Promise<never> {
  if (response.status === 422) {
    const data: ValidationErrorResponse = await response.json()
    throw new ApiValidationError(data.errors ?? {})
  }

  let message = fallbackMessage

  try {
    const data = await response.json() as ValidationErrorResponse
    if (data.message) message = data.message
  } catch {
    // A resposta pode não possuir corpo (por exemplo, em erros de infraestrutura).
  }

  throw new ApiError(message, response.status)
}

function normalizeVehicle(vehicle: Vehicle): Vehicle {
  return {
    ...vehicle,
    active: Boolean(Number(vehicle.active)),
    km: Number(vehicle.km),
    valor_venda: Number(vehicle.valor_venda),
    vehicle_images: vehicle.vehicle_images ?? [],
  }
}

export async function logout(): Promise<void> {
  const token = sessionStorage.getItem(authTokenKey)

  if (!token) {
    clearAuth()
    return
  }

  try {
    const response = await fetch(`${requireApiBaseUrl()}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok && response.status !== 401) {
      await throwResponseError(response, 'Não foi possível revogar o token no servidor.')
    }
  } finally {
    clearAuth()
  }
}

export function isAuthenticated(): boolean {
  return Boolean(sessionStorage.getItem(authTokenKey))
}

export function getStoredUser(): User | null {
  const storedUser = sessionStorage.getItem(authUserKey)

  if (!storedUser) return null

  try {
    return JSON.parse(storedUser) as User
  } catch {
    sessionStorage.removeItem(authUserKey)
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

export class PartialVehicleUpdateError extends Error {}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiFetch(`${requireApiBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new ApiError('Não foi possível realizar o login.', response.status)
  }

  const data: LoginResponse = await response.json()
  const token = data.token.replace(/^Bearer\s+/i, '')

  sessionStorage.setItem(authTokenKey, token)
  storeUser({ ...data.user, first_login: data.first_login })

  return data
}

export async function registerUser(payload: RegisterPayload): Promise<User> {
  const response = await apiFetch(`${requireApiBaseUrl()}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    await throwResponseError(response, 'Não foi possível criar sua conta.')
  }

  return response.json() as Promise<User>
}

export async function createFirstAccessPassword(
  password: string,
  passwordConfirmation: string,
): Promise<User> {
  const response = await apiFetch(`${requireApiBaseUrl()}/auth/password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      password,
      password_confirmation: passwordConfirmation,
    }),
  })

  if (response.status === 401) {
    clearAuth()
    throw new ApiError('Sua sessão expirou.', response.status)
  }

  if (response.status === 422) {
    const data: ValidationErrorResponse = await response.json()
    throw new ApiValidationError(data.errors ?? {})
  }

  if (!response.ok) {
    throw new Error('Não foi possível criar sua senha.')
  }

  const user: User = await response.json()

  if (user.first_login !== false) {
    throw new Error('Não foi possível confirmar a criação da senha.')
  }

  storeUser(user)
  return user
}

export async function validateAuthToken(): Promise<User | null> {
  const token = sessionStorage.getItem(authTokenKey)

  if (!token) return null

  const response = await apiFetch(`${requireApiBaseUrl()}/auth/me`, {
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

export async function getVehicles(params: VehicleListParams = {}): Promise<VehiclesResponse> {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') searchParams.set(key, String(value))
  })

  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : ''
  const response = await apiFetch(`${requireApiBaseUrl()}/vehicles${query}`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Não foi possível carregar os veículos.')
  }

  const vehicles = await response.json() as VehiclesResponse
  return { ...vehicles, data: vehicles.data.map(normalizeVehicle) }
}

export async function getUsers(page = 1): Promise<UsersResponse> {
  const response = await apiFetch(`${requireApiBaseUrl()}/users?page=${page}`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Não foi possível carregar os usuários.')
  }

  return response.json() as Promise<UsersResponse>
}

export async function createUser(user: CreateUserPayload): Promise<CreatedUserResponse> {
  const response = await apiFetch(`${requireApiBaseUrl()}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(user),
  })

  if (response.status === 422) {
    const data: ValidationErrorResponse = await response.json()
    throw new ApiValidationError(data.errors ?? {})
  }

  if (!response.ok) {
    throw new Error('Não foi possível criar o usuário.')
  }

  return response.json() as Promise<CreatedUserResponse>
}

export async function deleteUser(userId: number): Promise<void> {
  const response = await apiFetch(`${requireApiBaseUrl()}/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Não foi possível excluir o usuário.')
  }
}

export async function getVehicle(vehicleId: number): Promise<Vehicle> {
  const response = await apiFetch(`${requireApiBaseUrl()}/vehicles/${vehicleId}`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Não foi possível carregar o veículo.')
  }

  const vehicle = await response.json() as Vehicle
  return normalizeVehicle(vehicle)
}

export async function createVehicle(vehicle: CreateVehiclePayload): Promise<Vehicle> {
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

  const response = await apiFetch(`${requireApiBaseUrl()}/vehicles`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
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

  const createdVehicle = await response.json() as Vehicle
  return normalizeVehicle(createdVehicle)
}

export async function updateVehicle(vehicle: UpdateVehiclePayload): Promise<Vehicle> {
  const headers = getAuthHeaders()
  const response = await apiFetch(`${requireApiBaseUrl()}/vehicles/${vehicle.vehicleId}`, {
    method: 'PATCH',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      placa: vehicle.placa,
      chassi: vehicle.chassi,
      marca: vehicle.marca,
      modelo: vehicle.modelo,
      versao: vehicle.versao,
      valor_venda: vehicle.valor_venda,
      cor: vehicle.cor,
      km: vehicle.km,
      cambio: vehicle.cambio,
      combustivel: vehicle.combustivel,
    }),
  })

  if (!response.ok) {
    await throwResponseError(response, 'Não foi possível atualizar o veículo.')
  }

  try {
    return await synchronizeVehicleImages(vehicle, headers)
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Não foi possível concluir as alterações das imagens.'
    throw new PartialVehicleUpdateError(
      `${message} Os dados do veículo precisam ser recarregados antes de uma nova tentativa.`,
    )
  }
}

async function synchronizeVehicleImages(
  vehicle: UpdateVehiclePayload,
  headers: Record<string, string>,
): Promise<Vehicle> {
  const uploadedImagesByIndex = new Map<number, VehicleImage>()
  const pendingUploads = vehicle.images.map((file, index) => ({ file, index }))
  const pendingRemovals = [...vehicle.removed_image_ids]
  let currentImageCount = vehicle.initial_image_ids.length

  async function uploadImages(batch: typeof pendingUploads): Promise<void> {
    if (batch.length === 0) return

    const formData = new FormData()
    batch.forEach(({ file }) => formData.append('files[]', file))
    const uploadResponse = await apiFetch(
      `${requireApiBaseUrl()}/vehicles/${vehicle.vehicleId}/images`,
      {
        method: 'POST',
        headers,
        body: formData,
      },
    )

    if (!uploadResponse.ok) {
      await throwResponseError(
        uploadResponse,
        'Os dados foram atualizados, mas não foi possível enviar todas as imagens.',
      )
    }

    const uploadedImages = await uploadResponse.json() as VehicleImage[]

    if (uploadedImages.length !== batch.length) {
      throw new Error('A API não confirmou o envio de todas as imagens. Recarregue o veículo antes de tentar novamente.')
    }

    batch.forEach(({ index }, batchIndex) => {
      uploadedImagesByIndex.set(index, uploadedImages[batchIndex])
    })
    currentImageCount += batch.length
  }

  async function removeImage(imageId: number): Promise<void> {
    const deleteResponse = await apiFetch(
      `${requireApiBaseUrl()}/vehicles/${vehicle.vehicleId}/images/${imageId}`,
      { method: 'DELETE', headers },
    )

    if (!deleteResponse.ok) {
      await throwResponseError(
        deleteResponse,
        'Os dados foram atualizados, mas não foi possível remover uma das imagens.',
      )
    }

    currentImageCount -= 1
  }

  const removalsNeededBeforeUpload = Math.min(
    Math.max(0, currentImageCount + pendingUploads.length - 5),
    Math.max(0, currentImageCount - 1),
    pendingRemovals.length,
  )

  for (let index = 0; index < removalsNeededBeforeUpload; index += 1) {
    const imageId = pendingRemovals.shift()
    if (imageId !== undefined) await removeImage(imageId)
  }

  const firstBatchSize = Math.min(5 - currentImageCount, pendingUploads.length)
  const firstBatch = pendingUploads.splice(0, firstBatchSize)
  await uploadImages(firstBatch)

  for (const imageId of pendingRemovals) {
    await removeImage(imageId)
  }

  await uploadImages(pendingUploads)

  const coverImageId = vehicle.cover_image_id
    ?? (vehicle.cover_index !== null
      ? uploadedImagesByIndex.get(vehicle.cover_index)?.id ?? null
      : null)

  if (coverImageId !== null) {
    const coverResponse = await apiFetch(
      `${requireApiBaseUrl()}/vehicles/${vehicle.vehicleId}/images/${coverImageId}/cover`,
      { method: 'PATCH', headers },
    )

    if (!coverResponse.ok) {
      await throwResponseError(
        coverResponse,
        'Os dados e imagens foram atualizados, mas não foi possível alterar a imagem de capa.',
      )
    }
  }

  return getVehicle(vehicle.vehicleId)
}

export async function deleteVehicle(vehicleId: number): Promise<void> {
  const response = await apiFetch(`${requireApiBaseUrl()}/vehicles/${vehicleId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    await throwResponseError(response, 'Não foi possível excluir o veículo.')
  }
}

export async function setVehicleCover(vehicleId: number, imageId: number): Promise<VehicleImage> {
  const response = await apiFetch(
    `${requireApiBaseUrl()}/vehicles/${vehicleId}/images/${imageId}/cover`,
    { method: 'PATCH', headers: getAuthHeaders() },
  )

  if (!response.ok) {
    await throwResponseError(response, 'Não foi possível definir a imagem de capa.')
  }

  return response.json() as Promise<VehicleImage>
}

export async function deleteVehicleImage(vehicleId: number, imageId: number): Promise<void> {
  const response = await apiFetch(
    `${requireApiBaseUrl()}/vehicles/${vehicleId}/images/${imageId}`,
    { method: 'DELETE', headers: getAuthHeaders() },
  )

  if (!response.ok) {
    await throwResponseError(response, 'Não foi possível excluir a imagem.')
  }
}

export function getVehicleImageUrl(path: string): string {
  const storageBaseUrl = requireApiBaseUrl().replace(/\/api$/, '')
  return `${storageBaseUrl}/storage/${path.replace(/^\//, '')}`
}
