// Système i18n minimaliste — scalable vers multilingue
//
// Usage actuel :
//   import { t } from '@/lib/i18n'
//   t('controls.explore')  →  "استكشاف"
//
// Pour ajouter une langue (futur) :
//   1. Créer fr.ts / en.ts avec les mêmes clés
//   2. Ajouter dans DICTIONARIES
//   3. Remplacer CURRENT_LOCALE par un state React (Context)
//   4. Ajouter un toggle langue dans la nav

import ar from './ar'

// --- Types exportés ---

/** Dictionnaire = map clé → traduction */
export type Dictionary = Record<string, string>

/** Locales supportées */
export type Locale = 'ar' // | 'fr' | 'en'  ← futur

/** Direction d'écriture associée à chaque locale */
export type Direction = 'rtl' | 'ltr'

// --- Registre des dictionnaires ---
const DICTIONARIES: Record<Locale, Dictionary> = {
  ar,
  // fr: fr,  ← futur
  // en: en,  ← futur
}

// --- Locale courante (constante pour l'instant, Context futur) ---
const CURRENT_LOCALE: Locale = 'ar'

// --- Direction associée à la locale ---
const DIRECTIONS: Record<Locale, Direction> = {
  ar: 'rtl',
  // fr: 'ltr',  ← futur
  // en: 'ltr',  ← futur
}

// --- API publique ---

/**
 * Traduit une clé dans la locale courante.
 * Retourne la clé elle-même si non trouvée (facilite le debug).
 */
export function t(key: string): string {
  const dict = DICTIONARIES[CURRENT_LOCALE]
  return dict[key] ?? key
}

/** Locale active */
export function getLocale(): Locale {
  return CURRENT_LOCALE
}

/** Direction d'écriture de la locale active */
export function getDirection(): Direction {
  return DIRECTIONS[CURRENT_LOCALE]
}

/** Vérifie si la locale active est RTL */
export function isRTL(): boolean {
  return getDirection() === 'rtl'
}