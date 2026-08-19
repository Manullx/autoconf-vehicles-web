import type { Vehicle } from '../../types/models'
import { getVehicleImageUrl } from '../../services/api'
import { Link } from 'react-router-dom'
import './VehicleCard.css'

type VehicleCardProps = {
  vehicle: Vehicle
}

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

function VehicleCard({ vehicle }: VehicleCardProps) {
  const cover = vehicle.vehicle_images.find((image) => image.is_cover) ?? vehicle.vehicle_images[0]

  return (
    <Link
      className="vehicle-card-link"
      to={`/vehicles/${vehicle.id}`}
      aria-label={`Ver detalhes de ${vehicle.marca} ${vehicle.modelo}`}
    >
      <article className="vehicle-card">
        <div className="vehicle-card-image">
          {cover && (
            <img
              src={getVehicleImageUrl(cover.path)}
              alt={`${vehicle.marca} ${vehicle.modelo}`}
            />
          )}
        </div>

        <div className="vehicle-card-content">
          <div>
            <h2>{vehicle.marca} {vehicle.modelo}</h2>
            <p className="vehicle-version">{vehicle.versao}</p>
          </div>

          <div className="vehicle-details">
            <span>{vehicle.km.toLocaleString('pt-BR')} km</span>
            <span>{vehicle.cor}</span>
            <span>{vehicle.cambio}</span>
            <span>{vehicle.combustivel}</span>
          </div>

          <div className="vehicle-card-footer">
            <span className="vehicle-plate">{vehicle.placa}</span>
            <strong>{priceFormatter.format(vehicle.valor_venda)}</strong>
          </div>
        </div>
      </article>
    </Link>
  )
}

export default VehicleCard
