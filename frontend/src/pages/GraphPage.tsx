// Page principale du graphe — chef d'orchestre
// Connecte : contrôles utilisateur → hook API → composant graphe

import { useState, useCallback } from 'react'
import SharesRootGraph from '../components/graph/SharesRootGraph'
import { useAyahNetwork } from '../hooks/useNetwork'
import { useSurahs } from '../hooks/useSurahs'
import { GRAPH_DEFAULTS, GRAPH_LIMITS } from '../lib/constants'
import { t, isRTL } from '../lib/i18n'

/** Paramètres validés prêts pour l'API */
interface SearchParams {
  surah: number
  verse: number
  minRoots: number
  limit: number
}

/** Limite max du slider voisins — cohérent avec la lisibilité du graphe */
const LIMIT_MAX = 100

export default function GraphPage() {
  // --- Direction d'écriture (RTL pour l'arabe) ---
  const dir = isRTL() ? 'rtl' : 'ltr'

  // --- Données de référence (chargées une seule fois) ---
  const { surahs, surahMap, isLoading: surahsLoading } = useSurahs()

  // --- État des contrôles ---
  const [selectedSurah, setSelectedSurah] = useState(2)       // Al-Baqarah par défaut
  const [selectedAyah, setSelectedAyah] = useState(255)        // Ayat al-Kursi par défaut
  const [minRoots, setMinRoots] = useState(GRAPH_DEFAULTS.minRoots)
  const [limit, setLimit] = useState(GRAPH_DEFAULTS.limit)

  // --- Paramètres validés (ce qu'on envoie à l'API) ---
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null)

  // --- Hook API — ne fetch que si searchParams !== null ---
  const { data, isLoading: graphLoading, error: apiError } = useAyahNetwork({
    surah: searchParams?.surah ?? 0,
    verse: searchParams?.verse ?? 0,
    minRoots: searchParams?.minRoots,
    limit: searchParams?.limit,
  })

  // --- Nombre de versets de la sourate sélectionnée ---
  const ayahCount = surahMap.get(selectedSurah)?.ayas_count ?? 0

  // --- Changement de sourate → reset ayah à 1 ---
  const handleSurahChange = useCallback((value: string) => {
    const num = parseInt(value, 10)
    setSelectedSurah(num)
    setSelectedAyah(1)  // Reset — la nouvelle sourate peut avoir moins de versets
  }, [])

  // --- Changement d'ayah ---
  const handleAyahChange = useCallback((value: string) => {
    setSelectedAyah(parseInt(value, 10))
  }, [])

  // --- Lancer la recherche ---
  const handleExplore = useCallback(() => {
    setSearchParams({
      surah: selectedSurah,
      verse: selectedAyah,
      minRoots,
      limit,
    })
  }, [selectedSurah, selectedAyah, minRoots, limit])

  // --- Click sur un nœud du graphe → naviguer ---
  const handleNodeClick = useCallback((nodeId: string) => {
    const [surahStr, ayahStr] = nodeId.split(':')
    const surah = parseInt(surahStr, 10)
    const ayah = parseInt(ayahStr, 10)

    if (surah && ayah) {
      setSelectedSurah(surah)
      setSelectedAyah(ayah)
      setSearchParams({
        surah,
        verse: ayah,
        minRoots,
        limit,
      })
    }
  }, [minRoots, limit])

  // --- État de chargement combiné ---
  const isLoading = graphLoading

  return (
    <div dir={dir} className="h-screen flex flex-col bg-gray-950">
      {/* --- Header --- */}
      <header className="px-6 py-4 border-b border-gray-800 shrink-0">
        <h1 className="text-xl font-semibold text-gray-100">
          {t('app.title')}
        </h1>
      </header>

      {/* --- Barre de contrôles --- */}
      <div className="px-6 py-4 border-b border-gray-800 shrink-0">
        <div className="flex flex-wrap items-end gap-6">

          {/* Select sourate */}
          <div className="flex flex-col gap-1">
            <label htmlFor="surah-select" className="text-xs text-gray-400">
              {t('controls.surah')}
            </label>
            <select
              id="surah-select"
              value={selectedSurah}
              onChange={(e) => handleSurahChange(e.target.value)}
              disabled={surahsLoading}
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg
                         text-gray-100 text-sm
                         focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {surahs.map((s) => (
                <option key={s.number} value={s.number}>
                  {s.number}. {s.name_arabic}
                </option>
              ))}
            </select>
          </div>

          {/* Select ayah */}
          <div className="flex flex-col gap-1">
            <label htmlFor="ayah-select" className="text-xs text-gray-400">
              {t('controls.ayah')}
            </label>
            <select
              id="ayah-select"
              value={selectedAyah}
              onChange={(e) => handleAyahChange(e.target.value)}
              disabled={ayahCount === 0}
              className="w-24 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg
                         text-gray-100 text-sm
                         focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {Array.from({ length: ayahCount }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Slider min_roots */}
          <div className="flex flex-col gap-1">
            <label htmlFor="min-roots" className="text-xs text-gray-400">
              {t('controls.minRoots')} : {minRoots}
            </label>
            <input
              id="min-roots"
              type="range"
              min={GRAPH_LIMITS.minRoots.min}
              max={GRAPH_LIMITS.minRoots.max}
              value={minRoots}
              onChange={(e) => setMinRoots(parseInt(e.target.value, 10))}
              className="w-32 accent-blue-500"
            />
          </div>

          {/* Slider limit */}
          <div className="flex flex-col gap-1">
            <label htmlFor="limit" className="text-xs text-gray-400">
              {t('controls.maxNeighbors')} : {limit}
            </label>
            <input
              id="limit"
              type="range"
              min={1}
              max={LIMIT_MAX}
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              className="w-40 accent-blue-500"
            />
          </div>

          {/* Bouton Explorer */}
          <button
            onClick={handleExplore}
            disabled={isLoading || surahsLoading}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg
                       hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {isLoading ? t('common.loading') : t('controls.explore')}
          </button>

          {/* Métadonnées du résultat */}
          {data && (
            <span className="text-xs text-gray-500 self-center">
              {data.nodes.length} {t('graph.nodes')} · {data.links.length} {t('graph.links')}
              {data.meta.total_links > data.links.length && (
                <> · {data.meta.total_links} {t('graph.totalFiltered')}</>
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
              <p className="text-lg mb-2">{t('graph.idle')}</p>
              <p className="text-sm">
                <span className="text-gray-400">{t('graph.idleExample')}</span>
              </p>
            </div>
          </div>
        )}

        {/* État Loading */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400">{t('graph.exploring')}</p>
            </div>
          </div>
        )}

        {/* État Erreur API */}
        {apiError && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md px-6">
              <p className="text-red-400 mb-2">{t('common.error')}</p>
              <p className="text-sm text-gray-400">
                {apiError instanceof Error ? apiError.message : t('common.unknownError')}
              </p>
            </div>
          </div>
        )}

        {/* État Success — le graphe */}
        {data && !isLoading && (
          <SharesRootGraph
            data={data}
            surahMap={surahMap}
            onNodeClick={handleNodeClick}
          />
        )}
      </main>
    </div>
  )
}
