// ============================================================================
// Ta'lim - čitljiv (kratak) opis opsega učenja (scope_data), za prikaz na
// kartici aktivnog plana i na stranici punog rasporeda. Dijeli ga TalimWizard
// i PlanRasporedPage da se opis opsega uvijek ispisuje identično.
// ============================================================================

import { SURA_DATA } from "../../constants/hifz/SURA_DATA";

const STR = {
  bs: { cijeli: "Cijeli Kur'an", juz: "Džuz", juzevi: "Džuzevi", pages: "str." },
  en: { cijeli: "Whole Qur'an", juz: "Juz", juzevi: "Ajza", pages: "p." },
};

function describePart(part, lang) {
  const t = STR[lang] || STR.bs;
  switch (part?.type) {
    case "cijeli":
      return t.cijeli;
    case "dzuzevi":
      return `${part.dzuzevi.length > 1 ? t.juzevi : t.juz} ${part.dzuzevi.join(", ")}`;
    case "sure": {
      const names = (part.sure || []).map((id) => SURA_DATA.find((su) => su.id === id)?.name || id);
      return names.join(", ");
    }
    case "stranice": {
      let txt = `${t.pages} ${part.from}–${part.to}`;
      if (part.extra?.length) txt += `, ${part.extra.join(", ")}`;
      return txt;
    }
    default:
      return "";
  }
}

// scope može biti jednostavan oblik ili { type: "kombinovano", parts: [...] }
export function describeScope(scope, lang = "bs") {
  if (!scope) return "";
  if (scope.type === "kombinovano") {
    return (scope.parts || []).map((p) => describePart(p, lang)).filter(Boolean).join(", ");
  }
  return describePart(scope, lang);
}
