// Page graphe — deux modes d'exploration (verset / racine)
// Mode verset : sous-graphe SHARES_ROOT autour d'un verset
// Mode racine : tous les versets partageant une racine donnée
// Le header global est géré par AppLayout

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import SharesRootGraph from '../components/graph/SharesRootGraph'
import AyahPanel from '../components/graph/AyahPanel'
import GraphLegend from '../components/graph/GraphLegend'
import GraphStats from '../components/graph/GraphStats'
import { useAyahNetwork, useRootNetwork } from '../hooks/useNetwork'
import { useSurahs } from '../hooks/useSurahs'
import { useRoots } from '../hooks/useRoots'
import { t } from '../lib/i18n'
import type { GraphResponse } from '../types/api'

// --- Types locaux ---

type ExploreMode = 'verse' | 'root'

interface VerseSearchParams {
  surah: number
  verse: number
  minRoots: number
  limit: number
}

interface SelectedNode {
  surah: number
  verse: number
}

type SurahTypeFilter = 'all' | 'meccan' | 'medinan'

const LIMIT_MAX = 100

export default function GraphPage() {
  // --- Lecture des params URL (deep linking depuis le dashboard) ---
  const [urlParams, setUrlParams] = useSearchParams()

  // --- Données de référence ---
  const { surahs, surahMap, isLoading: surahsLoading } = useSurahs()
  const { roots, isLoading: rootsLoading } = useRoots()

  // --- Mode d'exploration ---
  const [mode, setMode] = useState<ExploreMode>('verse')

  // --- Contrôles mode verset ---
  const [selectedSurah, setSelectedSurah] = useState(2)
  const [selectedAyah, setSelectedAyah] = useState(255)
  const [minRoots, setMinRoots] = useState(2)
  const [limit, setLimit] = useState(10)
  const [verseSearchParams, setVerseSearchParams] = useState<VerseSearchParams | null>(null)

  // --- Contrôles mode racine ---
  const [selectedRootBw, setSelectedRootBw] = useState('')   // Buckwalter pour l'API
  const [activeRootBw, setActiveRootBw] = useState('')        // Buckwalter validé (après click Explorer)

  // --- Deep linking : lire les params URL au montage ---
  useEffect(() => {
    const urlMode = urlParams.get('mode')
    const urlRoot = urlParams.get('root')

    if (urlMode === 'root' && urlRoot) {
      setMode('root')
      setSelectedRootBw(urlRoot)
      setActiveRootBw(urlRoot)
      // Nettoyer l'URL après lecture
      setUrlParams({}, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Filtres client (partagés entre les deux modes) ---
  const [typeFilter, setTypeFilter] = useState<SurahTypeFilter>('all')
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null)

  // --- Panneau latéral ---
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null)

  // --- Hook API mode verset ---
  const { data: verseData, isLoading: verseLoading, error: verseError } = useAyahNetwork({
    surah: verseSearchParams?.surah ?? 0,
    verse: verseSearchParams?.verse ?? 0,
    minRoots: verseSearchParams?.minRoots,
    limit: verseSearchParams?.limit,
  })

  // --- Hook API mode racine (tri par connectivité → hubs sémantiques) ---
  const { data: rootData, isLoading: rootLoading, error: rootError } = useRootNetwork({
    buckwalter: activeRootBw,
    sort: 'connected',
  })

  // --- Normalisation : convertir les deux formats en GraphResponse ---
  const rawData = useMemo((): GraphResponse | null => {
    if (mode === 'verse') return verseData ?? null

    if (!rootData || rootData.nodes.length === 0) return null

    // Le réseau racine n'a pas de center — on prend le premier nœud
    return {
      center: rootData.nodes[0],
      nodes: rootData.nodes,
      links: rootData.links,
      meta: {
        min_roots: rootData.meta.min_roots,
        limit: rootData.meta.limit,
        total_links: rootData.meta.total_links,
      },
    }
  }, [mode, verseData, rootData])

  // --- État de chargement et erreur selon le mode ---
  const isLoading = mode === 'verse' ? verseLoading : rootLoading
  const apiError = mode === 'verse' ? verseError : rootError
  const hasSearched = mode === 'verse' ? verseSearchParams !== null : activeRootBw.length > 0

  // --- Helper pour extraire l'ID d'un lien (ForceGraph2D mute source/target en objets) ---
  const getLinkId = useCallback((end: unknown): string =>
    typeof end === 'string' ? end : (end as { id: string }).id
  , [])

  // --- Étape 1 : filtrage par type (mecquois / médinois) ---
  const typeFilteredData = useMemo((): GraphResponse | null => {
    if (!rawData) return null
    if (typeFilter === 'all') return rawData

    const filteredNodes = rawData.nodes.filter((node) => {
      if (node.id === rawData.center.id) return true
      const surah = surahMap.get(node.surah_number)
      return surah?.type === typeFilter
    })

    const nodeIds = new Set(filteredNodes.map((n) => n.id))

    const filteredLinks = rawData.links.filter(
      (link) => nodeIds.has(getLinkId(link.source)) && nodeIds.has(getLinkId(link.target))
    )

    return {
      center: rawData.center,
      nodes: filteredNodes,
      links: filteredLinks,
      meta: { ...rawData.meta },
    }
  }, [rawData, typeFilter, surahMap, getLinkId])

  // --- Racines disponibles (extraites des liens après filtre type) ---
  const availableRoots = useMemo((): string[] => {
    if (!typeFilteredData) return []

    const rootSet = new Set<string>()
    for (const link of typeFilteredData.links) {
      for (const root of (link as { roots_ar: string[] }).roots_ar) {
        rootSet.add(root)
      }
    }

    return Array.from(rootSet).sort((a, b) => a.localeCompare(b, 'ar'))
  }, [typeFilteredData])

  // --- Étape 2 : filtrage par racine ---
  const filteredData = useMemo((): GraphResponse | null => {
    if (!typeFilteredData) return null
    if (!selectedRoot) return typeFilteredData

    const filteredLinks = typeFilteredData.links.filter((link) =>
      (link as { roots_ar: string[] }).roots_ar.includes(selectedRoot)
    )

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

  // --- Handlers ---

  const handleModeChange = useCallback((newMode: ExploreMode) => {
    setMode(newMode)
    setSelectedNode(null)
    setTypeFilter('all')
    setSelectedRoot(null)
  }, [])

  const handleSurahChange = useCallback((value: string) => {
    const num = parseInt(value, 10)
    setSelectedSurah(num)
    setSelectedAyah(1)
  }, [])

  const handleAyahChange = useCallback((value: string) => {
    setSelectedAyah(parseInt(value, 10))
  }, [])

  const handleExplore = useCallback(() => {
    if (mode === 'verse') {
      setVerseSearchParams({
        surah: selectedSurah,
        verse: selectedAyah,
        minRoots,
        limit,
      })
    } else {
      setActiveRootBw(selectedRootBw)
    }
    // Reset les filtres client
    setTypeFilter('all')
    setSelectedRoot(null)
    setSelectedNode(null)
  }, [mode, selectedSurah, selectedAyah, minRoots, limit, selectedRootBw])

  const handleNodeClick = useCallback((nodeId: string) => {
    const [surahStr, ayahStr] = nodeId.split(':')
    const surah = parseInt(surahStr, 10)
    const verse = parseInt(ayahStr, 10)

    if (surah && verse) {
      setSelectedSurah(surah)
      setSelectedAyah(verse)
      setSelectedNode({ surah, verse })
    }
  }, [])

  const handlePanelExplore = useCallback((surah: number, verse: number) => {
    // Depuis le panneau, on explore toujours en mode verset
    setMode('verse')
    setSelectedSurah(surah)
    setSelectedAyah(verse)
    setVerseSearchParams({
      surah,
      verse,
      minRoots,
      limit,
    })
    setTypeFilter('all')
    setSelectedRoot(null)
    setSelectedNode(null)
  }, [minRoots, limit])

  const handlePanelClose = useCallback(() => {
    setSelectedNode(null)
  }, [])

  // --- Bouton Explorer désactivé si rien de sélectionné ---
  const exploreDisabled = isLoading || surahsLoading
    || (mode === 'root' && selectedRootBw === '')

  return (
    <>
      {/* --- Barre de contrôles --- */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex flex-wrap items-end gap-6">

          {/* Toggle mode */}
          <div className="flex items-center gap-1">
            {(['verse', 'root'] as ExploreMode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${mode === m
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                {t(`mode.${m}`)}
              </button>
            ))}
          </div>

          {/* --- Contrôles mode verset --- */}
          {mode === 'verse' && (
            <>
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

              <div className="flex flex-col gap-1">
                <label htmlFor="min-roots" className="text-xs text-gray-600 dark:text-gray-400">
                  {t('controls.minRoots')} : {minRoots}
                </label>
                <input
                  id="min-roots"
                  type="range"
                  value={minRoots}
                  onChange={(e) => setMinRoots(parseInt(e.target.value, 10))}
                  className="w-32 accent-blue-500"
                />
              </div>

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
            </>
          )}

          {/* --- Contrôles mode racine --- */}
          {mode === 'root' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="root-select" className="text-xs text-gray-600 dark:text-gray-400">
                {t('controls.rootSelect')}
              </label>
              <select
                id="root-select"
                value={selectedRootBw}
                onChange={(e) => setSelectedRootBw(e.target.value)}
                disabled={rootsLoading}
                className="px-3 py-2 bg-white dark:bg-gray-900
                           border border-gray-300 dark:border-gray-700 rounded-lg
                           text-gray-900 dark:text-gray-100 text-sm
                           focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">{rootsLoading ? t('common.loading') : t('controls.rootSearch')}</option>
                {roots.map((r) => (
                  <option key={r.buckwalter} value={r.buckwalter}>
                    {r.arabic} — {r.ayah_count} {t('common.ayah')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Bouton Explorer (partagé) */}
          <button
            onClick={handleExplore}
            disabled={exploreDisabled}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg
                       hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {isLoading ? t('common.loading') : t('controls.explore')}
          </button>

          {/* Filtre mecquois / médinois */}
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

          {/* Filtre par racine (dans les liens) */}
          {availableRoots.length > 0 && (
            <div className="flex flex-col gap-1">
              <label htmlFor="root-filter" className="text-xs text-gray-600 dark:text-gray-400">
                {mode === 'root' ? t('filter.secondaryRoot') : t('filter.root')}
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
              {rawData && rawData.meta.total_links > filteredData.links.length && (
                <> · {rawData.meta.total_links} {t('graph.totalFiltered')}</>
              )}
            </span>
          )}
        </div>
      </div>

      {/* --- Zone principale --- */}
      <main className="flex-1 relative">
        {/* État Idle */}
        {!hasSearched && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center
                          text-gray-400 dark:text-gray-600">
            <div className="text-center">
              <p className="text-lg mb-2">
                {mode === 'verse' ? t('graph.idle') : t('graph.idleRoot')}
              </p>
              {mode === 'verse' && (
                <p className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('graph.idleExample')}
                  </span>
                </p>
              )}
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

        {/* État Success — le graphe */}
        {filteredData && !isLoading && (
          <>
            <SharesRootGraph
              data={filteredData}
              surahMap={surahMap}
              onNodeClick={handleNodeClick}
            />

            {/* Bandeau racine active — mode racine uniquement, au-dessus de la légende */}
            {mode === 'root' && rootData?.root && (
              <div className="absolute bottom-14 end-3 z-10
                              bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm
                              rounded-lg border border-gray-200 dark:border-gray-800
                              px-4 py-2 text-center">
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {rootData.root.arabic}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mx-2">
                  {rootData.root.total_ayahs} {t('rootBanner.ayahs')} · {rootData.root.occurrences_count} {t('rootBanner.occurrences')}
                </span>
              </div>
            )}

            <GraphStats
              data={filteredData}
              surahMap={surahMap}
            />
            <GraphLegend
              nodes={filteredData.nodes}
              surahMap={surahMap}
            />
          </>
        )}

        {/* Panneau latéral */}
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
