// Dictionnaire arabe — langue par défaut de WikiQuran
// Convention : clés groupées par domaine (app, controls, graph, common)
// Les placeholders dynamiques sont gérés côté appelant, pas ici

import type { Dictionary } from './index'

const ar: Dictionary = {
  // --- Application ---
  'app.title': '🕌 ويكي قرآن — شبكة المعرفة',

  // --- Contrôles (barre de recherche) ---
  'controls.surah': 'السورة',
  'controls.ayah': 'الآية',
  'controls.minRoots': 'الجذور (حد أدنى)',
  'controls.maxNeighbors': 'الجيران (حد أقصى)',
  'controls.explore': 'استكشاف',

  // --- Graphe (zone principale) ---
  'graph.idle': 'اختر آية لاستكشاف روابطها',
  'graph.idleExample': 'مثال: البقرة، الآية 255 (آية الكرسي)',
  'graph.exploring': 'جاري استكشاف الشبكة…',
  'graph.nodes': 'عقدة',
  'graph.links': 'رابط',
  'graph.totalFiltered': 'إجمالي (مُصفّى)',
  'graph.surahFallback': 'سورة',
  'graph.rootCount': 'جذر',   // "5 جذر" — pas de pluriel complexe, on garde simple

  // --- Panneau latéral (détail verset) ---
  'panel.verseDetail': 'تفاصيل الآية',
  'panel.close': 'إغلاق',
  'panel.ayah': 'الآية',
  'panel.explore': 'استكشاف هذه الآية',

  // --- Commun ---
  'common.loading': 'جاري التحميل…',
  'common.error': 'خطأ',
  'common.unknownError': 'خطأ غير معروف',
}

export default ar