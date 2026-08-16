// ============================================================================
// Ispis arapskog teksta ajeta. Veličinu uzima iz zajedničke postavke, pa se
// promjena u postavkama odražava na svim ekranima odjednom. Riječi u kojima je
// zabilježena greška mogu se obojiti drukčije, a broj ajeta se ispisuje
// arapskim brojkama radi izgleda mushafa.
// ============================================================================

import { useArabicSize } from "../../../context/ArabicSizeContext";
import { toArabicNumerals } from "../../../constants/hifz/helpers";

export function ArabicText({ text, verseNumber, className = "", isLight = false, errorWordIndices = [] }) {
  const { arabicSize } = useArabicSize();
  const textColor   = isLight ? "#6B5740" : "#E8D5B7";
  const numberColor = isLight ? "#9A7B5E" : "#C9A97A";
  const errorColor  = isLight ? "#C0392B" : "#FF6B5E";

  // Bojenje riječi s greškom: ako su dati indeksi (0-bazirano po riječi),
  // te riječi se boje drugom bojom - pohrana je samo mali niz brojeva.
  const errSet = new Set(errorWordIndices || []);
  const renderText = errSet.size === 0
    ? text
    : text.split(/\s+/).filter(Boolean).map((word, i) => (
        <span key={i} style={errSet.has(i) ? { color: errorColor, fontWeight: 700 } : undefined}>
          {word}{" "}
        </span>
      ));

  return (
    <p className={`text-right ${className}`}
      style={{
        fontFamily: "'Amiri', 'Scheherazade New', serif",
        fontSize: `${arabicSize}px`,
        lineHeight: arabicSize > 32 ? "2.6" : "2.2",
        direction: "rtl",
        color: textColor,
      }}>
      {renderText}
      {verseNumber != null && (
        <span className="mr-3" style={{ fontFamily: "'Amiri', serif", fontSize: `${Math.max(18, arabicSize - 4)}px`, color: numberColor, opacity: 0.75 }}>
          {' '}﴿{toArabicNumerals(verseNumber)}﴾
        </span>
      )}
    </p>
  );
}
