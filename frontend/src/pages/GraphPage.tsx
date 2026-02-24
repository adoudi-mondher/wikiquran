// Page graphe — contrôles + visualisation SHARES_ROOT + panneau détail
// Le header global est géré par AppLayout

import { useState, useCallback, useMemo } from 'react'
import SharesRootGraph from '../components/graph/SharesRootGraph'
import AyahPanel from '../components/graph/AyahPanel'
import GraphLegend from '../components/graph/GraphLegend'
import { useAyahNetwork } from '../hooks/useNetwork'
import { useSurahs } from '../hooks/useSurahs'
import { GRAPH_DEFAULTS, GRAPH_LIMITS } from '../lib/constants'
import { t } from '../lib/i18n'
import type { GraphResponse } from '../types/api'

/** Paramètres validés prêts pour l'API */
interface SearchParams {
  surah: number
  verse: number
  minRoots: number
  limit: number
}

/** Nœud sélectionné pour le panneau latéral */
interface SelectedNode {
  surah: number
  verse: number
}

/** Types de filtrage par révélation */
type SurahTypeFilter = 'all' | 'meccan' | 'medinan'

/** Limite max du slider voisins — cohérent avec la lisibilité du graphe */
const LIMIT_MAX = 100

export default function GraphPage() {
  // --- Données de référence (chargées une seule fois) ---
  const { surahs, surahMap, isLoading: surahsLoading } = useSurahs()

  // --- État des contrôles ---
  const [selectedSurah, setSelectedSurah] = useState(2)       // Al-Baqarah par défaut
  const [selectedAyah, setSelectedAyah] = useState(255)        // Ayat al-Kursi par défaut
  const [minRoots, setMinRoots] = useState(GRAPH_DEFAULTS.minRoots)
  const [limit, setLimit] = useState(GRAPH_DEFAULTS.limit)

  // --- Filtre mecquois/médinois (côté client) ---
  const [typeFilter, setTypeFilter] = useState<SurahTypeFilter>('all')

  // --- Paramètres validés (ce qu'on envoie à l'API) ---
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null)

  // --- Nœud sélectionné pour le panneau latéral (null = panneau fermé) ---
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null)

  // --- Hook API — ne fetch que si searchParams !== null ---
  const { data, isLoading: graphLoading, error: apiError } = useAyahNetwork({
    surah: searchParams?.surah ?? 0,
    verse: searchParams?.verse ?? 0,
    minRoots: searchParams?.minRoots,
    limit: searchParams?.limit,
  })

  // --- Filtre par racine (côté client, chaîné après filtre type) ---
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null)

  // --- Helper pour extraire l'ID d'un lien (ForceGraph2D mute source/target en objets) ---
  const getLinkId = useCallback((end: unknown): string =>
    typeof end === 'string' ? end : (end as { id: string }).id
  , [])

  // --- Étape 1 : filtrage par type (mecquois / médinois) ---
  // Le nœud central est toujours conservé, même s'il ne matche pas le filtre
  const typeFilteredData = useMemo((): GraphResponse | null => {
    if (!data) return null
    if (typeFilter === 'all') return data

    const filteredNodes = data.nodes.filter((node) => {
      if (node.id === data.center.id) return true
      const surah = surahMap.get(node.surah_number)
      return surah?.type === typeFilter
    })

    const nodeIds = new Set(filteredNodes.map((n) => n.id))

    const filteredLinks = data.links.filter(
      (link) => nodeIds.has(getLinkId(link.source)) && nodeIds.has(getLinkId(link.target))
    )

    return {
      center: data.center,
      nodes: filteredNodes,
      links: filteredLinks,
      meta: { ...data.meta },
    }
  }, [data, typeFilter, surahMap, getLinkId])

  // --- Racines disponibles (extraites des liens après filtre type) ---
  const availableRoots = useMemo((): string[] => {
    if (!typeFilteredData) return []

    const rootSet = new Set<string>()
    for (const link of typeFilteredData.links) {
      for (const root of (link as { roots_ar: string[] }).roots_ar) {
        rootSet.add(root)
      }
    }

    // Tri alphabétique arabe
    return Array.from(rootSet).sort((a, b) => a.localeCompare(b, 'ar'))
  }, [typeFilteredData])

  // --- Étape 2 : filtrage par racine ---
  const filteredData = useMemo((): GraphResponse | null => {
    if (!typeFilteredData) return null
    if (!selectedRoot) return typeFilteredData

    // Ne garder que les liens contenant la racine sélectionnée
    const filteredLinks = typeFilteredData.links.filter((link) =>
      (link as { roots_ar: string[] }).roots_ar.includes(selectedRoot)
    )

    // Ne garder que les nœuds connectés par ces liens + le centre
    const connectedIds = new Set<string>()
    connectedIds.add(typeFilteredData.center.id)
    for (const link of filteredLinks) {
      connectedIds.add(getLinkId(link.source))
      connectedIds.add(getLinkId(link.target))
    }

    const filteredNodes = typeFilteredData.nodes.filter(
      (node) => connectedIds.has(node.id)
    )

    return {
      center: typeFilteredData.center,
      nodes: filteredNodes,
      links: filteredLinks,
      meta: { ...typeFilteredData.meta },
    }
  }, [typeFilteredData, selectedRoot, getLinkId])

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

  // --- Lancer la recherche (bouton Explorer ou panneau) ---
  const handleExplore = useCallback(() => {
    setSearchParams({
      surah: selectedSurah,
      verse: selectedAyah,
      minRoots,
      limit,
    })
    // Reset les filtres client pour la nouvelle recherche
    setSelectedRoot(null)
  }, [selectedSurah, selectedAyah, minRoots, limit])

  // --- Click sur un nœud du graphe → ouvrir le panneau latéral ---
  const handleNodeClick = useCallback((nodeId: string) => {
    const [surahStr, ayahStr] = nodeId.split(':')
    const surah = parseInt(surahStr, 10)
    const verse = parseInt(ayahStr, 10)

    if (surah && verse) {
      // Met à jour les selects pour refléter le nœud cliqué
      setSelectedSurah(surah)
      setSelectedAyah(verse)
      // Ouvre le panneau latéral avec les infos du nœud
      setSelectedNode({ surah, verse })
    }
  }, [])

  // --- Explorer depuis le panneau → recentrer le graphe sur ce verset ---
  const handlePanelExplore = useCallback((surah: number, verse: number) => {
    setSelectedSurah(surah)
    setSelectedAyah(verse)
    setSearchParams({
      surah,
      verse,
      minRoots,
      limit,
    })
    // Reset les filtres client + fermer le panneau
    setSelectedRoot(null)
    setSelectedNode(null)
  }, [minRoots, limit])

  // --- Fermer le panneau latéral ---
  const handlePanelClose = useCallback(() => {
    setSelectedNode(null)
  }, [])

  // --- État de chargement combiné ---
  const isLoading = graphLoading

  return (
    <>
      {/* --- Barre de contrôles --- */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex flex-wrap items-end gap-6">

          {/* Select sourate */}
          <div className="flex flex-col gap-1">
            <label htmlFor="surah-select" className="text-xs text-gray-600 dark:text-gray-400">
              {t('controls.surah')}
            </label>
            <select
              id="surah-select"
              value={selectedSurah}
              onChange={(e) => handleSurahChange(e.target.value)}
              disabled={surahsLoading}
              className="px-3 py-2 bg-white dark:bg-gray-900
                         border border-gray-300 dark:border-gray-700 rounded-lg
                         text-gray-900 dark:text-gray-100 text-sm
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
            <label htmlFor="ayah-select" className="text-xs text-gray-600 dark:text-gray-400">
              {t('controls.ayah')}
            </label>
            <select
              id="ayah-select"
              value={selectedAyah}
              onChange={(e) => handleAyahChange(e.target.value)}
              disabled={ayahCount === 0}
              className="w-24 px-3 py-2 bg-white dark:bg-gray-900
                         border border-gray-300 dark:border-gray-700 rounded-lg
                         text-gray-900 dark:text-gray-100 text-sm
                         focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {Array.from({ length: ayahCount }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Slider min_roots */}
          <div className="flex flex-col gap-1">
            <label htmlFor="min-roots" className="text-xs text-gray-600 dark:text-gray-400">
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
            <label htmlFor="limit" className="text-xs text-gray-600 dark:text-gray-400">
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

          {/* Filtre mecquois / médinois — visible uniquement quand le graphe est affiché */}
          {filteredData && (
            <div className="flex items-center gap-1">
              {(['all', 'meccan', 'medinan'] as SurahTypeFilter[]).map((type) => (
                <button
                  key={type}
                  onClick={() => { setTypeFilter(type); setSelectedRoot(null) }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                    ${typeFilter === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  {t(`filter.${type}`)}
                </button>
              ))}
            </div>
          )}

          {/* Filtre par racine — visible quand il y a des racines disponibles */}
          {availableRoots.length > 0 && (
            <div className="flex flex-col gap-1">
              <label htmlFor="root-filter" className="text-xs text-gray-600 dark:text-gray-400">
                {t('filter.root')}
              </label>
              <select
                id="root-filter"
                value={selectedRoot ?? ''}
                onChange={(e) => setSelectedRoot(e.target.value || null)}
                className="px-3 py-2 bg-white dark:bg-gray-900
                           border border-gray-300 dark:border-gray-700 rounded-lg
                           text-gray-900 dark:text-gray-100 text-sm
                           focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">{t('filter.allRoots')} ({availableRoots.length})</option>
                {availableRoots.map((root) => (
                  <option key={root} value={root}>{root}</option>
                ))}
              </select>
            </div>
          )}

          {/* Métadonnées du résultat */}
          {filteredData && (
            <span className="text-xs text-gray-500 self-center">
              {filteredData.nodes.length} {t('graph.nodes')} · {filteredData.links.length} {t('graph.links')}
              {data && data.meta.total_links > filteredData.links.length && (
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
          <div className="absolute inset-0 flex items-center justify-center
                          text-gray-400 dark:text-gray-600">
            <div className="text-center">
              <p className="text-lg mb-2">{t('graph.idle')}</p>
              <p className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {t('graph.idleExample')}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* État Loading */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('graph.exploring')}
              </p>
            </div>
          </div>
        )}

        {/* État Erreur API */}
        {apiError && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md px-6">
              <p className="text-red-600 dark:text-red-400 mb-2">{t('common.error')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {apiError instanceof Error ? apiError.message : t('common.unknownError')}
              </p>
            </div>
          </div>
        )}

        {/* État Success — le graphe (reçoit les données filtrées) */}
        {filteredData && !isLoading && (
          <>
            <SharesRootGraph
              data={filteredData}
              surahMap={surahMap}
              onNodeClick={handleNodeClick}
            />
            <GraphLegend
              nodes={filteredData.nodes}
              surahMap={surahMap}
              panelOpen={!!selectedNode}
            />
          </>
        )}

        {/* Panneau latéral — détail du verset cliqué */}
        {selectedNode && (
          <AyahPanel
            surah={selectedNode.surah}
            verse={selectedNode.verse}
            onExplore={handlePanelExplore}
            onClose={handlePanelClose}
          />
        )}
      </main>
    </>
  )
}
