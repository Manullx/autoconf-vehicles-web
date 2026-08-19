import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import {
  deleteVehicle,
  deleteVehicleImage,
  getVehicle,
  getVehicleImageUrl,
  setVehicleCover,
} from '../services/api'
import type { AuditUser, VehicleImage } from '../types/models'

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

function formatAuditDate(value?: string) {
  if (!value) return 'Não informado'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Não informado' : dateFormatter.format(date)
}

function formatAuditUser(user?: AuditUser | null, userId?: number | null) {
  if (user) return user.name
  return userId ? `Usuário #${userId}` : 'Não informado'
}

function VehicleDetails() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { vehicleId } = useParams()
  const parsedVehicleId = Number(vehicleId)
  const [selectedImage, setSelectedImage] = useState<number | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<VehicleImage | null>(null)
  const [imageFeedback, setImageFeedback] = useState('')
  const [imageActionError, setImageActionError] = useState('')
  const { data: vehicle, isLoading, isError } = useQuery({
    queryKey: ['vehicle', parsedVehicleId],
    queryFn: () => getVehicle(parsedVehicleId),
    enabled: Number.isInteger(parsedVehicleId) && parsedVehicleId > 0,
  })
  const deleteMutation = useMutation({
    mutationFn: () => deleteVehicle(parsedVehicleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.removeQueries({ queryKey: ['vehicle', parsedVehicleId] })
      navigate('/vehicles', { replace: true })
    },
  })
  const coverMutation = useMutation({
    mutationFn: (imageId: number) => setVehicleCover(parsedVehicleId, imageId),
    onMutate: () => {
      setImageFeedback('')
      setImageActionError('')
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vehicle', parsedVehicleId] })
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setImageFeedback('Imagem de capa atualizada com sucesso.')
    },
    onError: (error) => {
      setImageActionError(error instanceof Error ? error.message : 'Não foi possível definir a capa.')
    },
  })
  const deleteImageMutation = useMutation({
    mutationFn: (imageId: number) => deleteVehicleImage(parsedVehicleId, imageId),
    onSuccess: async () => {
      setSelectedImage(null)
      setImageToDelete(null)
      await queryClient.invalidateQueries({ queryKey: ['vehicle', parsedVehicleId] })
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setImageFeedback('Imagem excluída com sucesso.')
      setImageActionError('')
    },
  })

  const coverIndex = vehicle?.vehicle_images.findIndex((image) => image.is_cover) ?? -1
  const activeImageIndex = selectedImage ?? (coverIndex >= 0 ? coverIndex : 0)
  const activeImage = vehicle?.vehicle_images[activeImageIndex]
  const creator = vehicle?.creator ?? vehicle?.created_by_user
  const updater = vehicle?.updater ?? vehicle?.updated_by_user

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

              {activeImage && (
                <div className="vehicle-gallery-actions">
                  <button
                    className="set-cover-button"
                    type="button"
                    onClick={() => coverMutation.mutate(activeImage.id)}
                    disabled={activeImage.is_cover || coverMutation.isPending || deleteImageMutation.isPending}
                  >
                    {coverMutation.isPending
                      ? 'Definindo capa...'
                      : activeImage.is_cover ? 'Imagem de capa' : 'Definir como capa'}
                  </button>
                  <button
                    className="delete-image-button"
                    type="button"
                    onClick={() => {
                      deleteImageMutation.reset()
                      setImageFeedback('')
                      setImageActionError('')
                      setImageToDelete(activeImage)
                    }}
                    disabled={vehicle.vehicle_images.length <= 1 || coverMutation.isPending || deleteImageMutation.isPending}
                    title={vehicle.vehicle_images.length <= 1
                      ? 'O veículo deve manter pelo menos uma imagem.'
                      : 'Excluir imagem'}
                  >
                    Excluir imagem
                  </button>
                </div>
              )}

              {imageFeedback && <p className="image-action-feedback" role="status">{imageFeedback}</p>}
              {imageActionError && <p className="image-action-error" role="alert">{imageActionError}</p>}
            </section>

            <section className="vehicle-information">
              <div className="vehicle-information-heading">
                <div className="vehicle-information-title">
                  <div>
                    <span className="vehicle-information-plate">{vehicle.placa}</span>
                    <h2>{vehicle.marca} {vehicle.modelo}</h2>
                    <p>{vehicle.versao}</p>
                  </div>
                  <button
                    className="edit-vehicle-button"
                    type="button"
                    onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
                    aria-label="Editar veículo"
                    title="Editar veículo"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M13.5 6.5 17.5 10.5" />
                      <path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16Z" />
                    </svg>
                  </button>
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

              <dl className="vehicle-audit">
                <div>
                  <dt>Criado por</dt>
                  <dd>{formatAuditUser(creator, vehicle.created_by ?? vehicle.user_id)}</dd>
                </div>
                <div>
                  <dt>Criado em</dt>
                  <dd>{formatAuditDate(vehicle.created_at)}</dd>
                </div>
                <div>
                  <dt>Atualizado por</dt>
                  <dd>{formatAuditUser(updater, vehicle.updated_by)}</dd>
                </div>
                <div>
                  <dt>Atualizado em</dt>
                  <dd>{formatAuditDate(vehicle.updated_at)}</dd>
                </div>
              </dl>

              <button
                className="delete-vehicle-button"
                type="button"
                onClick={() => setShowDeleteConfirmation(true)}
              >
                Excluir veículo
              </button>
            </section>
          </div>
        )}

        {vehicle && showDeleteConfirmation && (
          <div className="success-dialog-backdrop">
            <div
              className="delete-vehicle-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-vehicle-title"
            >
              <div className="delete-vehicle-dialog-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
                </svg>
              </div>
              <h3 id="delete-vehicle-title">Excluir veículo?</h3>
              <p>
                Tem certeza que deseja excluir {vehicle.marca} {vehicle.modelo}?
              </p>

              {deleteMutation.isError && (
                <span className="delete-vehicle-error" role="alert">
                  {deleteMutation.error instanceof Error
                    ? deleteMutation.error.message
                    : 'Não foi possível excluir o veículo.'}
                </span>
              )}

              <div className="delete-vehicle-dialog-actions">
                <button
                  className="cancel-button"
                  type="button"
                  onClick={() => setShowDeleteConfirmation(false)}
                  disabled={deleteMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  className="confirm-delete-vehicle-button"
                  type="button"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        )}
        {vehicle && imageToDelete && (
          <div className="success-dialog-backdrop">
            <div
              className="delete-vehicle-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-image-title"
            >
              <div className="delete-vehicle-dialog-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
                </svg>
              </div>
              <h3 id="delete-image-title">Excluir imagem?</h3>
              <p>Esta ação remove permanentemente a imagem do veículo.</p>

              {deleteImageMutation.isError && (
                <span className="delete-vehicle-error" role="alert">
                  {deleteImageMutation.error instanceof Error
                    ? deleteImageMutation.error.message
                    : 'Não foi possível excluir a imagem.'}
                </span>
              )}

              <div className="delete-vehicle-dialog-actions">
                <button
                  className="cancel-button"
                  type="button"
                  onClick={() => {
                    deleteImageMutation.reset()
                    setImageToDelete(null)
                  }}
                  disabled={deleteImageMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  className="confirm-delete-vehicle-button"
                  type="button"
                  onClick={() => deleteImageMutation.mutate(imageToDelete.id)}
                  disabled={deleteImageMutation.isPending}
                >
                  {deleteImageMutation.isPending ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

export default VehicleDetails
