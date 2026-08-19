import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import {
  ApiValidationError,
  PartialVehicleUpdateError,
  createVehicle,
  getVehicle,
  getVehicleImageUrl,
  updateVehicle,
} from '../services/api'
import {
  VehicleFuel,
  VehicleTransmission,
  type CreateVehicleData,
  type CreateVehiclePayload,
  type UpdateVehiclePayload,
  type Vehicle,
} from '../types/models'

interface SelectedImage {
  id: string
  file?: File
  existingId?: number
  name: string
  previewUrl: string
}

const maxImages = 5
const maxImageSize = 2 * 1024 * 1024
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

const transmissionOptions = [
  { value: VehicleTransmission.Manual, label: 'Manual' },
  { value: VehicleTransmission.Automatic, label: 'Automático' },
]

const fuelOptions = [
  { value: VehicleFuel.Gasoline, label: 'Gasolina' },
  { value: VehicleFuel.Ethanol, label: 'Álcool' },
  { value: VehicleFuel.Flex, label: 'Flex' },
  { value: VehicleFuel.Diesel, label: 'Diesel' },
  { value: VehicleFuel.Hybrid, label: 'Híbrido' },
  { value: VehicleFuel.Electric, label: 'Elétrico' },
]

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const fields = [
  { name: 'placa', label: 'Placa', placeholder: 'ABC1D24', type: 'text' },
  { name: 'chassi', label: 'Chassi', placeholder: 's72kc9a63b0al4cv5', type: 'text', maxLength: 17 },
  { name: 'marca', label: 'Marca', placeholder: 'Ford', type: 'text' },
  { name: 'modelo', label: 'Modelo', placeholder: 'Fusion', type: 'text' },
  { name: 'versao', label: 'Versão', placeholder: 'Hybrid', type: 'text' },
  { name: 'valor_venda', label: 'Valor de venda', placeholder: '105000.12', type: 'number', step: '0.01' },
  { name: 'cor', label: 'Cor', placeholder: 'Prata', type: 'text' },
  { name: 'km', label: 'Quilometragem', placeholder: '105000', type: 'number', step: '1' },
  { name: 'cambio', label: 'Câmbio', placeholder: '', type: 'select' },
  { name: 'combustivel', label: 'Combustível', placeholder: '', type: 'select' },
] as const

type FieldName = keyof CreateVehicleData
type FieldErrors = Partial<Record<FieldName, string>>

function validateVehicle(formData: FormData) {
  const values = Object.fromEntries(formData.entries()) as Record<FieldName, string>
  const errors: FieldErrors = {}
  const requiredFields = fields.map((field) => field.name)

  if (values.valor_venda) {
    const valueInCents = values.valor_venda.replace(/\D/g, '')
    values.valor_venda = (Number(valueInCents) / 100).toFixed(2)
  }

  requiredFields.forEach((field) => {
    if (!values[field]?.trim()) {
      errors[field] = 'Este campo é obrigatório.'
    }
  })

  if (values.placa && !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i.test(values.placa)) {
    errors.placa = 'Informe uma placa válida no formato ABC1D23.'
  }

  if (values.chassi && !/^[A-Z0-9]{17}$/i.test(values.chassi)) {
    errors.chassi = 'O chassi deve conter exatamente 17 letras ou números.'
  }

  if (values.valor_venda && !/^\d+\.\d{2}$/.test(values.valor_venda)) {
    errors.valor_venda = 'Informe um valor maior que zero com duas casas decimais.'
  } else if (Number(values.valor_venda) < 0.01) {
    errors.valor_venda = 'O valor de venda deve ser de pelo menos 0,01.'
  }

  if (values.km && !/^\d+$/.test(values.km)) {
    errors.km = 'A quilometragem deve ser um número inteiro maior ou igual a zero.'
  }

  if (values.cambio && !transmissionOptions.some((option) => option.value === values.cambio)) {
    errors.cambio = 'Selecione um câmbio válido.'
  }

  if (values.combustivel && !fuelOptions.some((option) => option.value === values.combustivel)) {
    errors.combustivel = 'Selecione um combustível válido.'
  }

  return { values, errors }
}

