// Page principale du graphe — contrôles de filtrage + visualisation
// TODO Step 7 : implémenter les contrôles et connecter au hook useAyahNetwork

import SharesRootGraph from '../components/graph/SharesRootGraph'

export default function GraphPage() {
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-800">
        <h1 className="text-xl font-semibold">
          🕌 WikiQuran — Knowledge Graph
        </h1>
      </header>

      {/* TODO : barre de contrôles (input verset, sliders min_roots/limit) */}
      <div className="px-6 py-3 border-b border-gray-800 text-sm text-gray-400">
        Contrôles — Step 7
      </div>

      {/* Zone graphe — prend tout l'espace restant */}
      <main className="flex-1 relative">
        <SharesRootGraph />
      </main>
    </div>
  )
}
