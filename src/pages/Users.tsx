import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { deleteUser, getUsers } from '../services/api'
import type { User } from '../types/models'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function Users() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['users', page],
    queryFn: () => getUsers(page),
    placeholderData: keepPreviousData,
  })
  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: async () => {
      setUserToDelete(null)
      await queryClient.invalidateQueries({ queryKey: ['users'] })

      if (data?.data.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1)
      }
    },
  })

  return (
    <>
      <Header />
      <main className="users-page">
        <div className="users-heading">
          <div>
            <h2>Usuários</h2>
            <p>Usuários cadastrados no sistema.</p>
          </div>
          <div className="users-heading-actions">
            {data && <span>{data.total} {data.total === 1 ? 'usuário' : 'usuários'}</span>}
            <button type="button" onClick={() => navigate('/users/create')}>
              Criar usuário
            </button>
          </div>
        </div>

        {isLoading && <p className="users-message">Carregando usuários...</p>}
        {isError && <p className="users-message users-error">Não foi possível carregar os usuários.</p>}

        {data && (
          <section className="users-card" aria-busy={isFetching}>
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Perfil</th>
                    <th>Cadastro</th>
                    <th className="users-actions-heading"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="users-name">
                          <span aria-hidden="true">{user.name.charAt(0).toLocaleUpperCase('pt-BR')}</span>
                          <strong>{user.name}</strong>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={user.is_admin ? 'user-role is-admin' : 'user-role'}>
                          {user.is_admin ? 'Administrador' : 'Usuário'}
                        </span>
                      </td>
                      <td>{dateFormatter.format(new Date(user.created_at))}</td>
                      <td className="users-actions-cell">
                        <button
                          className="delete-user-button"
                          type="button"
                          onClick={() => {
                            deleteMutation.reset()
                            setUserToDelete(user)
                          }}
                          aria-label={`Excluir ${user.name}`}
                          title="Excluir usuário"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.data.length === 0 && (
              <p className="users-empty">Nenhum usuário encontrado.</p>
            )}

            {data.last_page > 1 && (
              <div className="users-pagination">
                <span>
                  Exibindo {data.from ?? 0}–{data.to ?? 0} de {data.total}
                </span>
                <div>
                  <button
                    type="button"
                    onClick={() => setPage((currentPage) => currentPage - 1)}
                    disabled={!data.prev_page_url || isFetching}
                  >
                    Anterior
                  </button>
                  <span>Página {data.current_page} de {data.last_page}</span>
                  <button
                    type="button"
                    onClick={() => setPage((currentPage) => currentPage + 1)}
                    disabled={!data.next_page_url || isFetching}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {userToDelete && (
          <div className="success-dialog-backdrop">
            <div
              className="delete-vehicle-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-user-title"
            >
              <div className="delete-vehicle-dialog-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
                </svg>
              </div>
              <h3 id="delete-user-title">Excluir usuário?</h3>
              <p>Tem certeza que deseja excluir {userToDelete.name}?</p>

              {deleteMutation.isError && (
                <span className="delete-vehicle-error" role="alert">
                  {deleteMutation.error instanceof Error
                    ? deleteMutation.error.message
                    : 'Não foi possível excluir o usuário.'}
                </span>
              )}

              <div className="delete-vehicle-dialog-actions">
                <button
                  className="cancel-button"
                  type="button"
                  onClick={() => {
                    deleteMutation.reset()
                    setUserToDelete(null)
                  }}
                  disabled={deleteMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  className="confirm-delete-vehicle-button"
                  type="button"
                  onClick={() => deleteMutation.mutate(userToDelete.id)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

export default Users
