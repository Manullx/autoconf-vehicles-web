import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import CreateVehicle from './pages/CreateVehicle'
import VehicleDetails from './pages/VehicleDetails'
import Users from './pages/Users'
import CreateUser from './pages/CreateUser'
import FirstAccess from './pages/FirstAccess'
import { getStoredUser, isAuthenticated } from './services/api'

function ProtectedRoutes() {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (getStoredUser()?.first_login) return <Navigate to="/first-access" replace />

  return <Outlet />
}

function FirstAccessRoute() {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (!getStoredUser()?.first_login) return <Navigate to="/vehicles" replace />

  return <Outlet />
}

function AdminRoutes() {
  return getStoredUser()?.is_admin ? <Outlet /> : <Navigate to="/vehicles" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<FirstAccessRoute />}>
        <Route path="/first-access" element={<FirstAccess />} />
      </Route>
      <Route element={<ProtectedRoutes />}>
        <Route path="/vehicles" element={<Home />} />
        <Route path="/vehicles/create" element={<CreateVehicle />} />
        <Route path="/vehicles/:vehicleId/edit" element={<CreateVehicle />} />
        <Route path="/vehicles/:vehicleId" element={<VehicleDetails />} />
        <Route element={<AdminRoutes />}>
          <Route path="/users" element={<Users />} />
          <Route path="/users/create" element={<CreateUser />} />
        </Route>
      </Route>
      <Route
        path="*"
        element={(
          <Navigate
            to={isAuthenticated()
              ? getStoredUser()?.first_login ? '/first-access' : '/vehicles'
              : '/login'}
            replace
          />
        )}
      />
    </Routes>
  )
}

export default App
