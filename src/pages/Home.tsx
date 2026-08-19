import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import VehicleCard from '../components/Vehicles/VehicleCard'
import { useVehicles } from '../hooks/useVehicles'

interface VehicleFilters {
  q: string
  marca: string
  modelo: string
  placa: string
}

const emptyFilters: VehicleFilters = {
  q: '',
  marca: '',
  modelo: '',
  placa: '',
}

const sortOptions = [
  { value: '-created_at', label: 'Mais recentes' },
  { value: 'created_at', label: 'Mais antigos' },
  { value: 'valor_venda', label: 'Menor preço' },
  { value: '-valor_venda', label: 'Maior preço' },
  { value: 'km', label: 'Menor quilometragem' },
  { value: '-km', label: 'Maior quilometragem' },
]

function sortField(sort: string) {
  return sort.replace(/^-/, '')
}

function Home() {
  const navigate = useNavigate()
  const [draftFilters, setDraftFilters] = useState<VehicleFilters>(emptyFilters)
  const [filters, setFilters] = useState<VehicleFilters>(emptyFilters)
  const [primarySort, setPrimarySort] = useState('-created_at')
  const [secondarySort, setSecondarySort] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const sort = useMemo(() => {
    if (!secondarySort || sortField(primarySort) === sortField(secondarySort)) return primarySort
    return `${primarySort},${secondarySort}`
  }, [primarySort, secondarySort])
  const queryParams = useMemo(() => ({
    q: filters.q.trim() || undefined,
    marca: filters.marca.trim() || undefined,
    modelo: filters.modelo.trim() || undefined,
    placa: filters.placa.trim() || undefined,
    sort,
    page,
    per_page: perPage,
  }), [filters, page, perPage, sort])
  const {
    data,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useVehicles(queryParams)

  function updateDraftFilter(field: keyof VehicleFilters, value: string) {
    setDraftFilters((currentFilters) => ({ ...currentFilters, [field]: value }))
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setFilters({
      q: draftFilters.q.trim(),
      marca: draftFilters.marca.trim(),
      modelo: draftFilters.modelo.trim(),
      placa: draftFilters.placa.trim().toLocaleUpperCase('pt-BR'),
    })
  }

  function clearFilters() {
    setDraftFilters(emptyFilters)
    setFilters(emptyFilters)
    setPage(1)
  }

  return (
    <>
      <Header />
      <main className="vehicles-page">
        <div className="vehicles-heading">
          <div>
            <h2>Veículos</h2>
            <p>Consulte e gerencie o estoque de veículos.</p>
          </div>
          <button
            className="create-vehicle-button"
            type="button"
            onClick={() => navigate('/vehicles/create')}
          >
            Criar veículo
          </button>
        </div>

        <form className="vehicles-filters" onSubmit={applyFilters}>
          <label className="vehicles-search">
            <span>Busca geral</span>
            <div>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <input
                type="search"
                placeholder="Marca, modelo ou placa"
                value={draftFilters.q}
                onChange={(event) => updateDraftFilter('q', event.target.value)}
              />
            </div>
          </label>

          <label className="vehicles-filter-field">
            <span>Marca</span>
            <input
              type="text"
              value={draftFilters.marca}
              onChange={(event) => updateDraftFilter('marca', event.target.value)}
              placeholder="Ex.: Toyota"
            />
          </label>

          <label className="vehicles-filter-field">
            <span>Modelo</span>
            <input
              type="text"
              value={draftFilters.modelo}
              onChange={(event) => updateDraftFilter('modelo', event.target.value)}
              placeholder="Ex.: Corolla"
            />
          </label>

          <label className="vehicles-filter-field vehicles-plate-filter">
            <span>Placa</span>
            <input
              type="text"
              value={draftFilters.placa}
              maxLength={7}
              onChange={(event) => updateDraftFilter('placa', event.target.value)}
              placeholder="ABC1D23"
            />
          </label>

          <div className="vehicles-filter-actions">
            <button className="clear-filters-button" type="button" onClick={clearFilters}>
              Limpar
            </button>
            <button className="apply-filters-button" type="submit">
              Buscar
            </button>
          </div>
        </form>

        <div className="vehicles-list-controls">
          <div className="vehicles-sort-fields">
            <label>
              <span>Ordenar por</span>
              <select
                value={primarySort}
                onChange={(event) => {
                  const nextSort = event.target.value
                  setPrimarySort(nextSort)
                  if (sortField(nextSort) === sortField(secondarySort)) setSecondarySort('')
                  setPage(1)
                }}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Depois por</span>
              <select
                value={secondarySort}
                onChange={(event) => {
                  setSecondarySort(event.target.value)
                  setPage(1)
                }}
              >
                <option value="">Sem segunda ordenação</option>
                {sortOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={sortField(option.value) === sortField(primarySort)}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="vehicles-per-page">
            <span>Por página</span>
            <select
              value={perPage}
              onChange={(event) => {
                setPerPage(Number(event.target.value))
                setPage(1)
              }}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>

        {isLoading && <p className="vehicles-state" role="status">Carregando veículos...</p>}

        {isError && (
          <div className="vehicles-state vehicles-state-error" role="alert">
            <p>Não foi possível carregar os veículos.</p>
            <button type="button" onClick={() => refetch()}>Tentar novamente</button>
          </div>
        )}

        {data && !isError && (
          <>
            <p className="vehicles-results-summary" role="status" aria-live="polite">
              {isFetching
                ? 'Atualizando resultados...'
                : `${data.total} ${data.total === 1 ? 'veículo encontrado' : 'veículos encontrados'}.`}
            </p>

            <div className="vehicles-list" aria-busy={isFetching}>
              {data.data.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}

              {data.data.length === 0 && (
                <p className="vehicles-empty">Nenhum veículo encontrado para os filtros informados.</p>
              )}
            </div>

            {data.last_page > 1 && (
              <nav className="vehicles-pagination" aria-label="Paginação de veículos">
                <span>Exibindo {data.from ?? 0}–{data.to ?? 0} de {data.total}</span>
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
              </nav>
            )}
          </>
        )}
      </main>
    </>
  )
}

export default Home
