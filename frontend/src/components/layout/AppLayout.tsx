// Layout principal — partagé par toutes les pages
// Responsabilité : header global (titre + navigation + toggle thème) + slot contenu

import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ThemeToggle from '../ThemeToggle'
import GuideModal, { useGuide } from './GuideModal'
import { t, isRTL } from '../../lib/i18n'

interface AppLayoutProps {
  children: ReactNode
}

/** Liens de navigation */
const NAV_LINKS = [
  { path: '/graph', label: 'nav.graph' },
  { path: '/dashboard', label: 'nav.dashboard' },
] as const

export default function AppLayout({ children }: AppLayoutProps) {
  const dir = isRTL() ? 'rtl' : 'ltr'
  const { pathname } = useLocation()
  const [guideOpen, openGuide, closeGuide] = useGuide()

  return (
    <div dir={dir} className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* --- Header global --- */}
      <header className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0
                          flex items-center justify-between">
        {/* Titre + navigation */}
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('app.title')}
          </h1>

          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname.startsWith(link.path)
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                    ${isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                  {t(link.label)}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Actions header */}
        <div className="flex items-center gap-2">
          <button
            onClick={openGuide}
            className="w-9 h-9 flex items-center justify-center rounded-full
                      bg-blue-600 text-white text-base font-bold
                      hover:bg-blue-500
                      transition-colors cursor-pointer"
            title={t('guide.title')}
          >
            ؟
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* --- Contenu de la page --- */}
      {children}

      {/* --- Modal guide --- */}
      <GuideModal isOpen={guideOpen} onClose={closeGuide} />
    </div>
  )
}
