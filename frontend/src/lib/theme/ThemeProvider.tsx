// Système de thème light/dark — Option C : System + override
//
// Comportement :
//   1. Premier visit → détecte prefers-color-scheme de l'OS
//   2. Toggle manuel → persisté en localStorage
//   3. Changement OS → respecté tant que l'utilisateur n'a pas choisi manuellement
//
// Usage :
//   import { useTheme } from '@/lib/theme/ThemeProvider'
//   const { theme, toggleTheme } = useTheme()

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'

// --- Types ---

/** Thèmes supportés */
export type Theme = 'light' | 'dark'

/** Contexte exposé aux composants */
interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  isDark: boolean
}

// --- Constantes ---

/** Clé localStorage pour persister le choix utilisateur */
const STORAGE_KEY = 'wikiquran-theme'

/** Media query pour détecter la préférence OS */
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

// --- Context ---

const ThemeContext = createContext<ThemeContextValue | null>(null)

// --- Hook public ---

/**
 * Accède au thème courant et au toggle.
 * Doit être utilisé dans un composant enfant de <ThemeProvider>.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme() doit être utilisé dans un <ThemeProvider>')
  }
  return context
}

// --- Helpers ---

/** Lit le thème depuis localStorage, ou détecte la préférence OS */
function getInitialTheme(): Theme {
  // 1. Choix utilisateur persisté ?
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored

  // 2. Sinon, préférence OS
  if (window.matchMedia(DARK_MEDIA_QUERY).matches) return 'dark'

  // 3. Fallback → dark (cohérent avec l'UI actuelle)
  return 'dark'
}

/** Applique la classe 'dark' sur <html> */
function applyThemeToDOM(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

// --- Provider ---

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  // --- Appliquer le thème au DOM à chaque changement ---
  useEffect(() => {
    applyThemeToDOM(theme)
  }, [theme])

  // --- Écouter les changements de préférence OS ---
  // Uniquement si l'utilisateur n'a pas fait de choix manuel
  useEffect(() => {
    const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY)

    const handler = (e: MediaQueryListEvent) => {
      // Ne réagit que si pas de choix persisté
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // --- Toggle manuel → persiste le choix ---
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  const value: ThemeContextValue = {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
