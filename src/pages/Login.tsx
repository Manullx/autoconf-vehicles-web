import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ApiError, isAuthenticated, login, validateAuthToken } from '../services/api'
import '../App.css'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [validatingToken, setValidatingToken] = useState(isAuthenticated())
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const emailIsEmpty = email.trim().length === 0
  const passwordIsEmpty = password.trim().length === 0
  const showEmailRequired = submitted && emailIsEmpty
  const showEmailInvalid = (emailTouched || submitted) && !emailIsEmpty && !emailIsValid
  const showPasswordRequired = submitted && passwordIsEmpty
  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => login(email, password),
    onSuccess: () => {
      navigate('/vehicles')
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        setLoginError('E-mail ou senha inválidos.')
        return
      }
      setLoginError('Não foi possível conectar ao servidor.')
    },
  })

  useEffect(() => {
    if (!isAuthenticated()) return

    let active = true

    validateAuthToken()
      .then((isValid) => {
        if (!active) return
        if (isValid) {
          navigate('/vehicles', { replace: true })
          return
        }
        setValidatingToken(false)
      })
      .catch(() => {
        if (!active) return
        setLoginError('Não foi possível validar sua sessão. Tente entrar novamente.')
        setValidatingToken(false)
      })

    return () => {
      active = false
    }
  }, [navigate])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setEmailTouched(true)

    if (emailIsEmpty || passwordIsEmpty || !emailIsValid) {
      return
    }

    setLoginError('')
    loginMutation.mutate({ email: email.trim(), password })
  }

  if (validatingToken) {
    return (
      <main className="login-page">
        <p className="session-loading">Validando sessão...</p>
      </main>
    )
  }

  return (
    <main className="login-page">
      <section className="login-content" aria-labelledby="login-title">
        <header className="login-header">
          <h1 id="login-title">
            Autoconf<span>HUB</span>
          </h1>
          <p>Gestão de estoque de veículos</p>
        </header>

        <form className="login-card" noValidate onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              placeholder="digite seu e-mail..."
              aria-invalid={showEmailRequired || showEmailInvalid}
              aria-describedby={showEmailRequired || showEmailInvalid ? 'email-error' : undefined}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setEmailTouched(true)}
            />
            {(showEmailRequired || showEmailInvalid) && (
              <span id="email-error" className="field-error" role="alert">
                {showEmailRequired ? 'Preencha o e-mail.' : 'Digite um e-mail válido.'}
              </span>
            )}
          </div>

          <div className="field-group">
            <label htmlFor="password">Senha</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={passwordVisible ? 'text' : 'password'}
                value={password}
                placeholder="digite sua senha..."
                aria-invalid={showPasswordRequired}
                aria-describedby={showPasswordRequired ? 'password-error' : undefined}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={passwordVisible}
                onClick={() => setPasswordVisible((visible) => !visible)}
              >
                {!passwordVisible ? (
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
            </div>
            {showPasswordRequired && (
              <span id="password-error" className="field-error" role="alert">
                Preencha a senha.
              </span>
            )}
          </div>

          {loginError && (
            <span className="login-error" role="alert">
              {loginError}
            </span>
          )}

          <button className="login-button" type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default Login
