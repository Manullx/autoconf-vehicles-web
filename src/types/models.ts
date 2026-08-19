export enum VehicleTransmission {
  Manual = 'manual',
  Automatic = 'automatico',
}

export enum VehicleFuel {
  Gasoline = 'gasolina',
  Ethanol = 'alcool',
  Flex = 'flex',
  Diesel = 'diesel',
  Hybrid = 'hibrido',
  Electric = 'eletrico',
}

export interface User {
  id: number
  name: string
  email: string
  email_verified_at: string | null
  created_at: string
  updated_at: string
  is_admin: boolean
  first_login: boolean
}

export interface VehicleImage {
  id: number
  path: string
  is_cover: boolean
}

export interface AuditUser {
  id: number
  name: string
  email?: string
}

export interface Vehicle {
  id: number
  active: boolean
  user_id?: number
  created_by?: number | null
  updated_by?: number | null
  created_at?: string
  updated_at?: string
  placa: string
  chassi: string
  marca: string
  modelo: string
  versao: string
  valor_venda: number
  cor: string
  km: number
  cambio: VehicleTransmission
  combustivel: VehicleFuel
  vehicle_images: VehicleImage[]
  creator?: AuditUser | null
  updater?: AuditUser | null
  created_by_user?: AuditUser | null
  updated_by_user?: AuditUser | null
}

export interface CreateVehicleData {
  placa: string
  chassi: string
  marca: string
  modelo: string
  versao: string
  valor_venda: string
  cor: string
  km: number
  cambio: VehicleTransmission
  combustivel: VehicleFuel
}

export interface CreateVehiclePayload extends CreateVehicleData {
  images: File[]
  cover_index: number | null
}

export interface UpdateVehiclePayload extends CreateVehicleData {
  vehicleId: number
  images: File[]
  initial_image_ids: number[]
  removed_image_ids: number[]
  cover_image_id: number | null
  cover_index: number | null
}

export interface LoginResponse {
  user: User
  first_login: boolean
  token: string
  token_type: string
}

export interface PaginationLink {
  url: string | null
  label: string
  active: boolean
}

export interface PaginatedResponse<T> {
  current_page: number
  data: T[]
  first_page_url: string
  from: number | null
  last_page: number
  last_page_url: string
  links: PaginationLink[]
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number | null
  total: number
}

export type VehiclesResponse = PaginatedResponse<Vehicle>
export type UsersResponse = PaginatedResponse<User>

export interface VehicleListParams {
  q?: string
  marca?: string
  modelo?: string
  placa?: string
  sort?: string
  page?: number
  per_page?: number
}

export interface CreateUserPayload {
  name: string
  email: string
  is_admin: boolean
}

export interface CreatedUserResponse extends User {
  temporary_password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
}

export interface ValidationErrorResponse {
  message?: string
  errors?: Record<string, string[]>
}
