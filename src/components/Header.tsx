import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getStoredUser, logout } from '../services/api'
import '../App.css'

function Header() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const menuRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const user = getStoredUser()

  useEffect(() => {
    if (!isMenuOpen) return

    function handleOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isMenuOpen])

  function handleLogout() {
    logout()
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  return (
    <header className="app-header">
      <h1 className="app-brand">
        Autoconf<span>HUB</span>
      </h1>

      <div className="user-menu" ref={menuRef}>
        <button
          className="user-menu-trigger"
          type="button"
          onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
          aria-label="Abrir menu do usuário"
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4.5 20c.8-4 3.3-6 7.5-6s6.7 2 7.5 6" />
          </svg>
        </button>

        {isMenuOpen && (
          <div className="user-menu-dropdown" role="menu">
            <div className="user-menu-greeting">
              Olá, <strong>{user?.name ?? 'usuário'}</strong>
            </div>
            <div className="user-menu-options">
              <button type="button" role="menuitem">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="9" cy="8" r="3" />
                  <circle cx="17" cy="9" r="2.5" />
                  <path d="M3.5 19c.5-3.3 2.3-5 5.5-5s5 1.7 5.5 5M14.5 14.5c3.4-.5 5.3 1 5.8 4.5" />
                </svg>
                Usuários
              </button>
              <button type="button" role="menuitem" onClick={handleLogout}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
