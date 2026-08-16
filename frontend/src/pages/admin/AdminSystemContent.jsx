// ============================================================================
// Uređivanje sistemskog sadržaja koji se prikazuje kroz aplikaciju, bez potrebe
// za izmjenom koda i novom objavom.
// ============================================================================

import { useLang } from "../../context/LanguageContext";

export default function AdminSystemContent() {
  const { lang } = useLang();
  return <div className="p-8 text-white">{lang === "en" ? "Content" : "Sadržaj"}</div>;
}
