// Stats en temps réel du sous-graphe — overlay coin haut-end
// Calculé entièrement côté client depuis les données filtrées
// Se met à jour automatiquement avec les filtres (type, racine)

import { useMemo } from 'react'
import { t } from '../../lib/i18n'
import type { GraphResponse, Surah } from '../../types/api'

interface GraphStatsProps {
  data: GraphResponse
  surahMap: Map<number, Surah>
}

/** Stats calculées du sous-graphe */
interface Stats {
  surahCount: number
  meccanCount: number
  medinanCount: number
  topRoot: string | null       // Racine la plus partagée (arabe)
  topRootCount: number         // Nombre de liens contenant cette racine
}

export default function GraphStats({ data, surahMap }: GraphStatsProps) {
  const stats = useMemo((): Stats => {
    // --- Sourates distinctes + ratio mecquois/médinois ---
    const surahNumbers = new Set(data.nodes.map((n) => n.surah_number))
    let meccanCount = 0
    let medinanCount = 0

    for (const num of surahNumbers) {
      const surah = surahMap.get(num)
      if (surah?.type === 'meccan') meccanCount++
      else if (surah?.type === 'medinan') medinanCount++
    }

    // --- Racine la plus partagée (présente dans le plus de liens) ---
    const rootCounts = new Map<string, number>()

    for (const link of data.links) {
      const roots = (link as { roots_ar: string[] }).roots_ar
      for (const root of roots) {
        rootCounts.set(root, (rootCounts.get(root) ?? 0) + 1)
      }
    }

    let topRoot: string | null = null
    let topRootCount = 0

    for (const [root, count] of rootCounts) {
      if (count > topRootCount) {
        topRoot = root
        topRootCount = count
      }
    }

    return {
      surahCount: surahNumbers.size,
      meccanCount,
      medinanCount,
      topRoot,
      topRootCount,
    }
  }, [data, surahMap])

  // Ratio pour la barre visuelle
  const total = stats.meccanCount + stats.medinanCount
  const meccanPercent = total > 0 ? Math.round((stats.meccanCount / total) * 100) : 0

  return (
    <div className="absolute top-3 end-3 z-10
                    bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm
                    rounded-lg border border-gray-200 dark:border-gray-800
                    px-3 py-2.5 min-w-[140px] space-y-2">

      {/* Nombre de sourates */}
      <div className="text-xs text-gray-700 dark:text-gray-300">
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {stats.surahCount}
        </span>
        {' '}{t('stats.surahs')}
      </div>

      {/* Barre ratio mecquois / médinois */}
      {total > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{stats.meccanCount} {t('stats.meccan')}</span>
            <span>{stats.medinanCount} {t('stats.medinan')}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-amber-500"
              style={{ width: `${meccanPercent}%` }}
            />
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${100 - meccanPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Racine la plus partagée */}
      {stats.topRoot && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {t('stats.topRoot')}
          <span className="block font-semibold text-gray-900 dark:text-gray-100 text-sm">
            {stats.topRoot}
          </span>
          <span className="text-gray-400 dark:text-gray-500">
            ({stats.topRootCount} {t('graph.links')})
          </span>
        </div>
      )}
    </div>
  )
}
