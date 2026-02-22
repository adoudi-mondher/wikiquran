// Composant racine — routing principal
import { Routes, Route, Navigate } from 'react-router-dom'
import GraphPage from './pages/GraphPage'

function App() {
  return (
    <Routes>
      {/* MVP — le graphe est la page d'accueil */}
      <Route path="/graph" element={<GraphPage />} />

      {/* Redirection par défaut vers le graphe */}
      <Route path="*" element={<Navigate to="/graph" replace />} />

      {/* TODO Phase 4+ : ajouter les routes textuelles
        <Route path="/surahs" element={<SurahListPage />} />
        <Route path="/surah/:number" element={<SurahDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
      */}
    </Routes>
  )
}

export default App
