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
}

export interface VehicleImage {
  id: number
  path: string
  is_cover: boolean
}

export interface Vehicle {
  id: number
  active: number
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

export interface LoginResponse {
  user: User
  token: string
  token_type: string
}

export interface VehiclesResponse {
  current_page: number
  data: Vehicle[]
}

export interface ValidationErrorResponse {
  message?: string
  errors?: Record<string, string[]>
}
