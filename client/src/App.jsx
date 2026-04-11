import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Login from './Pages/Authentication/Login/Login'
import Home from './Pages/Home/Home'
import VehicleDashboard from './Pages/User/Dashbaord/Dashboard'
import AdminApp from './Pages/Admin/Home/AdminApp'
import {AdminRoute, UserRoute} from './components/Protectedroute/ProtectedRoute'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={ <UserRoute><VehicleDashboard /></UserRoute> } />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoute><AdminApp /></AdminRoute>} />
      </Routes>
    </QueryClientProvider>
  )
}

export default App