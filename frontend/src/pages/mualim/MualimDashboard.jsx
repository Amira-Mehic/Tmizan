// ============================================================================
// Muallim panel - kontrolna tabla (mobile-first, prati aktivnu temu)
//
// Tabovi: Učenici (napredak + mapa grešaka + zadaci + poruke),
//         Zahtjevi, Sesije (zakazivanje preslušavanja/časova),
//         Oglasna ploča.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";
import { useLang } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import HelpTip from "../../components/shared/HelpTip";
import GuidedTour from "../../components/shared/GuidedTour";
import { PageTourButton } from "../../components/shared/PageTourButton";
import { MUALIM_TOUR } from "../../constants/tours/mualimTour";
import {
  fetchStudents, decideConnection, fetchStudentProgress,
  fetchSessions, createSession, updateSession, saveAttendance,
  fetchAnnouncements, postAnnouncement,
  fetchTasks, createTask,
  fetchConversation, sendMessage,
  createReviewPlan,
} from "../../services/mualimService";
import { supabase } from "../../services/SupaBaseClient";
import { todayStr } from "../../constants/hifz/helpers";
import { createPlan as halkaCreatePlan, markPrepared as halkaMarkPrepared, mentorReview as halkaMentorReview, currentPart as halkaCurrentPart, progressPercent as halkaPercent } from "../../features/talim/halka";
import BackButton from "../../components/shared/BackButton";

