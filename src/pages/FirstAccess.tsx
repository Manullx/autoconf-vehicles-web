import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ApiError,
  ApiValidationError,
  createFirstAccessPassword,
  logout,
} from '../services/api'
import '../App.css'

function PasswordToggle({
  visible,
  onClick,
  label,
}: {
  visible: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      className="password-toggle"
      type="button"
      aria-label={label}
      aria-pressed={visible}
      onClick={onClick}
    >
      {!visible ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" />
          <circle cx="12" cy="12" r="2.25" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 3l18 18" />
          <path d="M10.6 7.15A11 11 0 0 1 12 7c6 0 9.5 5 9.5 5a16 16 0 0 1-2.18 2.55M6.05 6.05C3.75 7.55 2.5 12 2.5 12s3.5 5 9.5 5a10.8 10.8 0 0 0 3.15-.45" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </svg>
      )}
    </button>
  )
}

function FirstAccess() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmationVisible, setConfirmationVisible] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [apiPasswordError, setApiPasswordError] = useState('')
  const [requestError, setRequestError] = useState('')
  const passwordIsEmpty = password.length === 0
  const passwordIsTooShort = !passwordIsEmpty && password.length < 8
  const confirmationIsEmpty = confirmation.length === 0
  const passwordsDoNotMatch = !confirmationIsEmpty && password !== confirmation
  const passwordError = apiPasswordError
    || (submitted && passwordIsEmpty
      ? 'Preencha a nova senha.'
      : submitted && passwordIsTooShort
        ? 'A senha deve ter pelo menos 8 caracteres.'
        : '')
  const confirmationError = submitted && confirmationIsEmpty
    ? 'Confirme a nova senha.'
    : submitted && passwordsDoNotMatch
      ? 'As senhas devem ser iguais.'
      : ''
  const mutation = useMutation({
    mutationFn: () => createFirstAccessPassword(password, confirmation),
    onSuccess: () => {
      navigate('/vehicles', { replace: true })
    },
    onError: (mutationError) => {
      if (mutationError instanceof ApiError && mutationError.status === 401) {
        logout()
        navigate('/login', { replace: true })
        return
      }

      if (mutationError instanceof ApiValidationError) {
        setApiPasswordError(mutationError.errors.password?.[0] ?? mutationError.message)
        return
      }

      setRequestError(
        mutationError instanceof Error ? mutationError.message : 'Não foi possível criar sua senha.',
      )
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setApiPasswordError('')
    setRequestError('')

    if (
      passwordIsEmpty
      || passwordIsTooShort
      || confirmationIsEmpty
      || passwordsDoNotMatch
    ) return

    mutation.mutate()
  }

  return (
    <main className="login-page">
      <section className="login-content first-access-content" aria-labelledby="first-access-title">
        <header className="login-header">
          <h1>
            Autoconf<span>HUB</span>
          </h1>
          <p>Defina uma senha para concluir seu primeiro acesso.</p>
        </header>

        <form className="login-card" noValidate onSubmit={handleSubmit}>
          <h2 id="first-access-title" className="first-access-title">Criar senha</h2>

          <div className="field-group">
            <label htmlFor="new-password">Nova senha</label>
            <div className="password-field">
              <input
                id="new-password"
                name="password"
                type={passwordVisible ? 'text' : 'password'}
                value={password}
                placeholder="Mínimo de 8 caracteres"
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? 'new-password-error' : undefined}
                autoComplete="new-password"
                onChange={(event) => {
                  setPassword(event.target.value)
                  setApiPasswordError('')
                }}
              />
              <PasswordToggle
                visible={passwordVisible}
                onClick={() => setPasswordVisible((visible) => !visible)}
                label={passwordVisible ? 'Ocultar nova senha' : 'Mostrar nova senha'}
              />
            </div>
            {passwordError && (
              <span id="new-password-error" className="field-error" role="alert">
                {passwordError}
              </span>
            )}
          </div>

          <div className="field-group">
            <label htmlFor="password-confirmation">Confirmar nova senha</label>
            <div className="password-field">
              <input
                id="password-confirmation"
                name="password_confirmation"
                type={confirmationVisible ? 'text' : 'password'}
                value={confirmation}
                placeholder="Digite a senha novamente"
                aria-invalid={Boolean(confirmationError)}
                aria-describedby={confirmationError ? 'password-confirmation-error' : undefined}
                autoComplete="new-password"
                onChange={(event) => setConfirmation(event.target.value)}
              />
              <PasswordToggle
                visible={confirmationVisible}
                onClick={() => setConfirmationVisible((visible) => !visible)}
                label={confirmationVisible ? 'Ocultar confirmação' : 'Mostrar confirmação'}
              />
            </div>
            {confirmationError && (
              <span id="password-confirmation-error" className="field-error" role="alert">
                {confirmationError}
              </span>
            )}
          </div>

          {requestError && <span className="login-error" role="alert">{requestError}</span>}

          <button className="login-button" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Criar senha'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default FirstAccess
