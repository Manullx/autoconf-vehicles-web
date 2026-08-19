import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { ApiValidationError, createVehicle } from '../services/api'
import {
  VehicleFuel,
  VehicleTransmission,
  type CreateVehicleData,
  type CreateVehiclePayload,
} from '../types/models'

interface SelectedImage {
  id: string
  file: File
  previewUrl: string
}

const maxImages = 5
const maxImageSize = 200 * 1024 * 1024

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

  if (values.placa && !/^[A-Z]{3}\d[A-Z]\d{2}$/i.test(values.placa)) {
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
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [vehicleCreated, setVehicleCreated] = useState(false)
  const [saleValue, setSaleValue] = useState('')
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
  const [coverImageId, setCoverImageId] = useState<string | null>(null)
  const [imagesError, setImagesError] = useState('')
  const selectedImagesRef = useRef<SelectedImage[]>([])
  const mutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setVehicleCreated(true)
    },
    onError: (mutationError) => {
      if (mutationError instanceof ApiValidationError) {
        const apiErrors = Object.fromEntries(
          Object.entries(mutationError.errors).map(([field, messages]) => [field, messages[0]]),
        ) as FieldErrors
        setFieldErrors(apiErrors)
      }
      setError(mutationError instanceof Error ? mutationError.message : 'Não foi possível criar o veículo.')
    },
  })

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

    if (Object.keys(errors).length > 0) {
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
    const payload: CreateVehiclePayload = {
      ...vehicle,
      images: selectedImages.map((image) => image.file),
      cover_index: coverImageId
        ? selectedImages.findIndex((image) => image.id === coverImageId)
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

    const invalidFile = files.find((file) => !file.type.startsWith('image/'))
    if (invalidFile) {
      setImagesError('Selecione apenas arquivos de imagem.')
      return
    }

    const oversizedFile = files.find((file) => file.size > maxImageSize)
    if (oversizedFile) {
      setImagesError(`A imagem “${oversizedFile.name}” ultrapassa o limite de 200 MB.`)
      return
    }

    const newImages = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setSelectedImages((currentImages) => [...currentImages, ...newImages])
    if (!coverImageId && newImages[0]) setCoverImageId(newImages[0].id)
  }

  function removeImage(imageId: string) {
    setSelectedImages((currentImages) => {
      const imageToRemove = currentImages.find((image) => image.id === imageId)
      if (imageToRemove) URL.revokeObjectURL(imageToRemove.previewUrl)

      const remainingImages = currentImages.filter((image) => image.id !== imageId)
      if (coverImageId === imageId) setCoverImageId(remainingImages[0]?.id ?? null)
      return remainingImages
    })
  }

  function handleImageDisplayChange(imageId: string, display: string) {
    if (display === 'cover') {
      setCoverImageId(imageId)
      return
    }

    if (coverImageId === imageId) {
      const replacementCover = selectedImages.find((image) => image.id !== imageId)
      setCoverImageId(replacementCover?.id ?? imageId)
    }
  }

  return (
    <>
      <Header />
      <main className="create-vehicle-page">
        <div className="create-vehicle-heading">
          <div>
            <h2>Criar veículo</h2>
            <p>Preencha os dados para adicionar um veículo.</p>
          </div>
          <button className="back-button" type="button" onClick={() => navigate('/vehicles')}>Voltar</button>
        </div>

        <form className="create-vehicle-form" onSubmit={handleSubmit} noValidate>
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
                    defaultValue=""
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
                <small>Até 5 imagens, com no máximo 200 MB cada.</small>
              </div>
              <label className="add-images-button" aria-disabled={selectedImages.length >= maxImages}>
                Adicionar imagens
                <input
                  type="file"
                  accept="image/*"
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
                    <img src={image.previewUrl} alt={`Pré-visualização de ${image.file.name}`} />
                    {coverImageId === image.id && <span className="cover-badge">Capa</span>}
                    <div className="vehicle-image-overlay">
                      <label>
                        Exibição
                        <select
                          value={coverImageId === image.id ? 'cover' : 'gallery'}
                          onChange={(event) => handleImageDisplayChange(image.id, event.target.value)}
                        >
                          <option value="gallery">Galeria</option>
                          <option value="cover">Capa</option>
                        </select>
                      </label>
                      <button type="button" onClick={() => removeImage(image.id)}>Remover</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="create-vehicle-error" role="alert">{error}</p>}

          <div className="create-vehicle-actions">
            <button className="cancel-button" type="button" onClick={() => navigate('/vehicles')}>Cancelar</button>
            <button className="save-vehicle-button" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Criar Veículo'}
            </button>
          </div>
        </form>

        {vehicleCreated && (
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
              <h3 id="vehicle-created-title">Veículo criado com sucesso</h3>
              <button
                className="success-dialog-button"
                type="button"
                autoFocus
                onClick={() => navigate('/vehicles')}
              >
                Voltar para veículos
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

export default CreateVehicle
