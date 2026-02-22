// Constantes globales de l'application

/** Valeurs par défaut des filtres graphe (miroir du backend) */
export const GRAPH_DEFAULTS = {
  minRoots: 2,
  limit: 50,
  maxNodes: 30,
  sort: 'mushaf' as const,
} as const

/** Limites des filtres (miroir de la validation backend) */
export const GRAPH_LIMITS = {
  minRoots: { min: 1, max: 10 },
  limit: { min: 1, max: 500 },
  maxNodes: { min: 5, max: 100 },
} as const

/**
 * Palette de couleurs par sourate (114 couleurs)
 * Génère une couleur HSL basée sur le numéro de sourate
 * Les sourates proches ont des couleurs distinctes grâce au golden ratio
 */
export function surahColor(surahNumber: number): string {
  // Golden angle ≈ 137.5° — distribue les teintes uniformément
  const hue = (surahNumber * 137.508) % 360
  return `hsl(${hue}, 70%, 55%)`
}
