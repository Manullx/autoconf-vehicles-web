import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import { getVehicle, getVehicleImageUrl } from '../services/api'

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

function VehicleDetails() {
  const navigate = useNavigate()
  const { vehicleId } = useParams()
  const parsedVehicleId = Number(vehicleId)
  const [selectedImage, setSelectedImage] = useState<number | null>(null)
  const { data: vehicle, isLoading, isError } = useQuery({
    queryKey: ['vehicle', parsedVehicleId],
    queryFn: () => getVehicle(parsedVehicleId),
    enabled: Number.isInteger(parsedVehicleId) && parsedVehicleId > 0,
  })

  const coverIndex = vehicle?.vehicle_images.findIndex((image) => image.is_cover) ?? -1
  const activeImageIndex = selectedImage ?? (coverIndex >= 0 ? coverIndex : 0)
  const activeImage = vehicle?.vehicle_images[activeImageIndex]

  return (
    <>
      <Header />
      <main className="vehicle-details-page">
        <button className="back-button" type="button" onClick={() => navigate('/vehicles')}>
          Voltar
        </button>

        {isLoading && <p className="vehicle-details-message">Carregando veículo...</p>}

        {(isError || !Number.isInteger(parsedVehicleId) || parsedVehicleId <= 0) && (
          <p className="vehicle-details-message vehicle-details-error">
            Não foi possível carregar o veículo.
          </p>
        )}

        {vehicle && (
          <div className="vehicle-details-layout">
            <section className="vehicle-gallery" aria-label="Imagens do veículo">
              <div className="vehicle-gallery-main">
                {activeImage ? (
                  <img
                    src={getVehicleImageUrl(activeImage.path)}
                    alt={`${vehicle.marca} ${vehicle.modelo}`}
                  />
                ) : (
                  <span>Veículo sem imagens</span>
                )}
              </div>

              {vehicle.vehicle_images.length > 1 && (
                <div className="vehicle-gallery-thumbnails">
                  {vehicle.vehicle_images.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      className={index === activeImageIndex ? 'is-active' : ''}
                      onClick={() => setSelectedImage(index)}
                      aria-label={`Visualizar imagem ${index + 1}`}
                    >
                      <img src={getVehicleImageUrl(image.path)} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="vehicle-information">
              <div className="vehicle-information-heading">
                <div>
                  <span className="vehicle-information-plate">{vehicle.placa}</span>
                  <h2>{vehicle.marca} {vehicle.modelo}</h2>
                  <p>{vehicle.versao}</p>
                </div>
                <strong>{priceFormatter.format(vehicle.valor_venda)}</strong>
              </div>

              <dl className="vehicle-specifications">
                <div><dt>Quilometragem</dt><dd>{vehicle.km.toLocaleString('pt-BR')} km</dd></div>
                <div><dt>Cor</dt><dd>{vehicle.cor}</dd></div>
                <div><dt>Câmbio</dt><dd>{vehicle.cambio}</dd></div>
                <div><dt>Combustível</dt><dd>{vehicle.combustivel}</dd></div>
                <div><dt>Chassi</dt><dd>{vehicle.chassi}</dd></div>
                <div><dt>Status</dt><dd>{vehicle.active ? 'Ativo' : 'Inativo'}</dd></div>
              </dl>
            </section>
          </div>
        )}
      </main>
    </>
  )
}

export default VehicleDetails
