// Utilitaires partagés — parsing et formatage

/**
 * Parse un identifiant verset "2:255" → { surah: 2, verse: 255 }
 * Retourne null si le format est invalide
 */
export function parseAyahId(id: string): { surah: number; verse: number } | null {
  const match = id.match(/^(\d+):(\d+)$/)
  if (!match) return null
  return { surah: Number(match[1]), verse: Number(match[2]) }
}

/**
 * Formate un identifiant verset { surah: 2, verse: 255 } → "2:255"
 */
export function formatAyahId(surah: number, verse: number): string {
  return `${surah}:${verse}`
}

/**
 * Tronque un texte arabe pour l'affichage dans les tooltips
 */
export function truncateArabic(text: string, maxLength = 50): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '…'
}
