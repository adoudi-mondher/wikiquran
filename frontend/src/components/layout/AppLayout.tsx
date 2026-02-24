// Layout principal — partagé par toutes les pages
// Responsabilité : header global (titre + toggle thème) + slot contenu
// Chaque page enfant gère son propre contenu dans {children}

import type { ReactNode } from 'react'
import ThemeToggle from '../ThemeToggle'
import { t, isRTL } from '../../lib/i18n'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const dir = isRTL() ? 'rtl' : 'ltr'

  return (
    <div dir={dir} className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* --- Header global --- */}
      <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0
                          flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t('app.title')}
        </h1>
        <ThemeToggle />
      </header>

      {/* --- Contenu de la page --- */}
      {children}
    </div>
  )
}
