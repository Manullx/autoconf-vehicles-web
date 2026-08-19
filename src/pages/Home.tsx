import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import VehicleCard from '../components/Vehicles/VehicleCard'
import { getVehicles } from '../services/api'

function Home() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sortAscending, setSortAscending] = useState(true)
  const { data } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
  })

  const vehicles = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')

    return [...(data?.data ?? [])]
      .filter((vehicle) => {
        const searchableContent = [
          vehicle.marca,
          vehicle.modelo,
          vehicle.versao,
          vehicle.placa,
        ].join(' ').toLocaleLowerCase('pt-BR')

        return searchableContent.includes(term)
      })
      .sort((firstVehicle, secondVehicle) => (
        sortAscending
          ? firstVehicle.valor_venda - secondVehicle.valor_venda
          : secondVehicle.valor_venda - firstVehicle.valor_venda
      ))
  }, [data, search, sortAscending])

  return (
    <>
      <Header />
      <main className="vehicles-page">
        <div className="vehicles-toolbar">
          <label className="vehicles-search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <span className="sr-only">Buscar veículos</span>
            <input
              type="search"
              placeholder="Buscar por marca, modelo ou placa"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <button
            className="vehicles-sort"
            type="button"
            onClick={() => setSortAscending((currentOrder) => !currentOrder)}
            aria-label={`Ordenar por ${sortAscending ? 'maior preço' : 'menor preço'}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 6h14M3 12h10M3 18h6" />
              <path d={sortAscending ? 'm16 15 3 3 3-3M19 6v12' : 'm16 9 3-3 3 3M19 6v12'} />
            </svg>
            <span>Preço: {sortAscending ? 'menor' : 'maior'}</span>
          </button>

          <button
            className="create-vehicle-button"
            type="button"
            onClick={() => navigate('/vehicles/create')}
          >
            Criar Veículo
          </button>
        </div>

        <div className="vehicles-list">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}

          {data && vehicles.length === 0 && (
            <p className="vehicles-empty">Nenhum veículo encontrado.</p>
          )}
        </div>
      </main>
    </>
  )
}

export default Home
