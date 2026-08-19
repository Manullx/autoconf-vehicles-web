import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { ApiValidationError, createUser } from '../services/api'
import type { CreatedUserResponse, CreateUserPayload } from '../types/models'

type UserField = 'name' | 'email'
type UserFieldErrors = Partial<Record<UserField, string>>

function CreateUser() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [fieldErrors, setFieldErrors] = useState<UserFieldErrors>({})
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [createdUser, setCreatedUser] = useState<CreatedUserResponse | null>(null)
  const [copyFeedback, setCopyFeedback] = useState('')
  const nameIsEmpty = name.trim().length === 0
  const emailIsEmpty = email.trim().length === 0
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const nameError = fieldErrors.name
    ?? (submitted && nameIsEmpty ? 'Preencha o nome.' : '')
  const emailError = fieldErrors.email
    ?? (emailTouched && emailIsEmpty
      ? 'Preencha o e-mail.'
      : emailTouched && !emailIsValid
        ? 'Digite um e-mail válido.'
        : '')
  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      setCreatedUser(user)
    },
    onError: (mutationError) => {
      if (mutationError instanceof ApiValidationError) {
        setFieldErrors(Object.fromEntries(
          Object.entries(mutationError.errors).map(([field, messages]) => [field, messages[0]]),
        ) as UserFieldErrors)
      }
      setError(mutationError instanceof Error ? mutationError.message : 'Não foi possível criar o usuário.')
    },
  })

  function clearFieldError(field: UserField) {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors
      const nextErrors = { ...currentErrors }
      delete nextErrors[field]
      return nextErrors
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitted(true)

    const payload: CreateUserPayload = {
      name: name.trim(),
      email: email.trim(),
      is_admin: isAdmin,
    }

    if (nameIsEmpty || emailIsEmpty || !emailIsValid) return

    mutation.mutate(payload)
  }

  async function copyTemporaryPassword() {
    if (!createdUser) return

    try {
      await navigator.clipboard.writeText(createdUser.temporary_password)
      setCopyFeedback('Senha copiada.')
    } catch {
      setCopyFeedback('Não foi possível copiar automaticamente. Copie a senha exibida.')
    }
  }

  return (
    <>
      <Header />
      <main className="create-user-page">
        <div className="create-vehicle-heading">
          <div>
            <h2>Criar usuário</h2>
            <p>Preencha os dados para adicionar um usuário.</p>
          </div>
          <button className="back-button" type="button" onClick={() => navigate('/users')}>Voltar</button>
        </div>

        <form className="create-user-form" onSubmit={handleSubmit} noValidate>
          <label className="field-group">
            <span>Nome</span>
            <input
              name="name"
              type="text"
              value={name}
              placeholder="Nome do usuário"
              maxLength={255}
              onChange={(event) => {
                setName(event.target.value)
                clearFieldError('name')
              }}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? 'name-error' : undefined}
              required
            />
            {nameError && <span id="name-error" className="field-error" role="alert">{nameError}</span>}
          </label>

          <label className="field-group">
            <span>E-mail</span>
            <input
              name="email"
              type="email"
              value={email}
              placeholder="usuario@exemplo.com"
              maxLength={255}
              onChange={(event) => {
                setEmail(event.target.value)
                setEmailTouched(false)
                clearFieldError('email')
              }}
              onBlur={() => setEmailTouched(true)}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'email-error' : undefined}
              required
            />
            {emailError && <span id="email-error" className="field-error" role="alert">{emailError}</span>}
          </label>

          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(event) => setIsAdmin(event.target.checked)}
            />
            <span>
              <strong>Administrador</strong>
              <small>Permitir acesso ao gerenciamento de usuários.</small>
            </span>
          </label>

          {error && <p className="create-vehicle-error" role="alert">{error}</p>}

          <div className="create-vehicle-actions">
            <button className="cancel-button" type="button" onClick={() => navigate('/users')}>Cancelar</button>
            <button className="save-vehicle-button" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Criar usuário'}
            </button>
          </div>
        </form>

        {createdUser && (
          <div className="success-dialog-backdrop">
            <div className="success-dialog" role="dialog" aria-modal="true" aria-labelledby="user-created-title">
              <div className="success-dialog-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m8 12 2.5 2.5L16 9" />
                </svg>
              </div>
              <h3 id="user-created-title">Usuário criado com sucesso</h3>
              <p className="temporary-password-help">
                Envie esta senha temporária para <strong>{createdUser.name}</strong>. Ela será exibida somente agora.
              </p>
              <div className="temporary-password-value">
                <code>{createdUser.temporary_password}</code>
                <button type="button" onClick={copyTemporaryPassword}>Copiar</button>
              </div>
              {copyFeedback && <span className="copy-feedback" role="status">{copyFeedback}</span>}
              <button
                className="success-dialog-button"
                type="button"
                autoFocus
                onClick={() => navigate('/users')}
              >
                Voltar para usuários
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

export default CreateUser
