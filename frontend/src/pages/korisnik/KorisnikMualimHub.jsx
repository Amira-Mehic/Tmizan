// ============================================================================
// Mualim hub - sve što dolazi od mualima na jednom mjestu, odvojeno od
// ličnog dijela Dashboarda: "Zadaci i planovi" (mualimov plan ponavljanja,
// zadaci) i "Poruke" (razgovor, zahtjev za preslušavanje,
// oglasna ploča, nadolazeći časovi).
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";
import { useLang } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/SupaBaseClient";
import {
  fetchStudentTasks, fetchStudentAnnouncements, fetchStudentSessions, completeTask,
  fetchActiveReviewPlan, markPlanDayDone,
  fetchConversation, sendMessage,
} from "../../services/mualimService";
import BackButton from "../../components/shared/BackButton";
import { SessionCardStudent } from "./KorisnikDashboard";
import { todayStr } from "../../constants/hifz/helpers";
import GuidedTour from "../../components/shared/GuidedTour";
import { PageTourButton } from "../../components/shared/PageTourButton";
import { usePageTour } from "../../hooks/usePageTour";
import { MUALIM_HUB_TOUR } from "../../constants/tours/mualimHubTour";
import HelpTip from "../../components/shared/HelpTip";

export default function KorisnikMualimHub() {
  const { t } = useTranslation();
  const { theme, sectionAccents: SECTION_ACCENTS } = useTheme();
  const { lang } = useLang();
  const { user } = useAuth();
  const userId = user?.id;

  const [tab, setTab] = useState("zadaci");
  const [loading, setLoading] = useState(true);
  const [mojMualim, setMojMualim] = useState(null); // { id, full_name }
  const [mualimPlan, setMualimPlan] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [conversation, setConversation] = useState([]);
  const tour = usePageTour("mualim-hub", MUALIM_HUB_TOUR);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const safe = async (fn, fb) => { try { return await fn(); } catch { return fb; } };

    // .maybeSingle() bi pukao (i tiho pao u fallback) ako je učenik prihvaćen
    // kod više od jednog mualima - uzmi najnoviju prihvaćenu vezu.
    const veza = await safe(async () => {
      const { data } = await supabase.from("mualim_students").select("mualim_id, decided_at")
        .eq("student_id", userId).eq("status", "prihvacen")
        .order("decided_at", { ascending: false }).limit(1);
      return data?.[0] || null;
    }, null);

    let mualim = null;
    if (veza?.mualim_id) {
      const prof = await safe(async () => {
        const { data } = await supabase.from("profiles").select("id, full_name").eq("id", veza.mualim_id).maybeSingle();
        return data;
      }, null);
      mualim = prof ? { id: prof.id, full_name: prof.full_name } : { id: veza.mualim_id, full_name: null };
    }
    setMojMualim(mualim);

    const [mp, tk, ann, ses, conv] = await Promise.all([
      safe(() => fetchActiveReviewPlan(userId), null),
      safe(() => fetchStudentTasks(userId), []),
      safe(() => fetchStudentAnnouncements(), []),
      safe(() => fetchStudentSessions(userId), []),
      mualim ? safe(() => fetchConversation(userId, mualim.id), []) : Promise.resolve([]),
    ]);
    setMualimPlan(mp); setTasks(tk); setAnnouncements(ann); setSessions(ses); setConversation(conv);
    setLoading(false);
  }, [userId]);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  return (
    <div className={`min-h-screen ${theme.text} px-4 py-6 sm:px-6 lg:px-10`}>
      <GuidedTour steps={tour.steps} active={tour.active} onFinish={tour.finish} theme={theme} lang={tour.lang} dismissible />
      <div className="max-w-4xl mx-auto space-y-5">
        <BackButton />
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold flex items-center">
            🧑‍🏫 {t("mualimHub.title")}
            <PageTourButton onClick={tour.start} />
          </h1>
          <p className={`${theme.muted} text-sm mt-1`}>
            {mojMualim?.full_name ? `${t("mualimHub.subtitle")} — ${mojMualim.full_name}` : t("mualimHub.subtitle")}
          </p>
        </div>

        {loading ? (
          <p className={theme.muted}>…</p>
        ) : !mojMualim ? (
          <div className={`${theme.card} rounded-2xl p-6 text-center space-y-3`}>
            <p className={theme.muted}>{t("mualimHub.noMualim")}</p>
            <Link to="/korisnik/mualimi" className={`${theme.button} inline-block rounded-xl px-4 py-2 text-sm font-semibold`}>
              {t("mualimHub.findMualim")}
            </Link>
          </div>
        ) : (
          <>
            {/* Tabovi */}
            <div data-tour="tour-mualimhub-tabs" className="flex items-center gap-1 border-b border-black/10">
              {[
                { id: "zadaci", label: t("mualimHub.tabTasks"), icon: "📋",
                  help: lang === "en" ? "Your muallim's review plan and tasks assigned to you." : "Mualimov plan ponavljanja i zadaci koje ti je zadao." },
                { id: "poruke", label: t("mualimHub.tabMessages"), icon: "💬",
                  help: lang === "en" ? "Chat with your muallim, request a recitation slot, and see announcements/sessions." : "Razgovor s mualimom, zahtjev za termin preslušavanja, i pregled obavijesti/časova." },
              ].map((tb) => (
                <span key={tb.id} className="flex items-center">
                  <button
                    onClick={() => setTab(tb.id)}
                    className={`px-3 sm:px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                      tab === tb.id ? `border-current ${theme.accent}` : `border-transparent ${theme.muted} hover:opacity-70`
                    }`}
                  >
                    {tb.icon} {tb.label}
                  </button>
                  <HelpTip text={tb.help} />
                </span>
              ))}
            </div>

            {tab === "zadaci" && (
              <TasksTab
                theme={theme} SECTION_ACCENTS={SECTION_ACCENTS} t={t} lang={lang} userId={userId}
                mualimPlan={mualimPlan} setMualimPlan={setMualimPlan}
                tasks={tasks} setTasks={setTasks}
              />
            )}

            {tab === "poruke" && (
              <MessagesTab
                theme={theme} SECTION_ACCENTS={SECTION_ACCENTS} t={t} lang={lang} userId={userId} mojMualim={mojMualim}
                conversation={conversation} setConversation={setConversation}
                announcements={announcements} sessions={sessions}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── TAB: Zadaci i planovi ───────────────────────────────────────────────────
function TasksTab({ theme, SECTION_ACCENTS, t, lang, userId, mualimPlan, setMualimPlan, tasks, setTasks }) {
  // Podrazumijevano samo DANAŠNJI dani mualimovog plana (isti obrazac kao na
  // Dashboardu - "vidi više" razvija na cijeli plan, ne bacaj sve odjednom)
  const [showAllMualimDays, setShowAllMualimDays] = useState(false);
  const today = todayStr();
  const allDays = mualimPlan?.days || [];
  const todayDays = allDays.filter((d) => d.dan_datum === today);
  const visibleDays = showAllMualimDays ? allDays : todayDays;

  return (
    <div className="space-y-4">
      {/* Plan ponavljanja od mualima */}
      <div className={`${SECTION_ACCENTS.mualim.wash} border-l-4 ${SECTION_ACCENTS.mualim.border} rounded-2xl p-4`}>
        <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 ${SECTION_ACCENTS.mualim.chip}`}>
          {t("dashboard.mualimSectionChip")}
        </span>
        <h2 className="font-heading font-bold mb-2 flex items-center">
          📅 {t("mualimHub.planTitle")}
          <HelpTip text={lang === "en"
            ? "Days your muallim planned for you. Tap the button to mark a day done — your muallim can see that too."
            : "Dani koje ti je mualim isplanirao. Klikni dugme da označiš dan urađenim — to vidi i tvoj mualim."} />
        </h2>
        {!mualimPlan ? (
          <p className={`text-sm ${theme.muted}`}>{t("dashboard.noMualimPlan")}</p>
        ) : (
          <>
            {mualimPlan.naslov && <p className="text-sm font-medium mb-1">{mualimPlan.naslov}</p>}
            {mualimPlan.komentar && <p className={`text-xs mb-2 ${theme.accent}`}>💬 {mualimPlan.komentar}</p>}
            {visibleDays.length === 0 && !showAllMualimDays && (
              <p className={`text-xs mb-1.5 ${theme.muted}`}>{t("dashboard.noMualimPlanToday")}</p>
            )}
            <ul className="space-y-1.5">
              {visibleDays.map((d) => (
                <li key={d.id} className={`${SECTION_ACCENTS.mualim.item} rounded-xl px-3 py-2 text-sm flex items-center justify-between gap-2`}>
                  <span>
                    <span className={`text-[10px] uppercase mr-2 px-1.5 py-0.5 rounded-full ${d.vrsta === "ucenje" ? SECTION_ACCENTS.personal.chip : SECTION_ACCENTS.review.chip}`}>
                      {d.vrsta === "ucenje" ? t("dashboard.todayLearning").replace("📖 ", "") : t("dashboard.todayReview").replace("🔁 ", "")}
                    </span>
                    {d.opis} <span className={`text-xs ${theme.muted}`}>· {d.dan_datum}</span>
                  </span>
                  <button
                    onClick={async () => {
                      try {
                        await markPlanDayDone(d.id, !d.done);
                        setMualimPlan((p) => ({ ...p, days: p.days.map((x) => (x.id === d.id ? { ...x, done: !x.done } : x)) }));
                      } catch { /* */ }
                    }}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-xs ${d.done ? "bg-green-600 text-white" : `${theme.card} ${theme.muted}`}`}>
                    {d.done ? "✓" : t("dashboard.markDone")}
                  </button>
                </li>
              ))}
            </ul>
            {allDays.length > todayDays.length && (
              <button
                onClick={() => setShowAllMualimDays((v) => !v)}
                className={`mt-2 text-xs font-medium ${theme.accent}`}>
                {showAllMualimDays ? `▲ ${t("dashboard.mualimPlanCollapse")}` : `▼ ${t("dashboard.mualimPlanExpand")}`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Zadaci */}
      <div className={`${SECTION_ACCENTS.tasks.wash} border-l-4 ${SECTION_ACCENTS.tasks.border} rounded-2xl p-4`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="font-heading font-bold">📋 {t("mualimHub.taskListTitle")}</h2>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${SECTION_ACCENTS.tasks.chip}`}>
            {t("dashboard.mualimTaskBadge")}
          </span>
        </div>
        {tasks.length === 0 ? (
          <p className={`text-sm ${theme.muted}`}>{t("dashboard.noTasks")}</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className={`${SECTION_ACCENTS.tasks.item} rounded-xl p-3 text-sm`}>
                <div>{task.opis}</div>
                {task.rok && <div className={`text-xs ${theme.muted} mt-1`}>{t("dashboard.deadline")}: {task.rok}</div>}
                {task.komentar && <div className={`text-xs ${theme.accent} mt-1`}>💬 {task.komentar}</div>}
                <button
                  onClick={async () => {
                    await completeTask(task.id);
                    try {
                      await sendMessage(userId, task.mualim_id, `✅ ${t("dashboard.taskDoneMsg")}: "${task.opis}"`, { contextType: "zadatak", contextRef: task.id });
                    } catch { /* poruka je bonus */ }
                    setTasks((p) => p.filter((x) => x.id !== task.id));
                  }}
                  className={`${theme.button} rounded-lg text-xs px-3 py-1 mt-2`}
                >
                  {t("dashboard.markDone")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── TAB: Poruke ──────────────────────────────────────────────────────────────
function MessagesTab({ theme, SECTION_ACCENTS, t, lang, userId, mojMualim, conversation, setConversation, announcements, sessions }) {
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [reviewNote, setReviewNote] = useState("");
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);

  const send = async () => {
    if (!msgText.trim()) return;
    setSending(true);
    try {
      await sendMessage(userId, mojMualim.id, msgText.trim());
      setConversation((c) => [...c, { id: Date.now(), sender_id: userId, body: msgText.trim(), created_at: new Date().toISOString() }]);
      setMsgText(""); setSent(true); setTimeout(() => setSent(false), 2000);
    } catch { /* */ }
    setSending(false);
  };

  const requestReview = async () => {
    setReviewSending(true);
    try {
      const body = reviewNote.trim() ? `🎤 ${t("mualimHub.requestReviewBtn")}: ${reviewNote.trim()}` : `🎤 ${t("mualimHub.requestReviewBtn")}`;
      await sendMessage(userId, mojMualim.id, body, { contextType: "preslusavanje_zahtjev" });
      setConversation((c) => [...c, { id: Date.now(), sender_id: userId, body, created_at: new Date().toISOString() }]);
      setReviewNote(""); setReviewSent(true); setTimeout(() => setReviewSent(false), 2500);
    } catch { /* */ }
    setReviewSending(false);
  };

  return (
    <div className="space-y-4">
      {/* Razgovor + kompozitor */}
      <div className={`${SECTION_ACCENTS.messages.wash} border-l-4 ${SECTION_ACCENTS.messages.border} rounded-2xl p-4`}>
        <h2 className="font-heading font-bold mb-2">💬 {t("mualimHub.conversationTitle")}</h2>
        <div className="max-h-64 overflow-y-auto space-y-1.5 mb-3">
          {conversation.length === 0 ? (
            <p className={`text-sm ${theme.muted}`}>{t("mualimHub.noConversation")}</p>
          ) : (
            conversation.map((m) => (
              <div
                key={m.id}
                className={`text-sm px-3 py-1.5 rounded-xl max-w-[85%] ${m.sender_id === userId ? `${theme.button} ml-auto` : SECTION_ACCENTS.messages.item}`}
              >
                {m.body}
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={msgText} onChange={(e) => setMsgText(e.target.value)}
            placeholder={t("mualimHub.messagePlaceholder")}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            className={`flex-1 ${SECTION_ACCENTS.messages.item} rounded-xl px-3 py-2 text-sm outline-none`}
          />
          <button onClick={send} disabled={sending} className={`${theme.button} rounded-xl px-4 py-2 text-sm disabled:opacity-50`}>
            {sending ? "…" : t("mualimHub.sendBtn")}
          </button>
        </div>
        {sent && <p className="text-xs text-green-500 mt-1">{t("mualimHub.messageSent")}</p>}
      </div>

      {/* Zahtjev za preslušavanje */}
      <div className={`${SECTION_ACCENTS.review.wash} border-l-4 ${SECTION_ACCENTS.review.border} rounded-2xl p-4`}>
        <h2 className="font-heading font-bold mb-1">🎤 {t("mualimHub.requestReviewTitle")}</h2>
        <p className={`text-xs mb-3 ${theme.muted}`}>{t("mualimHub.requestReviewHint")}</p>
        <div className="flex gap-2 flex-wrap">
          <input
            value={reviewNote} onChange={(e) => setReviewNote(e.target.value)}
            placeholder={t("mualimHub.reviewNotePlaceholder")}
            className={`flex-1 min-w-[200px] ${SECTION_ACCENTS.review.item} rounded-xl px-3 py-2 text-sm outline-none`}
          />
          <button onClick={requestReview} disabled={reviewSending} className={`${theme.button} rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50 shrink-0`}>
            {reviewSending ? "…" : t("mualimHub.requestReviewBtn")}
          </button>
        </div>
        {reviewSent && <p className="text-xs text-green-500 mt-1.5">{t("mualimHub.requestSent")}</p>}
      </div>

      {/* Oglasna ploča + časovi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${theme.card} rounded-2xl p-4`}>
          <h2 className="font-heading font-bold mb-2">📢 {t("mualimHub.announcementsTitle")}</h2>
          {announcements.length === 0 ? (
            <p className={`text-sm ${theme.muted}`}>{t("dashboard.noAnnouncements")}</p>
          ) : (
            <ul className="space-y-2">
              {announcements.map((a) => (
                <li key={a.id} className={`${theme.cardSub} rounded-xl p-3 text-sm`}>
                  {a.body}
                  <span className={`block text-[10px] mt-1 ${theme.muted}`}>
                    — {a.author_role === "moderator" ? t("dashboard.byModerator") : t("dashboard.byMualim")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={`${theme.card} rounded-2xl p-4`}>
          <h2 className="font-heading font-bold mb-2">🎥 {t("mualimHub.sessionsTitle")}</h2>
          {sessions.length === 0 ? (
            <p className={`text-sm ${theme.muted}`}>{t("dashboard.noSessions")}</p>
          ) : (
            <ul className="space-y-2">
              {sessions.map((sn) => (
                <SessionCardStudent key={sn.id} sn={sn} theme={theme} t={t} lang={lang} userId={userId} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
