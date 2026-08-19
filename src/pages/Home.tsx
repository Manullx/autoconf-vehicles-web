import { useQuery } from '@tanstack/react-query'
import Header from '../components/Header'
import VehicleCard from '../components/Vehicles/VehicleCard'
import { getVehicles } from '../services/api'

function Home() {
  const { data } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
  })

  return (
    <>
      <Header />
      <main className="vehicles-page">
        {data?.data.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))}
      </main>
    </>
  )
}

export default Home
