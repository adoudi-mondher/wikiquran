// AppFooter.tsx — Pied de page global WikiQuran
// Crédits sources + copyright Sidr Valley AI

export function AppFooter() {
  return (
    <footer className="w-full border-t border-gray-200 dark:border-white/10 bg-transparent py-3 px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400 dark:text-white/35 select-none">

        {/* Crédits sources — gauche */}
        <div className="flex items-center gap-2" dir="rtl">
          <span>المصادر</span>
          <span className="text-gray-300 dark:text-white/20">·</span>
          <a
            href="https://tanzil.net/download"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700 dark:hover:text-white/70 transition-colors duration-200 underline-offset-2 hover:underline"
          >
            tanzil.net
          </a>
          <span className="text-gray-300 dark:text-white/20">·</span>
          <a
            href="https://corpus.quran.com/download/default.jsp"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700 dark:hover:text-white/70 transition-colors duration-200 underline-offset-2 hover:underline"
          >
            corpus.quran.com
          </a>
        </div>

        {/* Copyright — droite */}
        <div className="flex items-center gap-1.5" dir="ltr">
          <span>© 2026</span>
          <span className="text-gray-300 dark:text-white/20">·</span>
          <a
            href="https://mondher.ch"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700 dark:hover:text-white/70 transition-colors duration-200 underline-offset-2 hover:underline"
          >
            Sidr Valley AI
          </a>
           <span className="text-gray-300 dark:text-white/20">·</span>
           <a
            href="https://github.com/adoudi-mondher/quranic-data"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700 dark:hover:text-white/70 transition-colors duration-200 underline-offset-2 hover:underline"
          >
            GitHub
          </a>
        </div>

      </div>
    </footer>
  );
}
