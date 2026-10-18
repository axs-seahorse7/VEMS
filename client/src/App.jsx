import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Login from './Pages/Authentication/Login/Login'
import Home from './Pages/Home/Home'
import VehicleDashboard from './Pages/User/Dashbaord/Dashboard'
import AdminApp from './Pages/Admin/Home/AdminApp'
import {AdminRoute, UserRoute} from './components/Protectedroute/ProtectedRoute'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminMonitorDashboard from './Pages/Admin/Pages/Monitoring-Dashboard/AdminMonitorDashboard'
import {UserProvider} from './Global/User-Context/UserContext'


const queryClient = new QueryClient()

function App() {
  return (
    <UserProvider>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={ <UserRoute><VehicleDashboard /></UserRoute> } />
          <Route path="/admin/monitoring" element={<AdminMonitorDashboard />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminApp /></AdminRoute>} />
        </Routes>
      </QueryClientProvider>
    </UserProvider>
  )
}

export default App