// Dictionnaire arabe — langue par défaut de WikiQuran
// Convention : clés groupées par domaine (app, controls, graph, common)
// Les placeholders dynamiques sont gérés côté appelant, pas ici

import type { Dictionary } from './index'

const ar: Dictionary = {
  // --- Application ---
  'app.title': '🕌 ويكي قرآن — شبكة المعرفة',
  'nav.graph': 'الشبكة',
  'nav.dashboard': 'تحليل الجذور',
  'nav.guide': '؟',

  // --- Guide d'utilisation ---
  'guide.title': 'كيف تستخدم ويكي قرآن؟',
  'guide.close': 'فهمت',
  'guide.verse.title': 'وضع الآية',
  'guide.verse.desc': 'اختر سورة وآية ثم اضغط "استكشاف" لعرض الآيات المرتبطة بها عبر الجذور المشتركة. كل عقدة هي آية، وكل رابط يعني جذراً مشتركاً.',
  'guide.root.title': 'وضع الجذر',
  'guide.root.desc': 'اختر جذراً من القائمة لعرض جميع الآيات التي تحتوي عليه. الترتيب حسب الترابط يُظهر الآيات الأكثر تشابكاً.',
  'guide.dashboard.title': 'لوحة التحليل',
  'guide.dashboard.desc': 'تصفّح أكثر الجذور شيوعاً وقارن بين المكّي والمدني. اضغط على أي جذر للانتقال مباشرة إلى شبكته.',
  'guide.filters.title': 'الفلاتر',
  'guide.filters.desc': 'صفّي النتائج حسب نوع السورة (مكّية / مدنية) أو حسب جذر ثانوي لتضييق الاستكشاف.',
  'guide.panel.title': 'تفاصيل الآية',
  'guide.panel.desc': 'اضغط على أي عقدة في الشبكة لعرض نص الآية. يمكنك استكشاف الآية كمركز جديد للشبكة.',

  // --- Contrôles (barre de recherche) ---
  'controls.surah': 'السورة',
  'controls.ayah': 'الآية',
  'controls.minRoots': 'الجذور (حد أدنى)',
  'controls.maxNeighbors': 'الجيران (حد أقصى)',
  'controls.explore': 'استكشاف',

  // --- Modes de recherche ---
  'mode.verse': 'آية',
  'mode.root': 'جذر',
  'controls.rootSelect': 'اختر جذراً',
  'controls.rootSearch': 'بحث...',
  'graph.idleRoot': 'اختر جذراً لاستكشاف الآيات المرتبطة',

  // --- Filtre type sourate ---
  'filter.all': 'الكل',
  'filter.meccan': 'مكّية',
  'filter.medinan': 'مدنية',
  'filter.allRoots': 'كل الجذور',
  'filter.root': 'الجذر',
  'filter.secondaryRoot': 'جذر ثانوي',

  // --- Stats en temps réel ---
  'stats.surahs': 'سور',
  'stats.meccan': 'مكّية',
  'stats.medinan': 'مدنية',
  'stats.topRoot': 'أكثر جذر مشترك',

  // --- Bandeau racine active ---
  'rootBanner.ayahs': 'آية',
  'rootBanner.occurrences': 'ورود',

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
  'common.ayah': 'آية',

  // --- Dashboard racines ---
  'dashboard.title': 'لوحة تحليل الجذور',
  'dashboard.tab.all': 'الكل',
  'dashboard.tab.meccan': 'مكّية',
  'dashboard.tab.medinan': 'مدنية',
  'dashboard.topRoots': 'أكثر الجذور شيوعاً',
  'dashboard.distribution': 'توزيع الجذور',
  'dashboard.distributionDesc': 'التوزيع حسب الترتيب — قانون زيف',
  'dashboard.ayahs': 'آية',
  'dashboard.occurrences': 'ورود',
  'dashboard.rank': 'الترتيب',
  'dashboard.frequency': 'التكرار',
  'dashboard.exploreRoot': 'استكشاف في الشبكة',
  'dashboard.meccanAyahs': 'آية مكّية',
  'dashboard.medinanAyahs': 'آية مدنية',
}

export default ar