export default function MualimDashboard() {
  const { t } = useTranslation();
  const { theme, sectionAccents: SECTION_ACCENTS } = useTheme();
  const { lang } = useLang();
  const { user } = useAuth();
  const mualimId = user?.id;
  const [manualTour, setManualTour] = useState(false);

  // Podržava dolazak s druge stranice (npr. Zahtjevi za preslušavanje) koja
  // preko navigate(..., { state: { tab: 'sesije', studentId } }) želi
  // direktno otvoriti tab Sesije s već izabranim učenikom u formi.
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.tab || "ucenici");
  const prefillStudentId = location.state?.studentId || null;
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mualimCode, setMualimCode] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const reload = useCallback(async () => {
    if (!mualimId) return;
    const safe = async (fn, fb) => { try { return await fn(); } catch { return fb; } };
    const [st, ses, ann, prof] = await Promise.all([
      safe(() => fetchStudents(mualimId), []),
      safe(() => fetchSessions(mualimId), []),
      safe(() => fetchAnnouncements(mualimId), []),
      safe(async () => {
        const { data } = await supabase.from("profiles").select("mualim_code").eq("id", mualimId).maybeSingle();
        return data;
      }, null),
    ]);
    setStudents(st); setSessions(ses); setAnnouncements(ann);
    if (prof?.mualim_code) {
      setMualimCode(prof.mualim_code);
    } else {
      // isti fallback kao Profil.jsx - generiše kod ako je dodjela uloge
      // preskočila trigger (0018) koji ga inače postavlja automatski
      safe(async () => {
        const { data } = await supabase.rpc("ensure_my_mualim_code");
        if (data) setMualimCode(data);
      }, null);
    }
    setLoading(false);
  }, [mualimId]);

  // reload() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { reload(); }, [reload]);

  const accepted = students.filter((s) => s.status === "prihvacen");
  const pending = students.filter((s) => s.status === "na_cekanju");

  const TABS = [
    { id: "ucenici", label: t("mualim.tabStudents"), badge: accepted.length,
      help: lang === "en" ? "Overview per student: progress, weak spots, tasks, and messages." : "Pregled po učeniku: napredak, slaba mjesta, zadaci i poruke." },
    { id: "zahtjevi", label: t("mualim.tabRequests"), badge: pending.length,
      help: lang === "en" ? "New students who want to connect with you — accept or reject them here." : "Novi učenici koji se žele povezati s tobom — ovdje ih prihvataš ili odbijaš." },
    { id: "sesije", label: t("mualim.tabSessions"), badge: sessions.length,
      help: lang === "en" ? "Schedule recitation/class sessions, track attendance and excuses." : "Zakazivanje sesija preslušavanja/časova, evidencija prisustva i opravdanja." },
    { id: "halka_ucenje", label: t("mualim.tabHalkaLearning"), badge: null,
      help: lang === "en" ? "Halaqa method: assign parts, student prepares, you listen and unlock the next." : "Halka metoda: zadaješ dijelove, učenik priprema, ti preslušavaš i otključavaš sljedeći." },
    { id: "plan", label: t("mualim.tabPlan"), badge: null,
      help: lang === "en" ? "Create a weekly learning & review plan here — as soon as you save it, it's automatically assigned to the student." : "Ovdje praviš sedmični plan učenja i ponavljanja — čim ga sačuvaš, automatski se dodjeljuje učeniku." },
    { id: "ploca", label: t("mualim.tabBoard"), badge: null,
      help: lang === "en" ? "Announcements, motivation, and praise sent to a specific student." : "Obavijesti, motivacija i pohvale — šalju se konkretnom učeniku." },
  ];

  return (
    <div className={`min-h-screen ${theme.text} px-4 py-6 sm:px-6 lg:px-10`}>
      <GuidedTour steps={MUALIM_TOUR[lang] || MUALIM_TOUR.bs} active={manualTour} onFinish={() => setManualTour(false)} theme={theme} lang={lang} dismissible />
      <div className="max-w-5xl mx-auto space-y-5">
        <BackButton />
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold flex items-center">
            {t("mualim.title")}
            <HelpTip text={lang === "en"
              ? "Manage your students here: their progress and mistakes, tasks, review requests, sessions, and the board. Use the tabs above to switch sections."
              : "Ovdje upravljaš svojim učenicima: njihov napredak i greške, zadaci, zahtjevi za preslušavanje, sesije i oglasna ploča. Koristi tabove iznad za prebacivanje sekcija."} />
            <PageTourButton onClick={() => setManualTour(true)} />
          </h1>
          <p className={`${theme.muted} text-sm mt-1`}>{t("mualim.subtitle")}</p>
        </div>

        {/* Privatni mualim kod - vidljiv SAMO njemu, dijeli ga lično sa
            učenikom koji traži ručno uparivanje suprotnog roda. */}
        {mualimCode && (
          <div className={`${theme.card} rounded-2xl p-4 border-l-4 ${SECTION_ACCENTS.mualim.border} flex items-center justify-between gap-3 flex-wrap`}>
            <div>
              <p className="text-sm font-semibold">{t("mualim.codeTitle")}</p>
              <p className={`text-xs ${theme.muted} mt-0.5`}>{t("mualim.codeHint")}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg tracking-widest px-3 py-1.5 rounded-xl bg-black/5">{mualimCode}</span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(mualimCode);
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 1500);
                }}
                className={`${theme.button} rounded-xl px-3 py-1.5 text-xs`}
              >
                {codeCopied ? t("mualim.codeCopied") : t("mualim.codeCopy")}
              </button>
            </div>
          </div>
        )}

        {/* Tabovi - underline stil, horizontalno skrolabilni na mobitelu */}
        <div className="flex gap-0.5 overflow-x-auto border-b border-black/10 pb-px">
          {TABS.map((tb) => (
            <div key={tb.id} data-tour={`tour-mualimdash-tab-${tb.id}`} className="flex items-center shrink-0">
              <button
                onClick={() => setTab(tb.id)}
                className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition ${
                  tab === tb.id ? `${theme.accent} border-current font-semibold` : `${theme.muted} border-transparent`
                }`}
              >
                {tb.label}{tb.badge ? ` (${tb.badge})` : ""}
              </button>
              <HelpTip text={tb.help} />
            </div>
          ))}
        </div>

        {loading ? (
          <p className={theme.muted}>…</p>
        ) : (
          <>
            {tab === "ucenici" && <StudentsTab theme={theme} t={t} students={accepted} mualimId={mualimId} />}
            {tab === "zahtjevi" && <RequestsTab theme={theme} t={t} pending={pending} onDecide={reload} />}
            {tab === "sesije" && <SessionsTab theme={theme} t={t} sessions={sessions} students={accepted} mualimId={mualimId} onChange={reload} prefillStudentId={prefillStudentId} />}
            {tab === "halka_ucenje" && <HalkaLearningTab theme={theme} t={t} students={accepted} />}
            {tab === "plan" && <ReviewPlanTab theme={theme} t={t} students={accepted} mualimId={mualimId} />}
            {tab === "ploca" && <BoardTab theme={theme} t={t} announcements={announcements} students={accepted} mualimId={mualimId} onChange={reload} />}
          </>
        )}
      </div>
    </div>
  );
}

/* ── UČENICI: napredak, mapa grešaka, zadaci, poruke ─────────────────────── */
function StudentsTab({ theme, t, students, mualimId }) {
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [taskText, setTaskText] = useState("");
  const [taskRok, setTaskRok] = useState("");
  const [msgText, setMsgText] = useState("");
  const [conversation, setConversation] = useState([]);
  const [studentTasks, setStudentTasks] = useState([]);
  const [msgDateFilter, setMsgDateFilter] = useState("");

  const open = async (s) => {
    if (openId === s.student_id) { setOpenId(null); return; }
    setOpenId(s.student_id);
    setDetail(null);
    try {
      const [prog, conv, tks] = await Promise.all([
        fetchStudentProgress(s.student_id),
        fetchConversation(mualimId, s.student_id),
        fetchTasks(mualimId, s.student_id),
      ]);
      setDetail(prog); setConversation(conv); setStudentTasks(tks);
    } catch { setDetail({ pages: [], weakSpots: [] }); }
  };

  // poruke filtrirane po datumu (pretraga historije razgovora)
  const visibleMessages = msgDateFilter
    ? conversation.filter((m) => (m.created_at || "").startsWith(msgDateFilter))
    : conversation;

  if (students.length === 0) return <p className={theme.muted}>{t("mualim.noStudents")}</p>;

  return (
    <div className="space-y-3">
      {students.map((s) => {
        const naucene = detail?.pages?.filter((p) => ["naucen", "savladano", "ponavljanje"].includes(p.status)).length || 0;
        return (
          <div key={s.id} className={`${theme.card} rounded-2xl overflow-hidden`}>
            <button onClick={() => open(s)} className="w-full flex items-center justify-between p-4 text-left">
              <span className="font-medium">{s.student?.full_name || t("mualim.student")}</span>
              <span className={`text-sm ${theme.muted}`}>{openId === s.student_id ? "▲" : "▼"}</span>
            </button>

            {openId === s.student_id && (
              <div className="px-4 pb-4 space-y-4">
                {!detail ? (
                  <p className={theme.muted}>…</p>
                ) : (
                  <>
                    {/* Napredak */}
                    <div className={`${theme.cardSub} rounded-xl p-3 text-sm`}>
                      📚 {t("mualim.learnedPages", { count: naucene })}
                    </div>

                    {/* Mapa slabih mjesta */}
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center">
                        ⚠️ {t("mualim.weakSpots")}
                        <HelpTip text="Boja pokazuje ozbiljnost: sivo = 0 grešaka zabilježeno, žuto = 1-2 greške, crveno = 3 ili više. Ovo se puni automatski iz označavanja grešaka na ajetima/stranicama kod učenika." />
                      </h3>
                      {detail.weakSpots.length === 0 ? (
                        <p className={`text-sm ${theme.muted}`}>{t("mualim.noWeakSpots")}</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {detail.weakSpots.slice(0, 12).map((w) => (
                            <span
                              key={w.id}
                              className={`text-xs px-2.5 py-1 rounded-full text-white ${
                                w.errors >= 3 ? "bg-red-600" : w.errors >= 1 ? "bg-yellow-600" : "bg-gray-500"
                              }`}
                              title={w.note || ""}
                            >
                              {w.ref_type === "page" ? `${t("mualim.page")} ${w.ref}` : w.ref} · {w.errors}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Zadaci učenika - s oznakom propuštenog roka */}
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-semibold">🗂 {t("mualim.taskList")}</h3>
                      {studentTasks.length === 0 ? (
                        <p className={`text-sm ${theme.muted}`}>{t("mualim.noTasksForStudent")}</p>
                      ) : (
                        studentTasks.slice(0, 5).map((tk) => {
                          const propusten = tk.status === "otvoren" && tk.rok && tk.rok < todayStr();
                          return (
                            <div key={tk.id} className={`${theme.cardSub} rounded-xl px-3 py-2 text-xs flex items-center justify-between gap-2`}>
                              <span className="truncate">{tk.opis}{tk.rok ? ` (${tk.rok})` : ""}</span>
                              <span className={`shrink-0 px-2 py-0.5 rounded-full text-white ${
                                tk.status === "zavrsen" ? "bg-green-600" : propusten ? "bg-red-600" : "bg-amber-500"}`}>
                                {tk.status === "zavrsen" ? t("mualim.taskDone") : propusten ? t("mualim.taskMissed") : t("mualim.taskOpen")}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Novi zadatak */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold flex items-center">
                        📋 {t("mualim.newTask")}
                        <HelpTip text="Zadatak se odmah pojavljuje kod učenika. Rok je opcionalan — ako prođe rok bez da je učenik označi kao završen, automatski se prikazuje kao 'propušten'." />
                      </h3>
                      <input
                        value={taskText} onChange={(e) => setTaskText(e.target.value)}
                        placeholder={t("mualim.taskPlaceholder")}
                        className={`w-full ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`}
                      />
                      <div className="flex gap-2">
                        <input
                          type="date" value={taskRok} onChange={(e) => setTaskRok(e.target.value)}
                          className={`${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`}
                        />
                        <button
                          onClick={async () => {
                            if (!taskText.trim()) return;
                            await createTask(mualimId, s.student_id, { opis: taskText, rok: taskRok || null });
                            setTaskText(""); setTaskRok("");
                          }}
                          className={`${theme.button} rounded-xl px-4 py-2 text-sm`}
                        >
                          {t("mualim.assign")}
                        </button>
                      </div>
                    </div>

                    {/* Poruke - pretraživo po datumu */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">💬 {t("mualim.messages")}</h3>
                        <input type="date" value={msgDateFilter} onChange={(e) => setMsgDateFilter(e.target.value)}
                          title={t("mualim.searchByDate")}
                          className={`${theme.cardSub} rounded-lg px-2 py-1 text-xs outline-none`} />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1.5">
                        {visibleMessages.map((m) => (
                          <div
                            key={m.id}
                            className={`text-sm px-3 py-1.5 rounded-xl max-w-[85%] ${
                              m.sender_id === mualimId ? `${theme.button} ml-auto` : theme.cardSub
                            }`}
                          >
                            {m.body}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={msgText} onChange={(e) => setMsgText(e.target.value)}
                          placeholder={t("mualim.messagePlaceholder")}
                          className={`flex-1 ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`}
                        />
                        <button
                          onClick={async () => {
                            if (!msgText.trim()) return;
                            await sendMessage(mualimId, s.student_id, msgText);
                            setConversation((c) => [...c, { id: Date.now(), sender_id: mualimId, body: msgText }]);
                            setMsgText("");
                          }}
                          className={`${theme.button} rounded-xl px-4 py-2 text-sm`}
                        >
                          ➤
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── ZAHTJEVI ────────────────────────────────────────────────────────────── */
function RequestsTab({ theme, t, pending, onDecide }) {
  if (pending.length === 0) return <p className={theme.muted}>{t("mualim.noRequests")}</p>;
  return (
    <div className="space-y-3">
      <p className={`text-xs flex items-center ${theme.muted}`}>
        {t("mualim.tabRequests")}
        <HelpTip text="Ovo su učenici koji su se povezali s tobom preko tvog mualim koda i čekaju odobrenje. 'Prihvati' ih dodaje u listu Učenici, 'Odbij' briše zahtjev." />
      </p>
      {pending.map((r) => (
        <div key={r.id} className={`${theme.card} rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap`}>
          <span className="font-medium">{r.student?.full_name || t("mualim.student")}</span>
          <div className="flex gap-2">
            <button onClick={async () => { await decideConnection(r.id, true); onDecide(); }} className={`${theme.button} rounded-xl px-4 py-2 text-sm`}>
              ✓ {t("mualim.accept")}
            </button>
            <button onClick={async () => { await decideConnection(r.id, false); onDecide(); }} className={`${theme.cardSub} rounded-xl px-4 py-2 text-sm`}>
              ✕ {t("mualim.reject")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── SESIJE: zakazivanje preslušavanja / časova ─────────────────────────── */
function SessionsTab({ theme, t, sessions, students, mualimId, onChange, prefillStudentId }) {
  const [form, setForm] = useState({
    naslov: "", startsAt: "", link: "", smjernice: "", nacin: "online", lokacija: "",
    target: prefillStudentId || "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.naslov.trim() || !form.startsAt) return;
    await createSession(mualimId, {
      naslov: form.naslov,
      startsAt: new Date(form.startsAt).toISOString(),
      link: form.link,
      smjernice: form.smjernice,
      studentId: form.target || null,
      nacin: form.nacin,
      lokacija: form.nacin === "uzivo" ? form.lokacija : "",
      vanredni: true,
    });
    setForm({ naslov: "", startsAt: "", link: "", smjernice: "", target: "", nacin: "online", lokacija: "" });
    onChange();
  };

  return (
    <div className="space-y-4">
      {/* Nova sesija */}
      <div className={`${theme.card} rounded-2xl p-4 space-y-2`}>
        <h3 className="font-semibold flex items-center">
          🎥 {t("mualim.newSession")}
          <HelpTip text="'Online' traži link (Zoom/Teams/Discord/Viber/WhatsApp), 'Uživo' traži lokaciju umjesto linka. Ako ne izabereš učenika, sesija je otvorena za sve tvoje učenike." />
        </h3>
        {prefillStudentId && (
          <p className={`text-xs ${theme.accent}`}>
            🎤 {t("mualim.schedulingFor", { name: students.find((s) => s.student_id === prefillStudentId)?.student?.full_name || "" })}
          </p>
        )}
        <input value={form.naslov} onChange={set("naslov")} placeholder={t("mualim.sessionTitle")}
          className={`w-full ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input type="datetime-local" value={form.startsAt} onChange={set("startsAt")}
            className={`${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`} />
          <select value={form.target} onChange={set("target")}
            className={`${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`}>
            <option value="">{t("mualim.chooseTarget")}</option>
            {students.map((s) => (
              <option key={s.student_id} value={s.student_id}>{s.student?.full_name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select value={form.nacin} onChange={set("nacin")}
            className={`${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`}>
            <option value="online">{t("mualim.online")}</option>
            <option value="uzivo">{t("mualim.uzivo")}</option>
          </select>
          {form.nacin === "uzivo" && (
            <input value={form.lokacija} onChange={set("lokacija")} placeholder={t("mualim.uzivoLocationPlaceholder")}
              className={`${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`} />
          )}
        </div>
        {form.nacin === "online" && (
          <input value={form.link} onChange={set("link")} placeholder="Zoom / Teams / Discord / Viber / WhatsApp link"
            className={`w-full ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`} />
        )}
        <textarea value={form.smjernice} onChange={set("smjernice")} placeholder={t("mualim.sessionGuidelines")}
          rows={2} className={`w-full ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none resize-none`} />
        <button onClick={save} className={`${theme.button} rounded-xl px-4 py-2 text-sm`}>
          {t("mualim.schedule")}
        </button>
      </div>

      {/* Lista sesija - link i smjernice se mogu ažurirati u realnom vremenu */}
      {sessions.map((sn) => (
        <SessionCard key={sn.id} sn={sn} theme={theme} t={t} onChange={onChange} students={students} />
      ))}
    </div>
  );
}

function SessionCard({ sn, theme, t, onChange, students = [] }) {
  const [edit, setEdit] = useState(false);
  const [link, setLink] = useState(sn.link || "");
  const [smjernice, setSmjernice] = useState(sn.smjernice || "");
  const [sazetak, setSazetak] = useState(sn.sazetak || "");
  const [showAttendance, setShowAttendance] = useState(false);
  const [attendance, setAttendance] = useState({}); // student_id → { id, prisutan }
  const past = new Date(sn.starts_at) < new Date();

  // ko pripada sesiji: pojedinačni učenik
  const attendees = sn.student_id
    ? [{ id: sn.student_id, name: students.find((x) => x.student_id === sn.student_id)?.student?.full_name || t("mualim.student") }]
    : [];

  const openAttendance = async () => {
    setShowAttendance((v) => !v);
    try {
      const { data } = await supabase
        .from("session_attendance")
        .select("id, student_id, prisutan")
        .eq("session_id", sn.id);
      const map = {};
      (data || []).forEach((r) => { map[r.student_id] = r; });
      setAttendance(map);
    } catch { /* prazno */ }
  };

  const mark = async (studentId, prisutan) => {
    setAttendance((a) => ({ ...a, [studentId]: { ...(a[studentId] || {}), prisutan } }));
    try { await saveAttendance(sn.id, studentId, { prisutan, biljeske: null }); } catch { /* */ }
  };

  return (
    <div className={`${theme.card} rounded-2xl p-4 space-y-2`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold">{sn.naslov}</h3>
        <span className={`text-xs ${theme.muted}`}>{new Date(sn.starts_at).toLocaleString("bs-BA")}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className={`${theme.cardSub} rounded-full px-2 py-0.5`}>
          {sn.nacin === "uzivo" ? `📍 ${t("mualim.uzivo")}` : `💻 ${t("mualim.online")}`}
        </span>
        {sn.nacin === "uzivo" && sn.lokacija && <span className={theme.muted}>{sn.lokacija}</span>}
        {sn.vanredni && <span className={`${theme.cardSub} rounded-full px-2 py-0.5`}>{t("mualim.vanredni")}</span>}
      </div>
      {edit ? (
        <>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link"
            className={`w-full ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`} />
          <textarea value={smjernice} onChange={(e) => setSmjernice(e.target.value)} rows={2}
            placeholder={t("mualim.sessionGuidelines")}
            className={`w-full ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none resize-none`} />
          {past && (
            <textarea value={sazetak} onChange={(e) => setSazetak(e.target.value)} rows={2}
              placeholder={t("mualim.sessionSummary")}
              className={`w-full ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none resize-none`} />
          )}
          <button
            onClick={async () => { await updateSession(sn.id, { link, smjernice, sazetak }); setEdit(false); onChange(); }}
            className={`${theme.button} rounded-xl px-4 py-1.5 text-sm`}
          >
            {t("mualim.save")}
          </button>
        </>
      ) : (
        <>
          {sn.smjernice && <p className={`text-sm ${theme.muted}`}>{sn.smjernice}</p>}
          {sn.sazetak && <p className={`text-sm ${theme.accent}`}>📝 {sn.sazetak}</p>}
          <div className="flex gap-3 items-center flex-wrap">
            {sn.link && <a href={sn.link} target="_blank" rel="noreferrer" className={`${theme.accent} text-sm underline`}>{t("dashboard.joinSession")}</a>}
            <button onClick={() => setEdit(true)} className={`text-sm ${theme.muted} underline`}>{t("mualim.edit")}</button>
            {attendees.length > 0 && (
              <button onClick={openAttendance} className={`text-sm ${theme.muted} underline`}>
                📋 {t("mualim.attendance")}
              </button>
            )}
          </div>

          {/* Evidencija prisustva - štikliranje po učeniku */}
          {showAttendance && (
            <div className={`${theme.cardSub} rounded-xl p-3 space-y-2`}>
              <p className={`text-xs flex items-center ${theme.muted}`}>
                {t("mualim.attendance")}
                <HelpTip text="Klikni 'Prisutan' ili 'Odsutan' da odmah zabilježiš dolazak — sprema se automatski." />
              </p>
              {attendees.map((a) => {
                const rec = attendance[a.id] || {};
                return (
                  <div key={a.id} className="space-y-1 border-b last:border-b-0 pb-2 last:pb-0">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{a.name}</span>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => mark(a.id, true)}
                          className={`rounded-lg px-2.5 py-1 text-xs ${rec.prisutan === true ? "bg-green-600 text-white" : `${theme.card} ${theme.muted}`}`}>
                          ✓ {t("mualim.present")}
                        </button>
                        <button onClick={() => mark(a.id, false)}
                          className={`rounded-lg px-2.5 py-1 text-xs ${rec.prisutan === false ? "bg-red-500 text-white" : `${theme.card} ${theme.muted}`}`}>
                          ✕ {t("mualim.absent")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── HALKA METODA UČENJA - muallim zadaje, preslušava i otključava ──────── */
function HalkaLearningTab({ theme, t, students }) {
  const [studentId, setStudentId] = useState("");
  const [plan, setPlan] = useState(null);       // halka.js plan iz talim_plans.state
  const [planRow, setPlanRow] = useState(null); // red u talim_plans
  const [partsText, setPartsText] = useState("Rub' 1 — En-Nas do El-Fil\nRub' 2 — El-Humeze do El-Asr");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");

  const loadPlan = async (sid) => {
    setStudentId(sid); setPlan(null); setPlanRow(null);
    if (!sid) return;
    try {
      const { data } = await supabase.from("talim_plans").select("*")
        .eq("user_id", sid).eq("method", "halka").eq("active", true).maybeSingle();
      if (data?.state?.parts) { setPlan(data.state); setPlanRow(data); }
    } catch { /* nema plana */ }
  };

  const createNew = async () => {
    const parts = partsText.split("\n").map((l) => l.trim()).filter(Boolean)
      .map((label, i) => ({ id: `p${i + 1}`, label, pages: [] }));
    if (!parts.length || !studentId) return;
    let p = halkaCreatePlan(parts);
    if (deadline || note) p = { ...p, parts: p.parts.map((x, i) => (i === 0 ? { ...x, deadline: deadline || null, mentorNote: note } : x)) };
    try {
      await supabase.from("talim_plans").update({ active: false }).eq("user_id", studentId).eq("method", "halka").eq("active", true);
      const { data } = await supabase.from("talim_plans").insert({
        user_id: studentId, mushaf_edition: "medina_15", scope_type: "stranice",
        scope_data: {}, lines_per_day: 1, lock_type: "tempo",
        date_certainty: "okviran", method: "halka", state: p, active: true,
      }).select().single();
      setPlan(p); setPlanRow(data);
    } catch (e) { console.error("halka create:", e); }
  };

  const savePlan = async (next) => {
    setPlan(next);
    try { await supabase.from("talim_plans").update({ state: next, updated_at: new Date().toISOString() }).eq("id", planRow.id); } catch { /* */ }
  };

  const review = (clean) => savePlan(halkaMentorReview(plan, { clean }));

  const part = plan ? halkaCurrentPart(plan) : null;

  return (
    <div className="space-y-4">
      <select value={studentId} onChange={(e) => loadPlan(e.target.value)}
        className={`w-full ${theme.cardSub} rounded-xl px-3 py-2.5 text-sm outline-none`}>
        <option value="">{t("mualim.chooseStudent")}</option>
        {students.map((st) => <option key={st.student_id} value={st.student_id}>{st.student?.full_name}</option>)}
      </select>

      {studentId && !plan && (
        <div className={`${theme.card} rounded-2xl p-4 space-y-2`}>
          <h3 className="font-semibold text-sm flex items-center">
            🕌 {t("mualim.newHalkaPlan")}
            <HelpTip text="Svaki red u polju ispod postaje jedan zaključan dio (rub'). Učenik radi trenutni dio, kad ga pripremi ti ga preslušaš i označiš 'čisto' (otključava sljedeći) ili 'nije čisto' (ostaje na istom)." />
          </h3>
          <p className={`text-xs ${theme.muted}`}>{t("mualim.halkaPartsHint")}</p>
          <textarea value={partsText} onChange={(e) => setPartsText(e.target.value)} rows={4}
            className={`w-full ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none resize-none`} />
          <div className="flex gap-2 flex-wrap">
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              className={`${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`} />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("mualim.halkaNote")}
              className={`flex-1 ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`} />
          </div>
          <button onClick={createNew} className={`${theme.button} rounded-xl px-5 py-2 text-sm`}>
            {t("mualim.assignHalka")}
          </button>
        </div>
      )}

      {plan && (
        <div className={`${theme.card} rounded-2xl p-4 space-y-3`}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">🕌 {t("mualim.halkaProgress")}</h3>
            <span className={`text-sm font-bold ${theme.accent}`}>{halkaPercent(plan)}%</span>
          </div>

          {plan.finished ? (
            <p className="text-green-500 font-semibold text-sm">🎉 {t("mualim.halkaDone")}</p>
          ) : part && (
            <div className={`${theme.cardSub} rounded-xl p-3 space-y-2`}>
              <div className="text-sm font-medium">{part.label}</div>
              <div className={`text-xs ${theme.muted}`}>
                {t(`mualim.halka_${part.state}`)} {part.deadline ? `· ${t("dashboard.deadline")}: ${part.deadline}` : ""}
                {part.preslusavanja > 0 ? ` · ${t("mualim.attempts")}: ${part.preslusavanja}` : ""}
              </div>
              <div className="flex gap-2 flex-wrap">
                {part.state === "zadano" && (
                  <button onClick={() => savePlan(halkaMarkPrepared(plan))} className={`${theme.button} rounded-xl px-3 py-1.5 text-xs`}>
                    {t("mualim.halkaMarkPrepared")}
                  </button>
                )}
                {part.state === "pripremljeno" && (
                  <>
                    <button onClick={() => review(true)} className="bg-green-600 text-white rounded-xl px-3 py-1.5 text-xs">
                      ✓ {t("mualim.halkaClean")}
                    </button>
                    <button onClick={() => review(false)} className="bg-red-500 text-white rounded-xl px-3 py-1.5 text-xs">
                      ✕ {t("mualim.halkaNotClean")}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* svi dijelovi */}
          <p className={`text-[10px] flex items-center ${theme.muted}`}>
            Legenda
            <HelpTip text="✅ odobreno (čisto pročitano) · 📖 pripremljeno, čeka preslušavanje · ▶️ zadano, učenik trenutno radi na tome · 🔒 zaključano, dolazi na red kasnije." />
          </p>
          <ul className="space-y-1">
            {plan.parts.map((p) => (
              <li key={p.id} className="text-xs flex items-center gap-2">
                <span>{p.state === "odobreno" ? "✅" : p.state === "pripremljeno" ? "📖" : p.state === "zadano" ? "▶️" : "🔒"}</span>
                <span className={p.state === "zakljucano" ? theme.muted : ""}>{p.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── MUALIMOV PLAN - dnevni/sedmični plan koji učenik vidi kao PRIORITET ── */
function ReviewPlanTab({ theme, t, students, mualimId }) {
  const [studentId, setStudentId] = useState("");
  const [naslov, setNaslov] = useState("");
  const [komentar, setKomentar] = useState("");
  // 7 redova plana (cijela sedmica): datum + ucenje + ponavljanje (oba mogu biti popunjena za isti dan)
  const [rows, setRows] = useState(() => {
    const base = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base); d.setDate(d.getDate() + i);
      return { datum: d.toISOString().slice(0, 10), ucenje: "", ponavljanje: "" };
    });
  });
  // Opcioni prijedlozi za učenikov glavni plan učenja (talim_plans) -
  // spremaju se uz plan, prazno polje = ne mijenja se ništa.
  const [dailyGoalLines, setDailyGoalLines] = useState("");
  const [minutesNeeded, setMinutesNeeded] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [ok, setOk] = useState(false);

  const setRow = (i, k, v) => setRows((r) => r.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));

  // Kad se promijeni datum prvog reda (ponedjeljak), ostalih 6 dana se
  // automatski poravna na ponedjeljak + 1..6 dana (cijela sedmica).
  const setFirstDate = (newDate) => {
    if (!newDate) return setRow(0, "datum", newDate);
    const base = new Date(newDate);
    setRows((r) => r.map((row, idx) => {
      const d = new Date(base); d.setDate(d.getDate() + idx);
      return { ...row, datum: d.toISOString().slice(0, 10) };
    }));
  };

  const save = async () => {
    if (!studentId || !naslov.trim()) return;
    const days = rows.flatMap((r) => {
      const entries = [];
      if (r.ucenje.trim()) entries.push({ datum: r.datum, vrsta: "ucenje", opis: r.ucenje.trim() });
      if (r.ponavljanje.trim()) entries.push({ datum: r.datum, vrsta: "ponavljanje", opis: r.ponavljanje.trim() });
      return entries;
    });
    try {
      await createReviewPlan(mualimId, studentId, {
        naslov, komentar, days,
        dailyGoalLines: dailyGoalLines ? Number(dailyGoalLines) : null,
        minutesNeeded: minutesNeeded ? Number(minutesNeeded) : null,
        targetDate: targetDate || null,
      });
      setNaslov(""); setKomentar(""); setOk(true); setTimeout(() => setOk(false), 2500);
    } catch { /* */ }
  };

  const inp = `${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`;

  return (
    <div className={`${theme.card} rounded-2xl p-4 space-y-3`}>
      <h3 className="font-semibold flex items-center">
        📋 {t("mualim.newReviewPlan")}
        <HelpTip text="Ovdje praviš sedmični plan učenja i ponavljanja za učenika — svaki dan može imati unos za učenje i/ili ponavljanje. Čim klikneš 'Dodijeli plan', automatski se šalje učeniku i prikazuje mu se kao PRIORITET za tu sedmicu. Prazna polja se jednostavno preskaču." />
      </h3>
      <p className={`text-xs ${theme.muted}`}>{t("mualim.reviewPlanHint")}</p>

      <div className="grid sm:grid-cols-2 gap-2">
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inp}>
          <option value="">{t("mualim.chooseStudent")}</option>
          {students.map((st) => <option key={st.student_id} value={st.student_id}>{st.student?.full_name}</option>)}
        </select>
        <input value={naslov} onChange={(e) => setNaslov(e.target.value)} placeholder={t("mualim.planTitle")} className={inp} />
      </div>
      <input value={komentar} onChange={(e) => setKomentar(e.target.value)} placeholder={t("mualim.planComment")} className={`w-full ${inp}`} />

      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-1.5 flex-wrap items-center">
            <input type="date" value={r.datum}
              onChange={(e) => (i === 0 ? setFirstDate(e.target.value) : setRow(i, "datum", e.target.value))}
              className={`${inp} w-36`} />
            <input value={r.ucenje} onChange={(e) => setRow(i, "ucenje", e.target.value)}
              placeholder={t("mualim.learning")} className={`flex-1 min-w-[120px] ${inp}`} />
            <input value={r.ponavljanje} onChange={(e) => setRow(i, "ponavljanje", e.target.value)}
              placeholder={t("mualim.review")} className={`flex-1 min-w-[120px] ${inp}`} />
          </div>
        ))}
      </div>

      {/* ── Prijedlog za glavni plan učenja (dnevni cilj / vrijeme / rok) ── */}
      <div className={`${theme.cardAlt} rounded-xl p-3 space-y-2`}>
        <p className={`text-xs flex items-center ${theme.muted}`}>
          {t("mualim.goalsHint")}
          <HelpTip text="Ovo je opcionalno — ako popuniš bilo koje od ova tri polja, direktno mijenjaš učenikov GLAVNI plan učenja (dnevni cilj, potrebno vrijeme, ciljani datum). Prazno polje ne mijenja ništa." />
        </p>
        <div className="grid sm:grid-cols-3 gap-2">
          <label className="text-xs">
            <span className={theme.muted}>{t("mualim.dailyGoalLabel")}</span>
            <input type="number" min="0.5" step="0.5" value={dailyGoalLines}
              onChange={(e) => setDailyGoalLines(e.target.value)} className={`w-full mt-1 ${inp}`} />
          </label>
          <label className="text-xs">
            <span className={theme.muted}>{t("mualim.minutesNeededLabel")}</span>
            <input type="number" min="1" step="1" value={minutesNeeded}
              onChange={(e) => setMinutesNeeded(e.target.value)} className={`w-full mt-1 ${inp}`} />
          </label>
          <label className="text-xs">
            <span className={theme.muted}>{t("mualim.targetDateLabel")}</span>
            <input type="date" value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)} className={`w-full mt-1 ${inp}`} />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={save} className={`${theme.button} rounded-xl px-5 py-2 text-sm`}>{t("mualim.assignPlan")}</button>
        {ok && <span className="text-sm text-green-500">✓ {t("mualim.planAssigned")}</span>}
      </div>
    </div>
  );
}

/* ── OGLASNA PLOČA - cilj je OBAVEZAN: jedan učenik ─────────────────────── */
function BoardTab({ theme, t, announcements, students, mualimId, onChange }) {
  const [body, setBody] = useState("");
  const [vrsta, setVrsta] = useState("obavijest");
  const [target, setTarget] = useState(""); // student_id
  const [error, setError] = useState("");

  const VRSTE = { obavijest: "📢", motivacija: "🌟", pohvala: "👏", podsjetnik: "⏰" };

  const publish = async () => {
    setError("");
    if (!body.trim()) return;
    if (!target) { setError(t("mualim.chooseTargetRequired")); return; }
    try {
      await postAnnouncement(mualimId, { body, vrsta, studentId: target });
      setBody(""); setTarget(""); onChange();
    } catch (e) {
      setError(e?.message || t("profil.error"));
    }
  };

  return (
    <div className="space-y-4">
      <div className={`${theme.card} rounded-2xl p-4 space-y-2`}>
        <p className={`text-xs flex items-center ${theme.muted}`}>
          {VRSTE.obavijest} {t("mualim.boardPlaceholder")}
          <HelpTip text="Objava mora imati izabranog konkretnog učenika — ide njemu lično, ne svim učenicima odjednom. Vrsta (obavijest/motivacija/pohvala/podsjetnik) je samo oznaka koja mijenja ikonicu." />
        </p>
        <textarea
          value={body} onChange={(e) => setBody(e.target.value)}
          placeholder={t("mualim.boardPlaceholder")} rows={3}
          className={`w-full ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none resize-none`}
        />
        <div className="flex gap-2 flex-wrap">
          <select value={vrsta} onChange={(e) => setVrsta(e.target.value)}
            className={`${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`}>
            {Object.keys(VRSTE).map((v) => <option key={v} value={v}>{VRSTE[v]} {t(`mualim.vrsta_${v}`)}</option>)}
          </select>
          <select value={target} onChange={(e) => setTarget(e.target.value)}
            className={`${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`}>
            <option value="">{t("mualim.chooseTarget")}</option>
            {students.map((s) => <option key={s.student_id} value={s.student_id}>{s.student?.full_name}</option>)}
          </select>
          <button onClick={publish} className={`${theme.button} rounded-xl px-4 py-2 text-sm`}>
            {t("mualim.publish")}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {announcements.map((a) => (
        <div key={a.id} className={`${theme.card} rounded-2xl p-4 text-sm flex justify-between gap-3`}>
          <span>{VRSTE[a.vrsta] || "📢"} {a.body}</span>
          <span className={`text-xs shrink-0 ${theme.muted}`}>{new Date(a.created_at).toLocaleDateString("bs-BA")}</span>
        </div>
      ))}
    </div>
  );
}
