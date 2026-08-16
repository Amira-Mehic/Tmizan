// ============================================================================
// TodayLearningPanel - dijeljeni prikaz "šta danas učiš" na Dashboardu.
// Korisnik može imati VIŠE istovremeno aktivnih planova (jedan "cijeli Kur'an"
// je uvijek sam; sura/džuz/raspon planovi mogu koegzistirati) - zato ovdje
// renderujemo JEDNU karticu po aktivnom planu: naziv (opseg), metoda, koliko
// vremena treba dnevno, šta je danas na redu (jedinica-svjesno: Ajet vs Str.),
// i dugme "Započni učenje" koje vodi na Učenje danas ZA TAJ KONKRETAN plan
// (?plan=<id>). Samo označavanje "urađeno" se radi na samoj sesiji, ne ovdje.
// ============================================================================

import { Link } from "react-router-dom";
import { describeScope } from "../../features/talim/scopeLabel";
import { METHOD_INFO } from "../../features/talim/methodInfo";

// cardCls (opciono) - boja unutrašnje kartice po planu. Default je
// theme.cardSub, ALI na tamnim temama cardSub je namjerno skoro crn (nijansa
// za "utonulu" ravan), pa ako se panel prikazuje unutar OBOJENE sekcijske
// kartice (npr. SECTION_ACCENTS.personal), taj skoro-crni kvadrat upadljivo
// odudara od boje sekcije oko njega. Pozivalac treba proslijediti
// odgovarajuću SECTION_ACCENTS.X.item klasu da unutrašnja kartica ostane u
// istoj boji-porodici kao okvir oko nje.
export default function TodayLearningPanel({ theme, t, lang, activeLearning, cardCls }) {
  const { loading, entries } = activeLearning;

  if (loading) return <p className={`${theme.muted} text-sm`}>…</p>;

  if (!entries.length) {
    return (
      <div className={`${theme.muted} text-sm`}>
        {t("dashboard.noLearningPlan")}{" "}
        <Link to="/korisnik/hifz/planner" className={`${theme.accent} underline`}>
          {t("dashboard.createPlan")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <PlanCard key={entry.talimPlan.id} theme={theme} t={t} lang={lang} entry={entry} cardCls={cardCls} />
      ))}
    </div>
  );
}

function PlanCard({ theme, t, lang, entry, cardCls }) {
  const { talimPlan, learning, isRest, doneToday, progress } = entry;
  const methodInfo = (METHOD_INFO[lang] || METHOD_INFO.bs)[talimPlan.method];
  const scopeLabel = describeScope(talimPlan.scope_data, lang) || methodInfo?.naziv || "";
  const minutes = talimPlan.state?.minutesNeeded;

  let dueText = "";
  if (isRest) {
    dueText = t("dashboard.restDay");
  } else if (doneToday) {
    dueText = t("dashboard.learningDoneToday");
  } else if (!learning) {
    dueText = t("dashboard.nothingDue");
  } else if (learning.unit === "ajeti") {
    dueText = t("dashboard.ayetRange", {
      fromSurah: learning.from.surah, fromAyah: learning.from.ayah,
      toSurah: learning.to.surah, toAyah: learning.to.ayah,
    });
  } else if (learning.unit === "redom") {
    dueText = t("dashboard.pageOnly", { page: learning.page });
  } else if (learning.unit === "krugovi") {
    dueText = t("dashboard.krugoviDue", { page: learning.page, juz: learning.juz, krug: learning.krug });
  } else if (learning.unit === "halka") {
    dueText = learning.waitingMualim ? t("dashboard.halkaWaiting") : learning.label;
  } else {
    dueText = t("dashboard.pageLineShort", {
      fromPage: learning.from.page, fromLine: learning.from.line,
      toPage: learning.to.page, toLine: learning.to.line,
    });
  }

  return (
    <div className={`${cardCls || theme.cardSub} rounded-xl p-3 space-y-2`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className="text-base font-bold leading-tight truncate">{scopeLabel}</p>
          {methodInfo?.naziv && <p className={`text-[11px] ${theme.muted}`}>{methodInfo.naziv}</p>}
        </div>
        {!!minutes && (
          <span className={`shrink-0 text-[11px] font-semibold ${theme.accent}`}>
            ⏱ {t("dashboard.minutesShort", { count: minutes })}
          </span>
        )}
      </div>

      <p className={`text-sm ${doneToday ? "font-semibold text-green-500" : ""}`}>{dueText}</p>

      {progress && progress.backlogLines > 0 && !isRest && (
        <p className="text-xs font-semibold text-amber-500">
          {t("dashboard.behindPlanMsg", { count: Math.round(progress.backlogLines * 10) / 10 })}
        </p>
      )}
      {progress && progress.aheadLines > 0 && !isRest && (
        <p className="text-xs text-emerald-500 font-medium">
          {t("dashboard.aheadOfPlanMsg", { count: Math.round(progress.aheadLines * 10) / 10 })}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Link to={`/korisnik/hifz/ucenje?plan=${talimPlan.id}`}
          className={`${theme.button} rounded-lg px-3 py-1.5 text-xs font-semibold`}>
          {t("dashboard.startLearningBtn")}
        </Link>
        <Link to="/korisnik/hifz/raspored" className={`text-xs ${theme.accent} underline`}>
          {t("dashboard.viewFullSchedule")}
        </Link>
      </div>
    </div>
  );
}
