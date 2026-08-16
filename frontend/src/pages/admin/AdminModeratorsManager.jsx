// ============================================================================
// Upravljanje moderatorima - dodjela i oduzimanje uloge. Moderator i admin
// odobravaju zahtjeve ravnopravno, pa se ovim ekranom širi krug ljudi koji mogu
// obrađivati zahtjeve i tikete.
// ============================================================================

import { useLang } from "../../context/LanguageContext";

export default function AdminModeratorsManager() {
  const { lang } = useLang();
  return <div className="p-8 text-white">{lang === "en" ? "Moderators" : "Moderatori"}</div>;
}
