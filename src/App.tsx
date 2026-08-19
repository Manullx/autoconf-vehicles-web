import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import CreateVehicle from './pages/CreateVehicle'
import VehicleDetails from './pages/VehicleDetails'
import { isAuthenticated } from './services/api'

function ProtectedRoutes() {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoutes />}>
        <Route path="/vehicles" element={<Home />} />
        <Route path="/vehicles/create" element={<CreateVehicle />} />
        <Route path="/vehicles/:vehicleId" element={<VehicleDetails />} />
      </Route>
      <Route
        path="*"
        element={<Navigate to={isAuthenticated() ? '/vehicles' : '/login'} replace />}
      />
    </Routes>
  )
}

export default App
