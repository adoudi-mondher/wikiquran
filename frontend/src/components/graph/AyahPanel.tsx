// Panneau latéral — affiche le détail d'un verset au click dans le graphe
// Responsabilité : présentation du verset + actions
// Le fetch des données est délégué à useAyahDetail

import { useAyahDetail } from '../../hooks/useAyahDetail'
import { t } from '../../lib/i18n'

interface AyahPanelProps {
  surah: number
  verse: number
  onExplore: (surah: number, verse: number) => void
  onClose: () => void
}

export default function AyahPanel({ surah, verse, onExplore, onClose }: AyahPanelProps) {
  const { ayah, isLoading, error } = useAyahDetail({ surah, verse })

  return (
    <div
      className="absolute top-0 start-0 h-full w-80
                 bg-white dark:bg-gray-900
                 border-e border-gray-200 dark:border-gray-800
                 shadow-lg flex flex-col z-10"
    >
      {/* --- En-tête du panneau --- */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800
                      flex items-center justify-between shrink-0">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('panel.verseDetail')}
        </span>
        <button
          onClick={onClose}
          aria-label={t('panel.close')}
          className="p-1 rounded-md
                     text-gray-400 hover:text-gray-600
                     dark:text-gray-500 dark:hover:text-gray-300
                     hover:bg-gray-100 dark:hover:bg-gray-800
                     transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            className="w-4 h-4"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* --- Contenu --- */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* État Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* État Erreur */}
        {error && !isLoading && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {error instanceof Error ? error.message : t('common.unknownError')}
          </p>
        )}

        {/* État Success */}
        {ayah && !isLoading && (
          <>
            {/* Référence du verset */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              سورة {ayah.surah_name_arabic} — {t('panel.ayah')} {ayah.number}
            </div>

            {/* Texte arabe Uthmani */}
            <div
              className="text-uthmani text-lg leading-loose
                         text-gray-900 dark:text-gray-100
                         bg-gray-50 dark:bg-gray-800
                         rounded-lg p-4"
            >
              {ayah.text_arabic}
            </div>

            {/* TODO futur : liste des racines du verset */}
          </>
        )}
      </div>

      {/* --- Actions en bas du panneau --- */}
      {ayah && !isLoading && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <button
            onClick={() => onExplore(surah, verse)}
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg
                       hover:bg-blue-500 transition-colors"
          >
            {t('panel.explore')}
          </button>
        </div>
      )}
    </div>
  )
}
