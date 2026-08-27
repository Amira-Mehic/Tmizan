// ============================================================================
// Murajaa - centralna stranica ponavljanja
//
// - Kreiranje BLOKA: jedinica (red/ajet/stranica/sura/džuz) + stavke + metoda
//   (tri dana / sedam dana / Fibonacci / SRS) - metode se mogu KOMBINOVATI
//   tako što različiti blokovi koriste različite metode.
// - Lista "na redu danas": vizuelni indikatori (tačkice 1/7–7/7, SRS nivo,
//   pozicija u Fibonacci nizu), upozorenje na preskočene dane s izborom
//   Resetuj / Nastavi, dugmad Tačno / Greška (motor sam računa dalje).
// - Novo i staro: automatska podjela dnevne sesije 50/50.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { useLang } from "../../../context/LanguageContext";
import { useAuth } from "../../../context/AuthContext";
import { createReviewBlock, fetchBlocks, recordReview } from "../../../features/murajaah/murajaahService";
import { describeState, daysOverdue, UNIT_TYPES } from "../../../features/murajaah/engine";
import { METHODS } from "../../../features/murajaah/methods";
import { dailySession, warnings as nsWarnings } from "../../../features/murajaah/novoStaro";
import { todayStr, fmtDateTime } from "../../../constants/hifz/helpers";
import BackButton from "../../../components/shared/BackButton";
import RotationToday from "./components/RotationToday";
import WeakSpotMap from "./components/WeakSpotMap";
import SlobodanRaspored from "./components/SlobodanRaspored";
import GuidedTour from "../../../components/shared/GuidedTour";
import { PageTourButton } from "../../../components/shared/PageTourButton";
import { PONAVLJANJE_TOUR } from "../../../constants/tours/ponavljanjeTour";
import { hasSeenTour, markTourSeen } from "../../../lib/tourStorage";

const STR = {
  bs: {
    title: "Ponavljanje (Murajaa)", subtitle: "Blokovi, metode i današnji raspored — metode se mogu kombinovati po bloku",
    newBlock: "Novi blok (naučeno danas)", unit: "Jedinica", items: "Stavke",
    itemsHint: "npr. ajeti: 36:1, 36:2, 36:3 — ili stranice: 302, 303",
    label: "Naziv", labelPh: "npr. Ja-Sin 1–12", labelRequired: "Naziv je obavezan.", method: "Metoda ponavljanja",
    create: "Dodaj u sistem ponavljanja", created: "Blok dodan ✓",
    dueToday: "Na redu danas", noDue: "Ništa nije na redu — sve stigneš!",
    correct: "Tačno", incorrect: "Greška", late: "kasni {n} d.",
    lateQuestion: "Preskočeni dani — nastaviti gdje si stao/la ili resetovati blok?",
    continue: "Nastavi", reset: "Resetuj",
    allBlocks: "Svi blokovi", noBlocks: "Još nema blokova — dodaj prvi iznad.",
    combineHint: "💡 Kombinovanje: svaki blok može imati svoju metodu — npr. nove sure na Tri dana, stari hifz na SRS.",
    novoStaro: "Novo i staro (dnevna sesija)", novo: "NOVO (zadnjih 14 dana)", staro: "STARO (30+ dana)",
    nsEmpty: "Blokova još nema u ovoj kategoriji.", nsWarn: "upozorenja",
    units: { red: "Red", ajet: "Ajet", stranica: "Stranica", sura: "Sura", dzuz: "Džuz" },
    methods: { tri_dana: "Tri dana", sedam_dana: "Sedam dana", fibonacci: "1-2-3-5-8", srs: "SRS (nivoi 1–7)" },
  },
  en: {
    title: "Review (Murajaah)", subtitle: "Blocks, methods and today's schedule — methods can be combined per block",
    newBlock: "New block (learned today)", unit: "Unit", items: "Items",
    itemsHint: "e.g. ayahs: 36:1, 36:2, 36:3 — or pages: 302, 303",
    label: "Label", labelPh: "e.g. Ya-Sin 1–12", labelRequired: "A label is required.", method: "Review method",
    create: "Add to review system", created: "Block added ✓",
    dueToday: "Due today", noDue: "Nothing due — you're on track!",
    correct: "Correct", incorrect: "Mistake", late: "{n} d. late",
    lateQuestion: "Skipped days — continue where you left off, or reset the block?",
    continue: "Continue", reset: "Reset",
    allBlocks: "All blocks", noBlocks: "No blocks yet — add your first above.",
    combineHint: "💡 Combining: each block can use its own method — e.g. new surahs on Three days, old hifz on SRS.",
    novoStaro: "New & old (daily session)", novo: "NEW (last 14 days)", staro: "OLD (30+ days)",
    nsEmpty: "No blocks in this category yet.", nsWarn: "warnings",
    units: { red: "Line", ajet: "Ayah", stranica: "Page", sura: "Surah", dzuz: "Juz" },
    methods: { tri_dana: "Three days", sedam_dana: "Seven days", fibonacci: "1-2-3-5-8", srs: "SRS (levels 1–7)" },
  },
};

