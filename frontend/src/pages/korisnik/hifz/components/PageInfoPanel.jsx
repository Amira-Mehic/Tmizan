// ============================================================================
// Pregled jedne stranice mushafa bez mogućnosti uređivanja - status, sigurnost
// znanja, broj ponavljanja, greške, bilješke i lista ajeta. Uređivanje istih
// podataka radi EditForm; razdvojeni su da bi pregled ostao čitljiv, a unos
// zaseban.
// ============================================================================

import { STATUS } from "../../../../constants/hifz/STATUS";
import { fmtDateTime, todayStr, statusCardBg, statusBorder } from "../../../../constants/hifz/helpers";
import { ConfidenceDots } from "../../../../components/hifz/shared/ConfidenceDots";
import { StatusPicker } from "../../../../components/hifz/shared/StatusPicker";
import { VerseRowItem } from "./VerseRowItem";
import { FirstTimeHint } from "../../../../components/shared/FirstTimeHint";

export function PageInfoPanel({ pageNum, data, verses, loadingVerses, onOpenVerse, onSaveVerse, onQuickStatus, quickStatusSaving, verseStatuses, rowsPerPage, theme, s, editSlot, onViewVerseDetails }) {
  const d  = data || {};
  const st = STATUS[d.status || "prazna"];

  // ── Brojanje ajeta i redova ──────────────────────────────────────────────
  const rpp           = rowsPerPage || 15;
  const totalVerses   = verses?.length || 0;
  const learnedVerses = verses?.filter(v => {
    const vst = verseStatuses?.[v.verse_key]?.status;
    return vst === "naucen" || vst === "savladano";
  }).length || 0;
  const remainingVerses = totalVerses - learnedVerses;
  const learnedRows     = totalVerses > 0 ? Math.round((learnedVerses / totalVerses) * rpp) : 0;
  const remainingRows   = rpp - learnedRows;

  const isLight  = theme?.id === "beige_white" || theme?.id === "pink_soft";
  const tCard    = theme?.card    || "bg-white/[0.04] border border-white/10";
  const tText    = theme?.text    || "text-white";
  const tMuted   = theme?.muted   || "text-white/40";
  const tSubtle  = isLight ? "text-black/35" : "text-white/25";
  const tBorder  = isLight ? "border-black/8"  : "border-white/[0.06]";
  const divider  = isLight ? "bg-black/8"    : "bg-white/10";

  const sp = s?.page || {};
  const statusLabelF = s?.statusLabel?.[d.status || "prazna"]?.f || st.labelF || st.label;

  const historyList  = d.history || [];

  return (
    <div className="flex flex-col gap-4">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      {/* Kad je status "prazna" (Nije počet) kartica se vraća na neutralni izgled teme -
          nema tint boje, da ne ostane "boja od prije" kad se status resetuje. */}
      <div className={`rounded-2xl border p-4 sm:p-5 ${d.status && d.status !== "prazna" ? "" : tCard}`}
        style={d.status && d.status !== "prazna" ? {
          backgroundColor: statusCardBg(st.hex, isLight),
          borderColor: statusBorder(st.hex, isLight),
          borderLeft: `4px solid ${st.hex}`,
        } : undefined}>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div>
            <span className={`text-[10px] font-semibold uppercase tracking-wider block ${tMuted}`}>
              {sp.title || "Stranica mushafa"}
            </span>
            <span className={`font-black leading-none ${tText}`} style={{ fontSize: "clamp(44px,10vw,72px)" }}>
              {pageNum}
            </span>
          </div>
          <div className={`h-12 w-px hidden sm:block ${divider}`} />
          <div>
            <span className={`text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1.5 ${tMuted}`}>
              {sp.status || "Status"}
              {quickStatusSaving && (
                <span className="w-2.5 h-2.5 rounded-full border-2 border-[#1D9E75] border-t-transparent animate-spin" />
              )}
            </span>
            {onQuickStatus ? (
              <div className={quickStatusSaving ? "opacity-50 pointer-events-none" : ""}>
                <StatusPicker
                  layout="pills"
                  value={d.status || "prazna"}
                  onChange={onQuickStatus}
                  s={s}
                  isLight={isLight}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${st.dot}`} />
                <span className={`text-lg font-bold ${st.text}`}>{statusLabelF}</span>
              </div>
            )}
          </div>
          {d.difficulty && d.difficulty !== "srednja" && (
            <>
              <div className={`h-10 w-px hidden sm:block ${divider}`} />
              <div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider block mb-1.5 ${tMuted}`}>
                  {sp.difficultyLabel || "Težina"}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  d.difficulty === "laka"
                    ? "bg-[#1D9E75]/15 text-[#1D9E75] border-[#1D9E75]/30"
                    : "bg-[#F58C8C]/15 text-[#F58C8C] border-[#F58C8C]/30"
                }`}>
                  {d.difficulty === "laka"
                    ? (sp.difficultyEasy || "Laka")
                    : (sp.difficultyHard || "Teška")}
                </span>
              </div>
            </>
          )}
          {d.confidence > 0 && (
            <>
              <div className={`h-10 w-px hidden sm:block ${divider}`} />
              <div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider block mb-1.5 ${tMuted}`}>
                  {sp.confidence || "Sigurnost"}
                </span>
                <ConfidenceDots value={d.confidence} />
              </div>
            </>
          )}
          {d.repeatCount > 0 && (
            <>
              <div className={`h-10 w-px hidden sm:block ${divider}`} />
              <div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider block ${tMuted}`}>
                  {sp.repetitions || "Ponavljanja"}
                </span>
                <span className={`text-2xl font-black ${tText}`}>{d.repeatCount}</span>
              </div>
            </>
          )}
          {d.errors > 0 && (
            <>
              <div className={`h-10 w-px hidden sm:block ${divider}`} />
              <div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider block ${tMuted}`}>
                  {sp.errors || "Greške"}
                </span>
                <span className="text-2xl font-black text-[#F58C8C]">{d.errors}</span>
              </div>
            </>
          )}
        </div>

        {/* ── AJETI + REDOVI STATISTIKA ─────────────────────────────────────── */}
        {!loadingVerses && totalVerses > 0 && (
          <div className={`mt-4 pt-4 border-t ${isLight ? "border-black/8" : "border-white/[0.08]"}`}>
            <div className="flex flex-wrap gap-4 sm:gap-6">

              {/* Naučeni ajeti */}
              <div className="flex flex-col gap-0.5">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${tMuted}`}>
                  {sp.learnedVerses || "Naučenih ajeta"}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-xl font-black ${learnedVerses > 0 ? "text-[#49C79A]" : tMuted}`}>
                    {learnedVerses}
                  </span>
                  <span className={`text-xs font-semibold ${tMuted}`}>/ {totalVerses}</span>
                </div>
                {/* Mini progress bar ajeta */}
                <div className={`w-20 h-1 rounded-full mt-1 ${isLight ? "bg-black/10" : "bg-white/8"}`}>
                  <div className="h-full rounded-full bg-[#1D9E75] transition-all duration-500"
                    style={{ width: totalVerses > 0 ? `${Math.round((learnedVerses/totalVerses)*100)}%` : "0%" }} />
                </div>
              </div>

              <div className={`hidden sm:block h-10 w-px ${divider}`} />

              {/* Preostali ajeti */}
              <div className="flex flex-col gap-0.5">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${tMuted}`}>
                  {sp.remainingVerses || "Preostalo ajeta"}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-xl font-black ${remainingVerses === 0 ? "text-[#49C79A]" : (isLight ? "text-black/50" : "text-white/60")}`}>
                    {remainingVerses}
                  </span>
                  <span className={`text-xs font-semibold ${tMuted}`}>/ {totalVerses}</span>
                </div>
              </div>

              <div className={`hidden sm:block h-10 w-px ${divider}`} />

              {/* Naučeni redovi (~aprox.) */}
              <div className="flex flex-col gap-0.5">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${tMuted}`}>
                  {sp.learnedRows || "Naučenih redova"}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-xl font-black ${learnedRows > 0 ? "text-[#378ADD]" : tMuted}`}>
                    ~{learnedRows}
                  </span>
                  <span className={`text-xs font-semibold ${tMuted}`}>/ {rpp}</span>
                </div>
                {/* Mini progress bar redova */}
                <div className={`w-20 h-1 rounded-full mt-1 ${isLight ? "bg-black/10" : "bg-white/8"}`}>
                  <div className="h-full rounded-full bg-[#378ADD] transition-all duration-500"
                    style={{ width: `${Math.round((learnedRows/rpp)*100)}%` }} />
                </div>
                <span className={`text-[9px] mt-0.5 ${tMuted} opacity-50`}>{sp.approx || "aprox."}</span>
              </div>

              <div className={`hidden sm:block h-10 w-px ${divider}`} />

              {/* Preostali redovi (~aprox.) */}
              <div className="flex flex-col gap-0.5">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${tMuted}`}>
                  {sp.remainingRows || "Preostalo redova"}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-xl font-black ${remainingRows === 0 ? "text-[#49C79A]" : (isLight ? "text-black/50" : "text-white/60")}`}>
                    ~{remainingRows}
                  </span>
                  <span className={`text-xs font-semibold ${tMuted}`}>/ {rpp}</span>
                </div>
                <span className={`text-[9px] mt-0.5 ${tMuted} opacity-50`}>{sp.approx || "aprox."}</span>
              </div>

              {/* Format oznaka */}
              <div className="ml-auto flex items-end">
                <span className={`text-[9px] font-semibold px-2 py-1 rounded-full border ${isLight ? "border-black/10 text-black/30" : "border-white/10 text-white/25"}`}>
                  {sp.editionLabel
                    ? sp.editionLabel(rpp, rpp === 15 ? (s?.settings?.edition15 || "Medina") : rpp === 16 ? (s?.settings?.edition16 || "Turski") : (s?.settings?.edition13 || "Indo-Pak"))
                    : `${rpp}-red`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── EDIT ACCORDION (slot iz PageDetailView) ──────────────────────── */}
      {editSlot && editSlot}

      {/* ── AJETI (lijevo) + HISTORIJA (desno) ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Ajeti - 3/5 */}
        <div className={`lg:col-span-3 rounded-2xl border overflow-hidden ${tCard}`}>
          {verses?.length > 0 && (
            <div className="px-3 pt-3">
              <FirstTimeHint
                storageKey="tmizan_hint_verselist_seen"
                theme={theme}
                text="Klikni na ajet da ga proširiš — tu možeš odmah označiti status (Naučen/U toku/...) preko 'Status ajeta'. 'Vidi detalje' otvara bočni panel sa dodatnim opcijama (npr. greška na ajetu), a 'Otvori detalje' vodi na puni prikaz gdje u tabu 'Uredi' mijenjaš status, bilješke i historiju ponavljanja."
              />
            </div>
          )}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${tBorder}`}>
            <div>
              <h3 className={`text-sm font-bold ${tText}`}>{sp.versesOnPage || "Ajeti na stranici"}</h3>
              <p className={`text-[10px] mt-0.5 ${tSubtle}`}>{sp.clickForDetails || "Klikni ajet za detalje i praćenje"}</p>
            </div>
            {verses && (
              <span className={`text-xs font-bold ${tMuted}`}>
                {verses.length} {sp.versesLabel || "ajeta"}
              </span>
            )}
          </div>

          {loadingVerses && (
            <div className="flex items-center gap-2 py-10 justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-[#1D9E75] border-t-transparent animate-spin" />
              <span className={`text-sm ${tMuted}`}>{sp.loading || "Učitavanje..."}</span>
            </div>
          )}
          {!loadingVerses && verses?.length > 0 && (
            <div className="flex flex-col">
              {verses.map(v => (
                <VerseRowItem
                  key={v.verse_key} verse={v}
                  verseData={verseStatuses?.[v.verse_key]}
                  onOpen={() => onOpenVerse(v)}
                  onViewDetails={onViewVerseDetails}
                  onQuickStatus={(verseKey, newStatus) => {
                    const prev = verseStatuses?.[verseKey] || {};
                    onSaveVerse?.(verseKey, {
                      ...prev,
                      status: newStatus,
                      startDate: (!prev.startDate && newStatus !== "prazna") ? todayStr() : prev.startDate,
                    }, pageNum);
                  }}
                  theme={theme} s={s}
                />
              ))}
            </div>
          )}
          {!loadingVerses && verses?.length === 0 && (
            <p className={`text-xs text-center py-8 ${tSubtle}`}>{sp.noVerses || "Nema ajeta za ovu stranicu"}</p>
          )}
        </div>

        {/* Historija ponavljanja - 2/5, timeline */}
        <div className={`lg:col-span-2 rounded-2xl border p-4 ${tCard}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-[10px] font-semibold uppercase tracking-widest ${tSubtle}`}>
              {sp.repeatHistory || "Historija ponavljanja"}
            </h3>
            {historyList.length > 0 && (
              <span className="text-xs font-bold text-[#378ADD]">{historyList.length}×</span>
            )}
          </div>

          {historyList.length === 0 ? (
            <p className={`text-sm ${tSubtle}`}>{sp.noHistory || "Nema zabilježenih ponavljanja."}</p>
          ) : (
            <div className="relative pl-5">
              {/* Vertikalna linija */}
              <div className={`absolute left-[5px] top-1 bottom-1 w-px ${isLight ? "bg-black/10" : "bg-white/10"}`} />

              <div className={`flex flex-col gap-4 ${historyList.length > 10 ? "max-h-[420px] overflow-y-auto pr-1" : ""}`}>
                {historyList.map((h, i) => (
                  <div key={h.id} className="relative">
                    <div className={`absolute -left-[19px] top-[5px] w-2.5 h-2.5 rounded-full z-10
                      ${h.errors > 0
                        ? "bg-[#F58C8C]"
                        : i === 0
                          ? "bg-[#1D9E75]"
                          : isLight ? "bg-[#C8BCAC]" : "bg-[#444]"
                      }`}
                    />
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold leading-none ${tText}`}>{fmtDateTime(h.date)}</p>
                        {h.note && <p className={`text-xs mt-1.5 leading-snug ${tMuted}`}>{h.note}</p>}
                      </div>
                      {h.errors > 0 && (
                        <span className="text-xs font-semibold text-[#F58C8C] flex-shrink-0 mt-0.5">⚠ {h.errors}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kratka napomena i bilješka (ako postoje) */}
          {(d.shortNote || d.notes) && (
            <div className={`mt-5 pt-4 border-t ${tBorder} flex flex-col gap-2`}>
              <p className={`text-[10px] font-semibold uppercase tracking-widest ${tSubtle}`}>
                {sp.notes || "Bilješka"}
              </p>
              {d.shortNote && (
                <p className={`text-sm font-medium ${tText}`}>{d.shortNote}</p>
              )}
              {d.notes && (
                <p className={`text-xs leading-relaxed whitespace-pre-wrap ${tMuted}`}>{d.notes}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
