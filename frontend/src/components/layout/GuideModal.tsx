// Modal guide d'utilisation — explique les fonctionnalités principales
// S'affiche automatiquement au premier visit (localStorage flag)
// Réouvrable via le bouton "؟" dans le header

import { useEffect, useState } from 'react'
import { t } from '../../lib/i18n'

/** Clé localStorage pour le premier visit */
const GUIDE_SEEN_KEY = 'wikiquran_guide_seen'

/** Section du guide */
interface GuideSection {
  icon: string
  titleKey: string
  descKey: string
}

const SECTIONS: GuideSection[] = [
  { icon: '🔵', titleKey: 'guide.verse.title', descKey: 'guide.verse.desc' },
  { icon: '🟢', titleKey: 'guide.root.title', descKey: 'guide.root.desc' },
  { icon: '📊', titleKey: 'guide.dashboard.title', descKey: 'guide.dashboard.desc' },
  { icon: '🔽', titleKey: 'guide.filters.title', descKey: 'guide.filters.desc' },
  { icon: '📖', titleKey: 'guide.panel.title', descKey: 'guide.panel.desc' },
]

interface GuideModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function GuideModal({ isOpen, onClose }: GuideModalProps) {
  if (!isOpen) return null

  return (
    // Overlay sombre
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Contenu du modal — empêche la propagation du click */}
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl
                   max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center">
            {t('guide.title')}
          </h2>
        </div>

        {/* Sections */}
        <div className="px-6 py-4 space-y-5">
          {SECTIONS.map((section) => (
            <div key={section.titleKey} className="flex gap-3">
              <span className="text-xl shrink-0 mt-0.5">{section.icon}</span>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {t(section.titleKey)}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t(section.descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bouton fermer */}
        <div className="px-6 pb-6 pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg
                       hover:bg-blue-500 transition-colors cursor-pointer"
          >
            {t('guide.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook pour gérer l'état du guide (premier visit + ouverture manuelle)
 * Retourne [isOpen, open, close]
 */
export function useGuide(): [boolean, () => void, () => void] {
  const [isOpen, setIsOpen] = useState(false)

  // Premier visit → ouvrir automatiquement
  useEffect(() => {
    const seen = localStorage.getItem(GUIDE_SEEN_KEY)
    if (!seen) {
      setIsOpen(true)
      localStorage.setItem(GUIDE_SEEN_KEY, 'true')
    }
  }, [])

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)

  return [isOpen, open, close]
}