export default function MurajaaPage() {
  const { theme, sectionAccents: SECTION_ACCENTS } = useTheme();
  const { lang } = useLang();
  const { user } = useAuth();
  const userId = user?.id;
  const s = STR[lang] || STR.bs;
  const today = todayStr();
  // placeholder tekst na obojenim (item) pozadinama koristio je browser-ov
  // default sivi placeholder, koji se gubi/ne vidi na svijetlim (bež) temama
  // - eksplicitno postavi na theme.text boju (visok kontrast na svim temama)
  const placeholderCls = theme.text.replace("text-", "placeholder:text-");

  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [created, setCreated] = useState(false);

  // forma novog bloka
  const [unit, setUnit] = useState("ajet");
  const [itemsText, setItemsText] = useState("");
  const [label, setLabel] = useState("");
  const [methodId, setMethodId] = useState("tri_dana");

  // ── Kratak vodič, prvi put kad korisnik uđe na ovu stranicu ──
  // Čisto sinhrona provjera (localStorage) - prilagođava se tokom rendera uz
  // poređenje s prethodnim userId (isti okidač kao stari dependency niz).
  const [showTour, setShowTour] = useState(false);
  const [prevUserIdTour, setPrevUserIdTour] = useState(userId);
  if (userId !== prevUserIdTour) {
    setPrevUserIdTour(userId);
    if (userId && !hasSeenTour(userId, "ponavljanje")) setShowTour(true);
  }
  const finishTour = () => { if (userId) markTourSeen(userId, "ponavljanje"); setShowTour(false); };

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try { setBlocks(await fetchBlocks(userId)); } catch { setBlocks([]); }
    setLoading(false);
  }, [userId]);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    const items = itemsText.split(/[,\s]+/).filter(Boolean);
    if (!items.length || !label.trim()) return;
    try {
      await createReviewBlock(userId, { unitType: unit, items, label, learnedOn: today, methodId });
      setItemsText(""); setLabel(""); setCreated(true);
      setTimeout(() => setCreated(false), 2500);
      load();
    } catch { /* validacija u engine-u */ }
  };

  const review = async (block, result) => {
    try {
      await recordReview(userId, block, { result, at: new Date().toISOString() });
      load();
    } catch { /* ostaje */ }
  };

  const nowIso = new Date().toISOString();
  const due = blocks.filter((b) => b.nextReviewOn && b.nextReviewOn <= nowIso);
  const session = dailySession(blocks, today);
  const nsW = nsWarnings(blocks, today);

  return (
    <div className={`min-h-screen ${theme.text} px-4 py-6 sm:px-6 lg:px-10`}>
      <GuidedTour steps={PONAVLJANJE_TOUR[lang] || PONAVLJANJE_TOUR.bs} active={showTour} onFinish={finishTour} theme={theme} lang={lang} dismissible />
      <div className="max-w-4xl mx-auto space-y-5">
        <BackButton />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
            🔁 {s.title}
            <PageTourButton onClick={() => setShowTour(true)} />
          </h1>
          <p className={`${theme.muted} text-sm mt-1`}>{s.subtitle}</p>
        </div>

        {/* ── NOVI BLOK ── */}
        <div data-tour="tour-ponavljanje-newblock" className={`${SECTION_ACCENTS.mualim.wash} rounded-2xl p-4 space-y-3 border-l-4 ${SECTION_ACCENTS.mualim.border}`}>
          <h2 className="font-semibold">➕ {s.newBlock}</h2>
          <div className="flex gap-2 flex-wrap">
            {UNIT_TYPES.map((u) => (
              <button key={u} onClick={() => setUnit(u)}
                className={`rounded-xl px-3.5 py-1.5 text-sm ${unit === u ? theme.button : `${SECTION_ACCENTS.mualim.item} ${theme.muted}`}`}>
                {s.units[u]}
              </button>
            ))}
          </div>
          <div>
            <input value={itemsText} onChange={(e) => setItemsText(e.target.value)} placeholder={s.items}
              className={`w-full ${SECTION_ACCENTS.mualim.item} ${placeholderCls} rounded-xl px-3 py-2.5 text-sm outline-none`} />
            <p className={`text-[11px] mt-1 ${theme.muted}`}>{s.itemsHint}</p>
          </div>
          <div>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={s.labelPh}
              className={`w-full ${SECTION_ACCENTS.mualim.item} ${placeholderCls} rounded-xl px-3 py-2.5 text-sm outline-none ${!label.trim() ? "ring-1 ring-red-400/50" : ""}`} />
            {!label.trim() && <p className="text-[11px] mt-1 text-red-400">{s.labelRequired}</p>}
          </div>
          <div className="flex gap-2 flex-wrap">
            {Object.keys(METHODS).map((m) => (
              <button key={m} onClick={() => setMethodId(m)}
                className={`rounded-xl px-3.5 py-1.5 text-sm ${methodId === m ? theme.button : `${SECTION_ACCENTS.mualim.item} ${theme.muted}`}`}>
                {s.methods[m]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={create} disabled={!label.trim() || !itemsText.trim()}
              className={`${theme.button} rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed`}>
              {s.create}
            </button>
            {created && <span className="text-sm text-green-500">{s.created}</span>}
          </div>
          <p className={`text-xs ${theme.muted}`}>{s.combineHint}</p>
        </div>

        {/* ── NA REDU DANAS ── */}
        <div data-tour="tour-ponavljanje-due" className={`${SECTION_ACCENTS.review.wash} rounded-2xl p-4 border-l-4 ${SECTION_ACCENTS.review.border}`}>
          <h2 className="font-semibold mb-3">📅 {s.dueToday} ({due.length})</h2>
          {loading ? <p className={theme.muted}>…</p> : due.length === 0 ? (
            <p className={`text-sm ${theme.muted}`}>{s.noDue}</p>
          ) : (
            <ul className="space-y-3">
              {due.map((b) => {
                const late = daysOverdue(b, nowIso);
                return (
                  <li key={b.id} className={`${SECTION_ACCENTS.review.item} rounded-xl p-3 space-y-2`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{b.label || b.items.join(", ")}</div>
                        <div className={`text-xs ${theme.muted}`}>
                          {s.methods[b.method]} · {describeState(b)}
                        </div>
                      </div>
                      <BlockIndicator block={b} theme={theme} />
                    </div>

                    {late > 0 ? (
                      <div className="rounded-lg bg-amber-500/15 border border-amber-500/40 p-2.5 text-xs space-y-2">
                        <p className="font-semibold text-amber-500">
                          ⚠ {s.late.replace("{n}", late)} — {s.lateQuestion}
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => review(b, "correct")} className="bg-green-600 text-white rounded-lg px-3 py-1.5">
                            {s.continue}
                          </button>
                          <button onClick={() => review(b, "incorrect")} className="bg-red-500 text-white rounded-lg px-3 py-1.5">
                            {s.reset}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => review(b, "correct")} className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-1.5 text-sm">
                          ✓ {s.correct}
                        </button>
                        <button onClick={() => review(b, "incorrect")} className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-1.5 text-sm">
                          ✕ {s.incorrect}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── KRUŽNE METODE (džuzevi, kvota, Šeton, Femi, džuz sedmično) ── */}
        <RotationToday />

        {/* ── MAPA SLABIH MJESTA (metoda na osnovu grešaka) ── */}
        <WeakSpotMap />

        {/* ── NOVO I STARO ── */}
        <div className={`${SECTION_ACCENTS.tasks.wash} rounded-2xl p-4 border-l-4 ${SECTION_ACCENTS.tasks.border}`}>
          <h2 className="font-semibold mb-1">⚖️ {s.novoStaro}</h2>
          {nsW.length > 0 && (
            <p className="text-xs text-amber-500 mb-2">⚠ {nsW.length} {s.nsWarn}: {nsW[0].poruka}</p>
          )}
          <div className="grid sm:grid-cols-2 gap-3 mt-2">
            {[["novo", session.novo], ["staro", session.staro]].map(([k, list]) => (
              <div key={k} className={`${SECTION_ACCENTS.tasks.item} rounded-xl p-3`}>
                <div className={`inline-block text-[10px] font-bold uppercase tracking-wider mb-2 px-1.5 py-0.5 rounded-full ${k === "novo" ? SECTION_ACCENTS.personal.chip : SECTION_ACCENTS.review.chip}`}>
                  {s[k]} · 50%
                </div>
                {list.length === 0 ? (
                  <p className={`text-xs ${theme.muted}`}>{s.nsEmpty}</p>
                ) : (
                  <ul className="space-y-1">
                    {list.slice(0, 4).map((b) => (
                      <li key={b.id} className="text-sm truncate">• {b.label || b.items.join(", ")}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── SLOBODNI RASPORED (ručno bilježenje + statistika) ── */}
        <details className={`${SECTION_ACCENTS.messages.wash} rounded-2xl p-4 border-l-4 ${SECTION_ACCENTS.messages.border}`}>
          <summary className="font-semibold cursor-pointer">🕊 {lang === "en" ? "Free schedule" : "Slobodni raspored"}</summary>
          <div className="mt-3"><SlobodanRaspored /></div>
        </details>

        {/* ── SVI BLOKOVI ── */}
        <div className={`${SECTION_ACCENTS.personal.wash} rounded-2xl p-4 border-l-4 ${SECTION_ACCENTS.personal.border}`}>
          <h2 className="font-semibold mb-3">📦 {s.allBlocks} ({blocks.length})</h2>
          {blocks.length === 0 ? (
            <p className={`text-sm ${theme.muted}`}>{s.noBlocks}</p>
          ) : (
            <ul className="space-y-2">
              {blocks.map((b) => (
                <li key={b.id} className={`${SECTION_ACCENTS.personal.item} rounded-xl px-3 py-2 text-sm flex items-center justify-between gap-2 flex-wrap`}>
                  <span className="truncate">{b.label || b.items.join(", ")}</span>
                  <span className={`text-xs shrink-0 ${theme.muted}`}>
                    {s.methods[b.method]} · {describeState(b)} · → {fmtDateTime(b.nextReviewOn)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Vizuelni indikator napretka bloka ───────────────────────────────────────
// sedam_dana: 7 tačkica (1/7–7/7); tri_dana: 3 tačkice; fibonacci: 5 tačkica;
// srs: nivo pilula. Popunjeno = odrađeni koraci.
function BlockIndicator({ block, theme }) {
  if (block.method === "srs") {
    return (
      <span className={`${theme.button} rounded-full px-2.5 py-0.5 text-xs shrink-0`}>
        N{block.srsLevel}/7
      </span>
    );
  }
  const total = block.method === "sedam_dana" ? 7 : block.method === "tri_dana" ? 3 : 5;
  const filled = Math.min(block.step, total);
  return (
    <div className="flex gap-1 shrink-0" title={`${filled}/${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`w-2 h-2 rounded-full ${i < filled ? "bg-green-500" : "bg-gray-400/40"}`} />
      ))}
    </div>
  );
}
