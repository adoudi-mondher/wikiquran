// Composant racine — routing principal + layout global
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import GraphPage from './pages/GraphPage'
import DashboardPage from './pages/DashboardPage'

function App() {
  return (
    <AppLayout>
      <Routes>
        {/* Graphe interactif — exploration verset/racine */}
        <Route path="/graph" element={<GraphPage />} />

        {/* Dashboard racines — vue macro analytique */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Redirection par défaut vers le graphe */}
        <Route path="*" element={<Navigate to="/graph" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default App
