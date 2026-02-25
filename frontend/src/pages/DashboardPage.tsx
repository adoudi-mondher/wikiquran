// Dashboard racines — vue macro analytique
// Top racines par fréquence + distribution (loi de Zipf)
// Onglets : toutes / mecquoises / médinoises
// Click sur une racine → navigation vers le graphe en mode racine

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useTopRoots, useMeccanMedinan } from '../hooks/useAnalytics'
import { useTheme } from '../lib/theme/ThemeProvider'
import { t } from '../lib/i18n'

type DashboardTab = 'all' | 'meccan' | 'medinan'

/** Entrée normalisée pour l'affichage (les deux endpoints ont des formats proches) */
interface DisplayRoot {
  buckwalter: string
  arabic: string
  ayahCount: number
}

/** Nombre de barres affichées dans le top racines */
const TOP_COUNT = 20

export default function DashboardPage() {
  const navigate = useNavigate()
  const { isDark } = useTheme()

  // --- Données ---
  const { data: topRootsData, isLoading: topLoading } = useTopRoots(100)
  const { data: periodData, isLoading: periodLoading } = useMeccanMedinan(TOP_COUNT)

  // --- Onglet actif ---
  const [activeTab, setActiveTab] = useState<DashboardTab>('all')

  // --- Normaliser les données selon l'onglet ---
  const displayRoots = useMemo((): DisplayRoot[] => {
    if (activeTab === 'all' && topRootsData) {
      return topRootsData.roots.slice(0, TOP_COUNT).map((r) => ({
        buckwalter: r.buckwalter,
        arabic: r.arabic,
        ayahCount: r.ayah_count,
      }))
    }
    if (activeTab === 'meccan' && periodData) {
      return periodData.meccan.map((r) => ({
        buckwalter: r.buckwalter,
        arabic: r.arabic,
        ayahCount: r.ayah_count,
      }))
    }
    if (activeTab === 'medinan' && periodData) {
      return periodData.medinan.map((r) => ({
        buckwalter: r.buckwalter,
        arabic: r.arabic,
        ayahCount: r.ayah_count,
      }))
    }
    return []
  }, [activeTab, topRootsData, periodData])

  // --- Valeur max pour les barres proportionnelles ---
  const maxCount = displayRoots.length > 0
    ? Math.max(...displayRoots.map((r) => r.ayahCount))
    : 1

  // --- Données distribution (toutes les racines, pour le graphique Zipf) ---
  const distributionData = useMemo(() => {
    if (!topRootsData) return []
    return topRootsData.roots.map((r, i) => ({
      rank: i + 1,
      ayahCount: r.ayah_count,
      arabic: r.arabic,
    }))
  }, [topRootsData])

  // --- Navigation vers le graphe en mode racine ---
  const handleRootClick = (buckwalter: string) => {
    navigate(`/graph?mode=root&root=${encodeURIComponent(buckwalter)}`)
  }

  // --- Chargement ---
  const isLoading = topLoading || periodLoading

  // --- Couleurs du chart selon le thème ---
  const chartColor = activeTab === 'meccan' ? '#f59e0b'   // amber
    : activeTab === 'medinan' ? '#10b981'                   // emerald
    : '#3b82f6'                                              // blue

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

      {/* --- En-tête --- */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {t('dashboard.title')}
        </h2>

        {/* Contexte statistique */}
        {periodData && (
          <div className="text-xs text-gray-500 dark:text-gray-400 space-x-3 rtl:space-x-reverse">
            <span>{periodData.meta.meccan_ayahs} {t('dashboard.meccanAyahs')}</span>
            <span>·</span>
            <span>{periodData.meta.medinan_ayahs} {t('dashboard.medinanAyahs')}</span>
          </div>
        )}
      </div>

      {/* --- Onglets --- */}
      <div className="flex items-center gap-1">
        {(['all', 'meccan', 'medinan'] as DashboardTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            {t(`dashboard.tab.${tab}`)}
          </button>
        ))}
      </div>

      {/* --- Loading --- */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* --- Top racines (barres horizontales) --- */}
      {!isLoading && displayRoots.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('dashboard.topRoots')}
          </h3>

          <div className="space-y-1.5">
            {displayRoots.map((root, index) => (
              <button
                key={root.buckwalter}
                onClick={() => handleRootClick(root.buckwalter)}
                className="w-full group flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50
                           rounded-lg px-3 py-1.5 transition-colors text-start cursor-pointer"
                title={t('dashboard.exploreRoot')}
              >
                {/* Rang */}
                <span className="w-6 text-xs text-gray-400 dark:text-gray-500 text-center shrink-0">
                  {index + 1}
                </span>

                {/* Racine arabe */}
                <span className="w-12 text-sm font-semibold text-gray-900 dark:text-gray-100 shrink-0">
                  {root.arabic}
                </span>

                {/* Barre proportionnelle */}
                <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-300"
                    style={{
                      width: `${(root.ayahCount / maxCount) * 100}%`,
                      backgroundColor: chartColor,
                      opacity: 0.7 + (0.3 * (1 - index / displayRoots.length)),
                    }}
                  />
                </div>

                {/* Nombre */}
                <span className="w-16 text-xs text-gray-500 dark:text-gray-400 text-end shrink-0">
                  {root.ayahCount} {t('dashboard.ayahs')}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* --- Distribution (courbe Zipf) --- */}
      {!isLoading && distributionData.length > 0 && activeTab === 'all' && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('dashboard.distribution')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('dashboard.distributionDesc')}
            </p>
          </div>

          <div className="h-64 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={distributionData}>
                <XAxis
                  dataKey="rank"
                  tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
                  axisLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
                  tickLine={false}
                  label={{
                    value: t('dashboard.rank'),
                    position: 'insideBottom',
                    offset: -5,
                    fontSize: 11,
                    fill: isDark ? '#9ca3af' : '#6b7280',
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
                  axisLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
                  tickLine={false}
                  label={{
                    value: t('dashboard.frequency'),
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 11,
                    fill: isDark ? '#9ca3af' : '#6b7280',
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '0.5rem',
                    fontSize: 12,
                    direction: 'rtl',
                  }}
                  formatter={(value: number, _name: string, props: { payload: { arabic: string } }) => [
                    `${value} ${t('dashboard.ayahs')}`,
                    props.payload.arabic,
                  ]}
                  labelFormatter={(rank: number) => `#${rank}`}
                />
                <Area
                  type="monotone"
                  dataKey="ayahCount"
                  stroke={chartColor}
                  fill={chartColor}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  )
}
