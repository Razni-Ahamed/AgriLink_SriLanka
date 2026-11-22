"""Make the two tiny fonts that draw the language names in the language switcher.

The switcher on the sign-in and register pages shows "සිංහල" and "தமிழ்" in their own scripts.
Drawn with the full fonts, those two words would make every English visitor download the whole
Sinhala and Tamil fonts (about 150 KB) for two buttons. These files hold only the letters of the
two names, cut from the same fonts at the switcher's weight, so they look identical at ~2 KB.

Run from frontend/ after changing a language name or the fonts (see src/fonts.css):
    python3 scripts/subset-language-names.py
Needs fontTools (pip install fonttools brotli) and the @fontsource packages from npm install.
"""

from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

FRONTEND = Path(__file__).resolve().parent.parent
MODULES = FRONTEND / "node_modules" / "@fontsource-variable"
OUT = FRONTEND / "src" / "assets" / "fonts"
WEIGHT = 500  # LanguageSwitcher's font-medium

FONTS = {
    "language-name-sinhala.woff2": (MODULES / "yaldevi/files/yaldevi-sinhala-wght-normal.woff2", "සිංහල"),
    "language-name-tamil.woff2": (MODULES / "anek-tamil/files/anek-tamil-tamil-wght-normal.woff2", "தமிழ்"),
}

for name, (source, text) in FONTS.items():
    font = instantiateVariableFont(TTFont(source), {"wght": WEIGHT})
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]  # keep the shaping rules that join the letters
    options.name_IDs = []
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=text + "‌‍◌")
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(OUT / name)
    print(f"{name}: {(OUT / name).stat().st_size} bytes")
