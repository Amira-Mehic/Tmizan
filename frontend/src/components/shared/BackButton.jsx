// Zajedničko "nazad" dugme - vraća jednu stranicu unazad u historiji.
// Koristi se na vrhu svake stranice; prati aktivnu temu.
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useLang } from "../../context/LanguageContext";

export default function BackButton({ className = "" }) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { lang } = useLang();

  return (
    <button
      onClick={() => navigate(-1)}
      className={`inline-flex items-center gap-1.5 text-sm rounded-xl px-3 py-1.5 hover:opacity-75 transition ${theme.cardSub} ${theme.muted} ${className}`}
    >
      ← {lang === "en" ? "Back" : "Nazad"}
    </button>
  );
}
