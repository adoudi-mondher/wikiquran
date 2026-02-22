// Page principale du graphe — chef d'orchestre
// Connecte : contrôles utilisateur → hook API → composant graphe

import { useState, useCallback } from 'react'
import SharesRootGraph from '../components/graph/SharesRootGraph'
import { useAyahNetwork } from '../hooks/useNetwork'
import { parseAyahId } from '../lib/utils'
import { GRAPH_DEFAULTS, GRAPH_LIMITS } from '../lib/constants'

/** Paramètres validés prêts pour l'API */
interface SearchParams {
  surah: number
  verse: number
  minRoots: number
  limit: number
}

export default function GraphPage() {
  // --- État des contrôles (ce que l'utilisateur manipule) ---
  const [ayahInput, setAyahInput] = useState('2:255')
  const [minRoots, setMinRoots] = useState(GRAPH_DEFAULTS.minRoots)
  const [limit, setLimit] = useState(GRAPH_DEFAULTS.limit)

  // --- Paramètres validés (ce qu'on envoie à l'API) ---
  // null = pas encore de recherche (état Idle)
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null)

  // --- Message d'erreur de validation locale ---
  const [inputError, setInputError] = useState<string | null>(null)

  // --- Hook API — ne fetch que si searchParams !== null ---
  const { data, isLoading, error: apiError } = useAyahNetwork({
    surah: searchParams?.surah ?? 0,
    verse: searchParams?.verse ?? 0,
    minRoots: searchParams?.minRoots,
    limit: searchParams?.limit,
  })

  // --- Lancer la recherche (bouton "Explorer") ---
  const handleExplore = useCallback(() => {
    // Valider le format "surah:verse"
    const parsed = parseAyahId(ayahInput.trim())

    if (!parsed) {
      setInputError('Format attendu : surah:verset (ex: 2:255)')
      return
    }

    if (parsed.surah < 1 || parsed.surah > 114) {
      setInputError('Sourate entre 1 et 114')
      return
    }

    if (parsed.verse < 1) {
      setInputError('Numéro de verset invalide')
      return
    }

    // Validation OK — lancer la requête
    setInputError(null)
    setSearchParams({
      surah: parsed.surah,
      verse: parsed.verse,
      minRoots,
      limit,
    })
  }, [ayahInput, minRoots, limit])

  // --- Entrée clavier — Explorer avec Entrée ---
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleExplore()
  }, [handleExplore])

  // --- Click sur un nœud du graphe ---
  const handleNodeClick = useCallback((nodeId: string) => {
    // Charger le graphe du verset cliqué
    setAyahInput(nodeId)
    const parsed = parseAyahId(nodeId)
    if (parsed) {
      setInputError(null)
      setSearchParams({
        surah: parsed.surah,
        verse: parsed.verse,
        minRoots,
        limit,
      })
    }
  }, [minRoots, limit])

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* --- Header --- */}
      <header className="px-6 py-4 border-b border-gray-800 shrink-0">
        <h1 className="text-xl font-semibold text-gray-100">
          🕌 WikiQuran — Knowledge Graph
        </h1>
      </header>

      {/* --- Barre de contrôles --- */}
      <div className="px-6 py-4 border-b border-gray-800 shrink-0">
        <div className="flex flex-wrap items-end gap-6">

          {/* Input verset */}
          <div className="flex flex-col gap-1">
            <label htmlFor="ayah-input" className="text-xs text-gray-400">
              Verset (surah:ayah)
            </label>
            <input
              id="ayah-input"
              type="text"
              value={ayahInput}
              onChange={(e) => setAyahInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="2:255"
              className="w-32 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg
                         text-gray-100 text-sm placeholder-gray-600
                         focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {inputError && (
              <span className="text-xs text-red-400">{inputError}</span>
            )}
          </div>

          {/* Slider min_roots */}
          <div className="flex flex-col gap-1">
            <label htmlFor="min-roots" className="text-xs text-gray-400">
              Racines min : {minRoots}
            </label>
            <input
              id="min-roots"
              type="range"
              min={GRAPH_LIMITS.minRoots.min}
              max={GRAPH_LIMITS.minRoots.max}
              value={minRoots}
              onChange={(e) => setMinRoots(Number(e.target.value))}
              className="w-32 accent-blue-500"
            />
          </div>

          {/* Slider limit */}
          <div className="flex flex-col gap-1">
            <label htmlFor="limit" className="text-xs text-gray-400">
              Voisins max : {limit}
            </label>
            <input
              id="limit"
              type="range"
              min={1}
              max={200}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-40 accent-blue-500"
            />
          </div>

          {/* Bouton Explorer */}
          <button
            onClick={handleExplore}
            disabled={isLoading}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg
                       hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {isLoading ? 'Chargement…' : 'Explorer'}
          </button>

          {/* Métadonnées du résultat */}
          {data && (
            <span className="text-xs text-gray-500 self-center">
              {data.nodes.length} nœuds · {data.links.length} liens
              {data.meta.total_links > data.links.length && (
                <> · {data.meta.total_links} total (filtré)</>
              )}
            </span>
          )}
        </div>
      </div>

      {/* --- Zone principale --- */}
      <main className="flex-1 relative">
        {/* État Idle — pas encore de recherche */}
        {!searchParams && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <p className="text-lg mb-2">Entrez un verset pour explorer ses connexions</p>
              <p className="text-sm">Exemple : <span className="text-gray-400">2:255</span> (Ayat al-Kursi)</p>
            </div>
          </div>
        )}

        {/* État Loading */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400">Exploration du graphe…</p>
            </div>
          </div>
        )}

        {/* État Erreur API */}
        {apiError && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md px-6">
              <p className="text-red-400 mb-2">Erreur</p>
              <p className="text-sm text-gray-400">
                {apiError instanceof Error ? apiError.message : 'Erreur inconnue'}
              </p>
            </div>
          </div>
        )}

        {/* État Success — le graphe */}
        {data && !isLoading && (
          <SharesRootGraph
            data={data}
            onNodeClick={handleNodeClick}
          />
        )}
      </main>
    </div>
  )
}
