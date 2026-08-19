import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getVehicles } from '../services/api'
import type { VehicleListParams } from '../types/models'

export const vehicleQueryKeys = {
  all: ['vehicles'] as const,
  list: (params: VehicleListParams) => [...vehicleQueryKeys.all, params] as const,
}

export function useVehicles(params: VehicleListParams) {
  return useQuery({
    queryKey: vehicleQueryKeys.list(params),
    queryFn: () => getVehicles(params),
    placeholderData: keepPreviousData,
  })
}
