import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ApiValidationError, registerUser } from '../services/api'
import type { RegisterPayload } from '../types/models'
import '../App.css'

type RegisterField = keyof RegisterPayload
type RegisterErrors = Partial<Record<RegisterField, string>>

function PasswordToggle({
  visible,
  label,
  onClick,
}: {
  visible: boolean
  label: string
  onClick: () => void
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

function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmationVisible, setConfirmationVisible] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<RegisterErrors>({})
  const [requestError, setRequestError] = useState('')
  const [registered, setRegistered] = useState(false)
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const validationErrors: RegisterErrors = {
    name: submitted && !name.trim() ? 'Preencha o nome.' : undefined,
    email: submitted && !email.trim()
      ? 'Preencha o e-mail.'
      : submitted && !emailIsValid ? 'Digite um e-mail válido.' : undefined,
    password: submitted && !password
      ? 'Preencha a senha.'
      : submitted && password.length < 8 ? 'A senha deve ter pelo menos 8 caracteres.' : undefined,
    password_confirmation: submitted && !confirmation
      ? 'Confirme a senha.'
      : submitted && password !== confirmation ? 'As senhas devem ser iguais.' : undefined,
  }
  const errors = { ...validationErrors, ...fieldErrors }
  const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess: () => setRegistered(true),
    onError: (error) => {
      if (error instanceof ApiValidationError) {
        setFieldErrors(Object.fromEntries(
          Object.entries(error.errors).map(([field, messages]) => [field, messages[0]]),
        ) as RegisterErrors)
        setRequestError(error.message)
        return
      }

      setRequestError(error instanceof Error ? error.message : 'Não foi possível criar sua conta.')
    },
  })

  function clearFieldError(field: RegisterField) {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors
      const nextErrors = { ...currentErrors }
      delete nextErrors[field]
      return nextErrors
    })
    setRequestError('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setRequestError('')

    if (
      !name.trim()
      || !email.trim()
      || !emailIsValid
      || password.length < 8
      || !confirmation
      || password !== confirmation
    ) return

    mutation.mutate({
      name: name.trim(),
      email: email.trim(),
      password,
      password_confirmation: confirmation,
    })
  }

  return (
    <main className="login-page">
      <section className="login-content register-content" aria-labelledby="register-title">
        <header className="login-header">
          <h1><img src="/autoconf-logo.png" alt="Autoconf" /></h1>
          <p>Crie sua conta para gerenciar veículos.</p>
        </header>

        <form className="login-card" noValidate onSubmit={handleSubmit}>
          <h2 id="register-title" className="first-access-title">Criar conta</h2>

          <div className="field-group">
            <label htmlFor="register-name">Nome</label>
            <input
              id="register-name"
              name="name"
              type="text"
              value={name}
              maxLength={255}
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'register-name-error' : undefined}
              onChange={(event) => {
                setName(event.target.value)
                clearFieldError('name')
              }}
            />
            {errors.name && <span id="register-name-error" className="field-error" role="alert">{errors.name}</span>}
          </div>

          <div className="field-group">
            <label htmlFor="register-email">E-mail</label>
            <input
              id="register-email"
              name="email"
              type="email"
              value={email}
              maxLength={255}
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'register-email-error' : undefined}
              onChange={(event) => {
                setEmail(event.target.value)
                clearFieldError('email')
              }}
            />
            {errors.email && <span id="register-email-error" className="field-error" role="alert">{errors.email}</span>}
          </div>

          <div className="field-group">
            <label htmlFor="register-password">Senha</label>
            <div className="password-field">
              <input
                id="register-password"
                name="password"
                type={passwordVisible ? 'text' : 'password'}
                value={password}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'register-password-error' : undefined}
                onChange={(event) => {
                  setPassword(event.target.value)
                  clearFieldError('password')
                }}
              />
              <PasswordToggle
                visible={passwordVisible}
                label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setPasswordVisible((visible) => !visible)}
              />
            </div>
            {errors.password && <span id="register-password-error" className="field-error" role="alert">{errors.password}</span>}
          </div>

          <div className="field-group">
            <label htmlFor="register-confirmation">Confirmar senha</label>
            <div className="password-field">
              <input
                id="register-confirmation"
                name="password_confirmation"
                type={confirmationVisible ? 'text' : 'password'}
                value={confirmation}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password_confirmation)}
                aria-describedby={errors.password_confirmation ? 'register-confirmation-error' : undefined}
                onChange={(event) => {
                  setConfirmation(event.target.value)
                  clearFieldError('password_confirmation')
                }}
              />
              <PasswordToggle
                visible={confirmationVisible}
                label={confirmationVisible ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                onClick={() => setConfirmationVisible((visible) => !visible)}
              />
            </div>
            {errors.password_confirmation && (
              <span id="register-confirmation-error" className="field-error" role="alert">
                {errors.password_confirmation}
              </span>
            )}
          </div>

          {requestError && <span className="login-error" role="alert">{requestError}</span>}

          <button className="login-button" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Criando conta...' : 'Criar conta'}
          </button>

          <p className="auth-alternative">Já possui conta? <Link to="/login">Entrar</Link></p>
        </form>

        {registered && (
          <div className="success-dialog-backdrop">
            <div className="success-dialog" role="dialog" aria-modal="true" aria-labelledby="registered-title">
              <div className="success-dialog-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m8 12 2.5 2.5L16 9" />
                </svg>
              </div>
              <h3 id="registered-title">Conta criada com sucesso</h3>
              <button
                className="success-dialog-button"
                type="button"
                autoFocus
                onClick={() => navigate('/login', {
                  replace: true,
                  state: { sessionMessage: 'Conta criada. Entre com seu e-mail e senha.' },
                })}
              >
                Ir para o login
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default Register
