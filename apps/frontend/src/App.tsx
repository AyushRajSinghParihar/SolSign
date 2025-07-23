import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MainLayout } from './components/layouts/MainLayout'
import { HomePage } from './pages/HomePage'
import { VaultPage } from './pages/VaultPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* These are the protected child routes */}
          <Route index element={<HomePage />} />
          <Route path="vault" element={<VaultPage />} />
          {/* Other protected routes like /dashboard will go here */}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
