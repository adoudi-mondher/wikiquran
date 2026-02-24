// Légende dynamique du graphe — sourates présentes avec pastille de couleur
// Se met à jour automatiquement quand les données filtrées changent
// Responsabilité unique : affichage de la légende, pas de logique métier

import { useMemo } from 'react'
import { surahColor } from '../../lib/constants'
import type { GraphNode, Surah } from '../../types/api'

interface GraphLegendProps {
  nodes: GraphNode[]
  surahMap: Map<number, Surah>
}

/** Entrée de la légende : sourate + nombre de nœuds */
interface LegendEntry {
  surahNumber: number
  nameArabic: string
  count: number
  color: string
}

export default function GraphLegend({ nodes, surahMap }: GraphLegendProps) {
  // --- Calculer les entrées de la légende ---
  // GroupBy surah_number → compter les nœuds → trier par count décroissant
  const entries = useMemo((): LegendEntry[] => {
    const counts = new Map<number, number>()

    for (const node of nodes) {
      counts.set(node.surah_number, (counts.get(node.surah_number) ?? 0) + 1)
    }

    return Array.from(counts.entries())
      .map(([surahNumber, count]) => ({
        surahNumber,
        nameArabic: surahMap.get(surahNumber)?.name_arabic ?? `${surahNumber}`,
        count,
        color: surahColor(surahNumber),
      }))
      .sort((a, b) => b.count - a.count)  // Les plus représentées en premier
  }, [nodes, surahMap])

  // Pas de légende si aucun nœud
  if (entries.length === 0) return null

  return (
    <div className="absolute bottom-3 start-3 end-3 z-10
                    bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm
                    rounded-lg border border-gray-200 dark:border-gray-800
                    px-3 py-2 overflow-x-auto">
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {entries.map((entry) => (
          <span
            key={entry.surahNumber}
            className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300
                       whitespace-nowrap"
          >
            {/* Pastille de couleur — même couleur que les nœuds du graphe */}
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            {entry.nameArabic}
            <span className="text-gray-400 dark:text-gray-300">
              ({entry.count})
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
