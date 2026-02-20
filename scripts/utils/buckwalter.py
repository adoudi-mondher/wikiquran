"""
WikiQuran — scripts/utils/buckwalter.py
Convertisseur Buckwalter → Arabe
Pas besoin de lib externe : c'est une simple table de correspondance.
"""

# Table de correspondance Buckwalter → Arabe
BUCKWALTER_TO_ARABIC = {
    # Lettres de base
    "'": 'ء',  # hamza
    '|': 'آ',  # alef madda
    '>': 'أ',  # alef hamza above
    '&': 'ؤ',  # waw hamza
    '<': 'إ',  # alef hamza below
    '}': 'ئ',  # ya hamza
    'A': 'ا',  # alef
    'b': 'ب',  # ba
    't': 'ت',  # ta
    'v': 'ث',  # tha
    'j': 'ج',  # jim
    'H': 'ح',  # ha
    'x': 'خ',  # kha
    'd': 'د',  # dal
    '*': 'ذ',  # dhal
    'r': 'ر',  # ra
    'z': 'ز',  # zay
    's': 'س',  # sin
    '$': 'ش',  # shin
    'S': 'ص',  # sad
    'D': 'ض',  # dad
    'T': 'ط',  # ta
    'Z': 'ظ',  # zha
    'E': 'ع',  # ain
    'g': 'غ',  # ghain
    'f': 'ف',  # fa
    'q': 'ق',  # qaf
    'k': 'ك',  # kaf
    'l': 'ل',  # lam
    'm': 'م',  # mim
    'n': 'ن',  # nun
    'h': 'ه',  # ha
    'w': 'و',  # waw
    'y': 'ي',  # ya
    # Alef maqsura et ta marbuta
    'Y': 'ى',  # alef maqsura
    'p': 'ة',  # ta marbuta
    # Voyelles courtes (harakat)
    'a': 'َ',  # fatha
    'i': 'ِ',  # kasra
    'u': 'ُ',  # damma
    'F': 'ً',  # tanwin fath
    'N': 'ٌ',  # tanwin damm
    'K': 'ٍ',  # tanwin kasr
    '~': 'ّ',  # shadda
    'o': 'ْ',  # sukun
    # Lam alef
    '{': 'ٱ',  # alef wasla
}


def buckwalter_to_arabic(bw_text: str) -> str:
    """
    Convertit une chaîne en translittération Buckwalter vers l'arabe.

    Exemple :
        buckwalter_to_arabic('smw')  → 'سمو'
        buckwalter_to_arabic('ktb')  → 'كتب'

    Args:
        bw_text: Texte en Buckwalter (ex: 'smw', 'ktb')

    Returns:
        Texte en arabe (ex: 'سمو', 'كتب')
    """
    return ''.join(BUCKWALTER_TO_ARABIC.get(char, char) for char in bw_text)


def arabic_root_display(bw_root: str) -> str:
    """
    Convertit une racine Buckwalter en arabe avec tirets pour affichage.

    Exemple :
        arabic_root_display('smw')  → 'س-م-و'
        arabic_root_display('ktb')  → 'ك-ت-ب'

    Args:
        bw_root: Racine en Buckwalter (2-4 caractères)

    Returns:
        Racine arabe avec tirets (ex: 'س-م-و')
    """
    arabic_chars = [BUCKWALTER_TO_ARABIC.get(c, c) for c in bw_root]
    return '-'.join(arabic_chars)


# ============================================================
# Test rapide — python buckwalter.py
# ============================================================
if __name__ == '__main__':
    tests = [
        ('smw', 'س-م-و'),   # racine de اسم (nom)
        ('ktb', 'ك-ت-ب'),   # racine de كتاب (livre)
        ('Elm', 'ع-ل-م'),   # racine de علم (savoir)
        ('rHm', 'ر-ح-م'),   # racine de رحمة (miséricorde)
    ]

    print("🔤 Test Buckwalter → Arabe\n")
    for bw, expected in tests:
        result = arabic_root_display(bw)
        status = '✅' if result == expected else '❌'
        print(f"  {status}  {bw:5} → {result:10} (attendu: {expected})")