function CreateVehicle() {
  const navigate = useNavigate()
  const { vehicleId } = useParams()
  const parsedVehicleId = Number(vehicleId)
  const isEditing = vehicleId !== undefined
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [vehicleSaved, setVehicleSaved] = useState(false)
  const [formVersion, setFormVersion] = useState(0)
  const [saleValue, setSaleValue] = useState('')
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
  const [coverImageId, setCoverImageId] = useState<string | null>(null)
  const [imagesError, setImagesError] = useState('')
  const selectedImagesRef = useRef<SelectedImage[]>([])
  const initialImageIdsRef = useRef<number[]>([])
  const formInitializedRef = useRef(false)
  const {
    data: existingVehicle,
    isLoading: isLoadingVehicle,
    isError: isVehicleError,
    refetch: refetchVehicle,
  } = useQuery({
    queryKey: ['vehicle', parsedVehicleId],
    queryFn: () => getVehicle(parsedVehicleId),
    enabled: isEditing && Number.isInteger(parsedVehicleId) && parsedVehicleId > 0,
  })

  function initializeVehicleForm(vehicle: Vehicle) {
    selectedImagesRef.current.forEach((image) => {
      if (image.file) URL.revokeObjectURL(image.previewUrl)
    })
    const currentImages = vehicle.vehicle_images.map((image) => ({
      id: `existing-${image.id}`,
      existingId: image.id,
      name: `Imagem ${image.id}`,
      previewUrl: getVehicleImageUrl(image.path),
    }))
    const cover = vehicle.vehicle_images.find((image) => image.is_cover)

    setSaleValue(currencyFormatter.format(vehicle.valor_venda))
    setSelectedImages(currentImages)
    setCoverImageId(cover ? `existing-${cover.id}` : currentImages[0]?.id ?? null)
    setFieldErrors({})
    setImagesError('')
    initialImageIdsRef.current = vehicle.vehicle_images.map((image) => image.id)
    formInitializedRef.current = true
    setFormVersion((currentVersion) => currentVersion + 1)
  }

  const mutation = useMutation({
    mutationFn: (payload: CreateVehiclePayload | UpdateVehiclePayload) => (
      'vehicleId' in payload ? updateVehicle(payload) : createVehicle(payload)
    ),
    onSuccess: async (savedVehicle) => {
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      await queryClient.invalidateQueries({ queryKey: ['vehicle', savedVehicle.id] })
      setVehicleSaved(true)
    },
    onError: async (mutationError) => {
      if (mutationError instanceof ApiValidationError) {
        const entries = Object.entries(mutationError.errors)
        const apiErrors = Object.fromEntries(
          entries
            .filter(([field]) => fields.some((vehicleField) => vehicleField.name === field))
            .map(([field, messages]) => [field, messages[0]]),
        ) as FieldErrors
        setFieldErrors(apiErrors)
        const imageError = entries.find(([field]) => field === 'files'
          || field.startsWith('files.')
          || field === 'cover_index')
        if (imageError) setImagesError(imageError[1][0])
      }
      if (mutationError instanceof PartialVehicleUpdateError) {
        const refreshedVehicle = await refetchVehicle()

        if (refreshedVehicle.isSuccess && refreshedVehicle.data) {
          initializeVehicleForm(refreshedVehicle.data)
          setError(`${mutationError.message} O formulário foi atualizado com o estado atual do servidor.`)
        } else {
          setError(`${mutationError.message} Recarregue a página antes de tentar novamente.`)
        }
        return
      }

      setError(mutationError instanceof Error
        ? mutationError.message
        : `Não foi possível ${isEditing ? 'atualizar' : 'criar'} o veículo.`)
    },
  })

  useEffect(() => {
    if (!isEditing || !existingVehicle || formInitializedRef.current) return

    initializeVehicleForm(existingVehicle)
  }, [existingVehicle, isEditing])

  useEffect(() => {
    selectedImagesRef.current = selectedImages
  }, [selectedImages])

  useEffect(() => () => {
    selectedImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl))
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const formData = new FormData(event.currentTarget)
    const { values, errors } = validateVehicle(formData)
    setFieldErrors(errors)

    if (selectedImages.length === 0) {
      setImagesError('Adicione pelo menos uma imagem ao veículo.')
    } else if (!coverImageId) {
      setImagesError('Selecione uma imagem de capa.')
    } else {
      setImagesError('')
    }

    if (Object.keys(errors).length > 0 || selectedImages.length === 0 || !coverImageId) {
      return
    }

    const vehicle: CreateVehicleData = {
      placa: values.placa,
      chassi: values.chassi,
      marca: values.marca,
      modelo: values.modelo,
      versao: values.versao,
      valor_venda: values.valor_venda,
      cor: values.cor,
      km: Number(values.km),
      cambio: values.cambio as VehicleTransmission,
      combustivel: values.combustivel as VehicleFuel,
    }
    const newImages = selectedImages.filter(
      (image): image is SelectedImage & { file: File } => Boolean(image.file),
    )

    if (isEditing) {
      const retainedImageIds = new Set(
        selectedImages.flatMap((image) => image.existingId !== undefined ? [image.existingId] : []),
      )
      const coverImage = selectedImages.find((image) => image.id === coverImageId)
      const initialCoverId = existingVehicle?.vehicle_images.find((image) => image.is_cover)?.id
      const removedImageIds = initialImageIdsRef.current
        .filter((id) => !retainedImageIds.has(id))
        .sort((firstId, secondId) => Number(firstId === initialCoverId) - Number(secondId === initialCoverId))
      const payload: UpdateVehiclePayload = {
        ...vehicle,
        vehicleId: parsedVehicleId,
        images: newImages.map((image) => image.file),
        initial_image_ids: initialImageIdsRef.current,
        removed_image_ids: removedImageIds,
        cover_image_id: coverImage?.existingId ?? null,
        cover_index: coverImage?.file
          ? newImages.findIndex((image) => image.id === coverImage.id)
          : null,
      }
      mutation.mutate(payload)
      return
    }

    const payload: CreateVehiclePayload = {
      ...vehicle,
      images: newImages.map((image) => image.file),
      cover_index: coverImageId
        ? newImages.findIndex((image) => image.id === coverImageId)
        : null,
    }
    mutation.mutate(payload)
  }

  function clearFieldError(field: FieldName) {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors
      const nextErrors = { ...currentErrors }
      delete nextErrors[field]
      return nextErrors
    })
  }

  function handleSaleValueChange(value: string) {
    const valueInCents = value.replace(/\D/g, '')
    setSaleValue(valueInCents ? currencyFormatter.format(Number(valueInCents) / 100) : '')
    clearFieldError('valor_venda')
  }

  function handleImagesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    setImagesError('')

    if (selectedImages.length + files.length > maxImages) {
      setImagesError('Você pode adicionar no máximo 5 imagens.')
      return
    }

    const invalidFile = files.find((file) => !allowedImageTypes.has(file.type))
    if (invalidFile) {
      setImagesError('Selecione apenas imagens JPG, JPEG, PNG ou WebP.')
      return
    }

    const oversizedFile = files.find((file) => file.size > maxImageSize)
    if (oversizedFile) {
      setImagesError(`A imagem “${oversizedFile.name}” ultrapassa o limite de 2 MB.`)
      return
    }

    const newImages = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    }))

    setSelectedImages((currentImages) => [...currentImages, ...newImages])
    if (!coverImageId && newImages[0]) setCoverImageId(newImages[0].id)
  }

  function removeImage(imageId: string) {
    const selectedImage = selectedImages.find((image) => image.id === imageId)

    if (
      selectedImage?.existingId !== undefined
      && !window.confirm('Remover esta imagem? A exclusão será efetivada quando você salvar as alterações.')
    ) return

    setSelectedImages((currentImages) => {
      const imageToRemove = currentImages.find((image) => image.id === imageId)
      if (imageToRemove?.file) URL.revokeObjectURL(imageToRemove.previewUrl)

      const remainingImages = currentImages.filter((image) => image.id !== imageId)
      if (coverImageId === imageId) setCoverImageId(remainingImages[0]?.id ?? null)
      if (remainingImages.length === 0) {
        setImagesError('O veículo deve manter pelo menos uma imagem.')
      } else {
        setImagesError('')
      }
      return remainingImages
    })
  }

  const returnPath = isEditing ? `/vehicles/${parsedVehicleId}` : '/vehicles'

  if (isEditing && isLoadingVehicle) {
    return (
      <>
        <Header />
        <main className="create-vehicle-page">
          <p className="vehicle-details-message">Carregando veículo...</p>
        </main>
      </>
    )
  }

  if (
    isEditing
    && (isVehicleError || !existingVehicle || !Number.isInteger(parsedVehicleId) || parsedVehicleId <= 0)
  ) {
    return (
      <>
        <Header />
        <main className="create-vehicle-page">
          <button className="back-button" type="button" onClick={() => navigate('/vehicles')}>Voltar</button>
          <p className="vehicle-details-message vehicle-details-error">
            Não foi possível carregar o veículo.
          </p>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="create-vehicle-page">
        <div className="create-vehicle-heading">
          <div>
            <h2>{isEditing ? 'Editar veículo' : 'Criar veículo'}</h2>
            <p>
              {isEditing
                ? 'Atualize os dados e as imagens do veículo.'
                : 'Preencha os dados para adicionar um veículo.'}
            </p>
          </div>
          <button className="back-button" type="button" onClick={() => navigate(returnPath)}>Voltar</button>
        </div>

        <form key={formVersion} className="create-vehicle-form" onSubmit={handleSubmit} noValidate>
          <div className="create-vehicle-fields">
            {fields.map((field) => (
              <label className="field-group" key={field.name}>
                <span>{field.label}</span>
                {field.name === 'valor_venda' ? (
                  <input
                    name={field.name}
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 105.000,12"
                    value={saleValue}
                    onChange={(event) => handleSaleValueChange(event.target.value)}
                    aria-invalid={Boolean(fieldErrors[field.name])}
                    required
                  />
                ) : field.type === 'select' ? (
                  <select
                    name={field.name}
                    defaultValue={existingVehicle?.[field.name] ?? ''}
                    onChange={() => clearFieldError(field.name)}
                    aria-invalid={Boolean(fieldErrors[field.name])}
                    required
                  >
                    <option value="" disabled>
                      Selecione {field.name === 'cambio' ? 'o câmbio' : 'o combustível'}
                    </option>
                    {field.name === 'cambio' ? (
                      transmissionOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))
                    ) : (
                      fuelOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))
                    )}
                  </select>
                ) : (
                  <input
                    name={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    step={'step' in field ? field.step : undefined}
                    maxLength={'maxLength' in field ? field.maxLength : undefined}
                    min={field.type === 'number' ? 0 : undefined}
                    defaultValue={existingVehicle ? String(existingVehicle[field.name]) : undefined}
                    onChange={() => clearFieldError(field.name)}
                    aria-invalid={Boolean(fieldErrors[field.name])}
                    required
                  />
                )}
                {fieldErrors[field.name] && (
                  <span className="field-error">{fieldErrors[field.name]}</span>
                )}
              </label>
            ))}
          </div>

          <div className="vehicle-images-field">
            <div className="vehicle-images-heading">
              <div>
                <span>Imagens</span>
                <small>
                  De 1 a 5 imagens, com no máximo 2 MB cada.
                  {isEditing && ' Remoções só serão efetivadas ao salvar.'}
                </small>
              </div>
              <label className="add-images-button" aria-disabled={selectedImages.length >= maxImages}>
                Adicionar imagens
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  multiple
                  disabled={selectedImages.length >= maxImages}
                  onChange={handleImagesChange}
                />
              </label>
            </div>

            {imagesError && <span className="field-error" role="alert">{imagesError}</span>}

            {selectedImages.length > 0 && (
              <div className="vehicle-images-preview">
                {selectedImages.map((image) => (
                  <div className="vehicle-image-preview" key={image.id}>
                    <img src={image.previewUrl} alt={`Pré-visualização de ${image.name}`} />
                    {coverImageId === image.id && <span className="cover-badge">Capa</span>}
                    <div className="vehicle-image-overlay">
                      <div className="vehicle-image-controls">
                        <label className="image-cover-checkbox">
                          <input
                            type="checkbox"
                            checked={coverImageId === image.id}
                            onChange={(event) => {
                              if (event.target.checked) setCoverImageId(image.id)
                            }}
                          />
                          Cover
                        </label>
                        <button
                          className="remove-image-button"
                          type="button"
                          onClick={() => removeImage(image.id)}
                          aria-label={`Remover ${image.name}`}
                          title="Remover imagem"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="create-vehicle-error" role="alert">{error}</p>}

          <div className="create-vehicle-actions">
            <button className="cancel-button" type="button" onClick={() => navigate(returnPath)}>Cancelar</button>
            <button className="save-vehicle-button" type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? 'Salvando...'
                : isEditing ? 'Salvar alterações' : 'Criar Veículo'}
            </button>
          </div>
        </form>

        {vehicleSaved && (
          <div className="success-dialog-backdrop">
            <div
              className="success-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="vehicle-created-title"
            >
              <div className="success-dialog-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m8 12 2.5 2.5L16 9" />
                </svg>
              </div>
              <h3 id="vehicle-created-title">
                Veículo {isEditing ? 'atualizado' : 'criado'} com sucesso
              </h3>
              <button
                className="success-dialog-button"
                type="button"
                autoFocus
                onClick={() => navigate(returnPath)}
              >
                {isEditing ? 'Voltar para o veículo' : 'Voltar para veículos'}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

export default CreateVehicle
