// ============================================================================
// Moderator panel
// Smije: spajati učenike i muallime, zakazivati sesije/halke za muallima,
// pisati na oglasnu ploču (s POTPISOM "od moderatora"), pratiti zahtjeve.
// NE smije: oglasi (ads) i admin funkcije - te sekcije ovdje ne postoje.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useLang } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/SupaBaseClient";
import BackButton from "../../components/shared/BackButton";
import StaffConversations from "../../components/shared/StaffConversations";

const STR = {
  bs: {
    title: "Moderator panel", subtitle: "Spajanje učenika i muallima, sesije, oglasna ploča, zahtjevi i podrška",
    tabConnect: "Spajanje", tabSessions: "Sesije", tabBoard: "Oglasna ploča",
    tabRequests: "Muallim zahtjevi", tabMualimi: "Mualimi", tabStudents: "Učenici", tabTickets: "Tiketi",
    tabMessages: "Poruke",
    student: "Učenik", mualim: "Muallim", connect: "Poveži",
    connected: "Povezano ✓", existing: "Postojeće veze",
    st_na_cekanju: "Na čekanju", st_prihvacen: "Prihvaćen", st_odbijen: "Odbijen", st_prekinut: "Prekinut",
    approveConn: "Prihvati", noConns: "Nema veza.",
    undoConn: "Poništi", undone: "Poništeno ✓",
    searchByEmail: "🔍 Pretraži po emailu…",
    newSession: "Zakaži sesiju (u ime muallima)", sessionTitle: "Naslov (npr. Preslušavanje — Džuz 15)",
    forMualim: "Za muallima", forStudent: "Za učenika", chooseStudentFirst: "Prvo izaberi muallima",
    noStudentsForMualim: "Ovaj muallim nema prihvaćenih učenika.",
    link: "Link (Zoom/Teams/…)", guidelines: "Smjernice",
    schedule: "Zakaži", scheduled: "Zakazano ✓",
    post: "Objavi", boardPh: "Obavijest za učenike muallima…", forBoard: "Ploča muallima",
    signedAs: "Objave se potpisuju kao: MODERATOR", posted: "Objavljeno ✓",
    byModerator: "od moderatora", byMualim: "od muallima",
    approve: "Odobri", reject: "Odbij", noRequests: "Nema zahtjeva na čekanju.",
    requestedAt: "Zahtjev poslan",
    noMualimi: "Nema registrovanih muallima.", noStudents: "Nema učenika.", students: "učenika",
    answer: "Odgovor…", send: "Odgovori", noTickets: "Nema tiketa.",
    st_otvoren: "Otvoren", st_u_obradi: "U obradi", st_rijesen: "Riješen",
    genderMale: "Muško", genderFemale: "Žensko",
    mualimOf: "Mualim", noMualim: "Nema mualima",
  },
  en: {
    title: "Moderator panel", subtitle: "Connect students & muallims, sessions, board, requests and support",
    tabConnect: "Connections", tabSessions: "Sessions", tabBoard: "Board",
    tabRequests: "Muallim requests", tabMualimi: "Muallims", tabStudents: "Students", tabTickets: "Tickets",
    tabMessages: "Messages",
    student: "Student", mualim: "Muallim", connect: "Connect",
    connected: "Connected ✓", existing: "Existing connections",
    st_na_cekanju: "Pending", st_prihvacen: "Accepted", st_odbijen: "Declined", st_prekinut: "Ended",
    approveConn: "Accept", noConns: "No connections.",
    undoConn: "Undo", undone: "Undone ✓",
    searchByEmail: "🔍 Search by email…",
    newSession: "Schedule a session (on behalf of a muallim)", sessionTitle: "Title (e.g. Recitation — Juz 15)",
    forMualim: "For muallim", forStudent: "For student", chooseStudentFirst: "Choose a muallim first",
    noStudentsForMualim: "This muallim has no accepted students.",
    link: "Link (Zoom/Teams/…)", guidelines: "Guidelines",
    schedule: "Schedule", scheduled: "Scheduled ✓",
    post: "Publish", boardPh: "Announcement for the muallim's students…", forBoard: "Muallim's board",
    signedAs: "Posts are signed as: MODERATOR", posted: "Published ✓",
    byModerator: "by moderator", byMualim: "by muallim",
    approve: "Approve", reject: "Reject", noRequests: "No pending requests.",
    requestedAt: "Requested",
    noMualimi: "No registered muallims.", noStudents: "No students.", students: "students",
    answer: "Reply…", send: "Reply", noTickets: "No tickets.",
    st_otvoren: "Open", st_u_obradi: "In progress", st_rijesen: "Resolved",
    genderMale: "Male", genderFemale: "Female",
    mualimOf: "Muallim", noMualim: "No muallim",
  },
};

const TAB_IDS = ["connect", "sessions", "board", "requests", "mualimi", "students", "tickets", "messages"];

// full_name/email/city/country/gender - "podaci" (kontakt info) koje admin i
// moderator trebaju vidjeti pored samog imena, ne samo za spajanje nego i za
// pregled ko je ko (npr. spol bitan zbog mualim-učenik uparivanja).
function contactLine(p, s) {
  const mjesto = [p.city, p.country].filter(Boolean).join(", ");
  const spol = p.gender === "musko" ? s.genderMale : p.gender === "zensko" ? s.genderFemale : "";
  return [mjesto, spol].filter(Boolean).join(" · ");
}

export default function ModeratorDashboard() {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { user } = useAuth();
  const s = STR[lang] || STR.bs;

  // Tab je izveden direktno iz URL-a (?tab=requests), bez posebnog state-a -
  // klik na "Muallim zahtjevi"/"Mualimi"/"Tiketi" u sidebaru vodi ovdje s
  // odgovarajućim query paramom umjesto na zasebne prazne stranice, i radi i
  // kad je korisnik već na ovoj stranici (samo se query mijenja).
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TAB_IDS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "connect";
  const setTab = (id) => setSearchParams(id === "connect" ? {} : { tab: id });

  const [profiles, setProfiles] = useState([]);
  const [conns, setConns] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // forme
  const [selStudent, setSelStudent] = useState("");
  const [selMualim, setSelMualim] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [mualimSearch, setMualimSearch] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [sess, setSess] = useState({ naslov: "", mualim: "", student: "", startsAt: "", link: "", smjernice: "" });
  const [board, setBoard] = useState({ mualim: "", body: "" });

  const load = useCallback(async () => {
    const safe = async (fn, fb) => { try { return await fn(); } catch { return fb; } };
    const [pr, cn, rr, tk] = await Promise.all([
      safe(async () => (await supabase.from("profiles").select("id, full_name, email, role, country, city, gender")).data || [], []),
      safe(async () => (await supabase.from("mualim_students").select("*")).data || [], []),
      safe(async () => (await supabase.from("role_requests").select("*, profil:profiles!role_requests_user_id_fkey(full_name)").eq("status", "na_cekanju")).data || [], []),
      safe(async () => (await supabase.from("support_tickets").select("*").order("created_at", { ascending: false })).data || [], []),
    ]);
    setProfiles(pr); setConns(cn); setRequests(rr); setTickets(tk); setLoading(false);
  }, []);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const byName = (a, b) => (a.full_name || "").localeCompare(b.full_name || "", "bs");
  const mualimi = profiles.filter((p) => p.role === "mualim").sort(byName);
  const ucenici = profiles.filter((p) => p.role !== "mualim" && p.role !== "admin").sort(byName);
  const name = (id) => profiles.find((p) => p.id === id)?.full_name || id?.slice(0, 8);

  const matchesSearch = (p, q) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    return (p.email || "").toLowerCase().includes(needle) || (p.full_name || "").toLowerCase().includes(needle);
  };
  const ucenikOptions = ucenici.filter((p) => matchesSearch(p, studentSearch));
  const mualimOptions = mualimi.filter((p) => matchesSearch(p, mualimSearch));

  const studentsOfMualim = sess.mualim
    ? conns.filter((c) => c.mualim_id === sess.mualim && c.status === "prihvacen")
      .map((c) => ucenici.find((u) => u.id === c.student_id))
      .filter(Boolean)
      .sort(byName)
    : [];

  const connect = async () => {
    if (!selStudent || !selMualim) return;
    try {
      await supabase.from("mualim_students").upsert({
        student_id: selStudent, mualim_id: selMualim,
        status: "prihvacen", decided_at: new Date().toISOString(),
      }, { onConflict: "mualim_id,student_id" });
      setOkMsg(s.connected); setTimeout(() => setOkMsg(""), 2500);
      load();
    } catch { /* */ }
  };

  const approveConn = async (id) => {
    try {
      await supabase.from("mualim_students").update({ status: "prihvacen", decided_at: new Date().toISOString() }).eq("id", id);
      load();
    } catch { /* */ }
  };

  // Poništi (undo) slučajno prihvaćenu vezu - vrati je na "na_cekanju" da
  // moderator ili strane mogu ponovo odlučiti.
  const undoConn = async (id) => {
    try {
      await supabase.from("mualim_students").update({ status: "na_cekanju", decided_at: null }).eq("id", id);
      setOkMsg(s.undone); setTimeout(() => setOkMsg(""), 2500);
      load();
    } catch { /* */ }
  };

  const scheduleSession = async () => {
    if (!sess.naslov || !sess.mualim || !sess.student || !sess.startsAt) return;
    try {
      await supabase.from("sessions").insert({
        mualim_id: sess.mualim, student_id: sess.student, naslov: sess.naslov,
        starts_at: new Date(sess.startsAt).toISOString(),
        link: sess.link, smjernice: sess.smjernice,
        created_by: user.id, created_by_role: "moderator", // potpis
      });
      setSess({ naslov: "", mualim: "", student: "", startsAt: "", link: "", smjernice: "" });
      setOkMsg(s.scheduled); setTimeout(() => setOkMsg(""), 2500);
    } catch { /* */ }
  };

  const postBoard = async () => {
    if (!board.mualim || !board.body.trim()) return;
    try {
      await supabase.from("announcements").insert({
        mualim_id: board.mualim, body: board.body, vrsta: "obavijest",
        author_id: user.id, author_role: "moderator", // potpis "od moderatora"
      });
      setBoard({ mualim: "", body: "" });
      setOkMsg(s.posted); setTimeout(() => setOkMsg(""), 2500);
    } catch { /* */ }
  };

  // Odobri/odbij zahtjev za rolu muallim - isto što admin radi u svom panelu,
  // samo je moderatoru RLS-om (0035) dozvoljeno da doda TAČNO ulogu 'mualim'
  // u app_user_roles, ništa šire od toga.
  const decideMualim = async (req, approve) => {
    try {
      await supabase.from("role_requests").update({
        status: approve ? "odobren" : "odbijen",
        decided_by: user.id, decided_at: new Date().toISOString(),
      }).eq("id", req.id);
      if (approve) {
        await supabase.from("app_user_roles").upsert({ user_id: req.user_id, role: "mualim", granted_by: user.id }, { onConflict: "user_id,role" });
        await supabase.from("profiles").update({ role: "mualim" }).eq("id", req.user_id);
      }
      load();
    } catch { /* */ }
  };

  const answerTicket = async (id, odgovor, status) => {
    try {
      await supabase.from("support_tickets").update({ odgovor, status, updated_at: new Date().toISOString() }).eq("id", id);
      load();
    } catch { /* */ }
  };

  const inp = `${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`;

  return (
    <div className={`min-h-screen ${theme.text} px-4 py-6 sm:px-6 lg:px-10`}>
      <div className="max-w-5xl mx-auto space-y-5">
        <BackButton />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">🧩 {s.title}</h1>
          <p className={`${theme.muted} text-sm mt-1`}>{s.subtitle}</p>
        </div>

        <div className="flex gap-1 border-b border-black/10 overflow-x-auto">
          {[
            ["connect", s.tabConnect],
            ["sessions", s.tabSessions],
            ["board", s.tabBoard],
            ["requests", s.tabRequests, requests.length],
            ["mualimi", s.tabMualimi],
            ["students", s.tabStudents],
            ["tickets", s.tabTickets, tickets.filter((tk) => tk.status !== "rijesen").length],
            ["messages", s.tabMessages],
          ].map(([id, label, badge]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 ${tab === id ? `${theme.accent} border-current font-semibold` : `${theme.muted} border-transparent`}`}>
              {label}{badge ? ` (${badge})` : ""}
            </button>
          ))}
        </div>

        {okMsg && <p className="text-sm text-green-500">{okMsg}</p>}
        {loading ? <p className={theme.muted}>…</p> : (
          <>
            {/* ── SPAJANJE ── */}
            {tab === "connect" && (
              <div className="space-y-4">
                <div className={`${theme.card} rounded-2xl p-4 space-y-2`}>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <label className="text-xs"><span className={theme.muted}>{s.student}</span>
                      <input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder={s.searchByEmail}
                        className={`w-full mt-1 mb-1 ${inp}`} />
                      <select value={selStudent} onChange={(e) => setSelStudent(e.target.value)} className={`w-full ${inp}`}>
                        <option value="">—</option>
                        {ucenikOptions.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.id.slice(0, 8)}{p.email ? ` (${p.email})` : ""}</option>)}
                      </select></label>
                    <label className="text-xs"><span className={theme.muted}>{s.mualim}</span>
                      <input value={mualimSearch} onChange={(e) => setMualimSearch(e.target.value)} placeholder={s.searchByEmail}
                        className={`w-full mt-1 mb-1 ${inp}`} />
                      <select value={selMualim} onChange={(e) => setSelMualim(e.target.value)} className={`w-full ${inp}`}>
                        <option value="">—</option>
                        {mualimOptions.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.id.slice(0, 8)}{p.email ? ` (${p.email})` : ""}</option>)}
                      </select></label>
                  </div>
                  <button onClick={connect} className={`${theme.button} rounded-xl px-5 py-2 text-sm`}>🔗 {s.connect}</button>
                </div>

                <div className={`${theme.card} rounded-2xl p-4`}>
                  <h3 className="font-semibold mb-2">{s.existing}</h3>
                  {conns.length === 0 ? <p className={`text-sm ${theme.muted}`}>{s.noConns}</p> : (
                    <ul className="space-y-1.5">
                      {conns.map((c) => (
                        <li key={c.id} className={`${theme.cardSub} rounded-xl px-3 py-2 text-sm flex items-center justify-between gap-2 flex-wrap`}>
                          <span>{name(c.student_id)} ↔ {name(c.mualim_id)}</span>
                          <span className="flex items-center gap-2">
                            <span className={`text-[10px] text-white px-2 py-0.5 rounded-full ${
                              c.status === "prihvacen" ? "bg-green-600" : c.status === "na_cekanju" ? "bg-amber-500" : "bg-gray-500"}`}>
                              {s[`st_${c.status}`]}
                            </span>
                            {c.status === "na_cekanju" && (
                              <button onClick={() => approveConn(c.id)} className={`${theme.button} rounded-lg px-2.5 py-1 text-xs`}>
                                {s.approveConn}
                              </button>
                            )}
                            {c.status === "prihvacen" && (
                              <button onClick={() => undoConn(c.id)} className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-2.5 py-1 text-xs">
                                {s.undoConn}
                              </button>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* ── SESIJE ── */}
            {tab === "sessions" && (
              <div className={`${theme.card} rounded-2xl p-4 space-y-2`}>
                <h3 className="font-semibold">🎥 {s.newSession}</h3>
                <input value={sess.naslov} onChange={(e) => setSess({ ...sess, naslov: e.target.value })} placeholder={s.sessionTitle} className={`w-full ${inp}`} />
                <div className="grid sm:grid-cols-2 gap-2">
                  <select value={sess.mualim} onChange={(e) => setSess({ ...sess, mualim: e.target.value, student: "" })} className={inp}>
                    <option value="">{s.forMualim} —</option>
                    {mualimi.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                  <select value={sess.student} onChange={(e) => setSess({ ...sess, student: e.target.value })} disabled={!sess.mualim} className={inp}>
                    <option value="">{sess.mualim ? `${s.forStudent} —` : s.chooseStudentFirst}</option>
                    {studentsOfMualim.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.id.slice(0, 8)}</option>)}
                  </select>
                </div>
                {sess.mualim && studentsOfMualim.length === 0 && (
                  <p className="text-xs text-amber-600">{s.noStudentsForMualim}</p>
                )}
                <div className="grid sm:grid-cols-2 gap-2">
                  <input type="datetime-local" value={sess.startsAt} onChange={(e) => setSess({ ...sess, startsAt: e.target.value })} className={inp} />
                  <input value={sess.link} onChange={(e) => setSess({ ...sess, link: e.target.value })} placeholder={s.link} className={inp} />
                </div>
                <textarea value={sess.smjernice} onChange={(e) => setSess({ ...sess, smjernice: e.target.value })} placeholder={s.guidelines} rows={2}
                  className={`w-full ${inp} resize-none`} />
                <button onClick={scheduleSession} className={`${theme.button} rounded-xl px-5 py-2 text-sm`}>{s.schedule}</button>
              </div>
            )}

            {/* ── OGLASNA PLOČA ── */}
            {tab === "board" && (
              <div className={`${theme.card} rounded-2xl p-4 space-y-2`}>
                <p className={`text-xs ${theme.accent}`}>✍️ {s.signedAs}</p>
                <select value={board.mualim} onChange={(e) => setBoard({ ...board, mualim: e.target.value })} className={`w-full ${inp}`}>
                  <option value="">{s.forBoard} —</option>
                  {mualimi.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
                <textarea value={board.body} onChange={(e) => setBoard({ ...board, body: e.target.value })} placeholder={s.boardPh} rows={3}
                  className={`w-full ${inp} resize-none`} />
                <button onClick={postBoard} className={`${theme.button} rounded-xl px-5 py-2 text-sm`}>📢 {s.post}</button>
              </div>
            )}

            {/* ── MUALLIM ZAHTJEVI ── */}
            {tab === "requests" && (
              requests.length === 0 ? <p className={theme.muted}>{s.noRequests}</p> : (
                <div className="space-y-3">
                  {requests.map((r) => (
                    <div key={r.id} className={`${theme.card} rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap`}>
                      <div>
                        <div className="font-medium">{r.profil?.full_name || r.user_id.slice(0, 8)}</div>
                        <div className={`text-xs ${theme.muted}`}>{s.requestedAt}: {new Date(r.created_at).toLocaleDateString("bs-BA")}</div>
                        {r.poruka && <div className={`text-xs mt-1 ${theme.muted}`}>{r.poruka}</div>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => decideMualim(r, true)} className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2 text-sm">
                          ✓ {s.approve}
                        </button>
                        <button onClick={() => decideMualim(r, false)} className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-2 text-sm">
                          ✕ {s.reject}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ── MUALIMI (pregled - kontakt podaci + koje učenike ima) ── */}
            {tab === "mualimi" && (
              mualimi.length === 0 ? <p className={theme.muted}>{s.noMualimi}</p> : (
                <div className="space-y-3">
                  {mualimi.map((m) => {
                    const uceniciMualima = conns.filter((c) => c.mualim_id === m.id && c.status === "prihvacen");
                    return (
                      <div key={m.id} className={`${theme.card} rounded-2xl p-4 space-y-2`}>
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <div className="font-medium">{m.full_name || m.id.slice(0, 8)}</div>
                            {m.email && <div className={`text-xs ${theme.muted}`}>{m.email}</div>}
                            {contactLine(m, s) && <div className={`text-xs ${theme.muted}`}>{contactLine(m, s)}</div>}
                          </div>
                          <span className={`shrink-0 text-xs ${theme.muted}`}>{uceniciMualima.length} {s.students}</span>
                        </div>
                        {uceniciMualima.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-black/5">
                            {uceniciMualima.map((c) => (
                              <span key={c.id} className={`${theme.cardSub} text-[11px] px-2 py-1 rounded-full`}>{name(c.student_id)}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* ── UČENICI (pregled - kontakt podaci + njihov mualim) ── */}
            {tab === "students" && (
              ucenici.length === 0 ? <p className={theme.muted}>{s.noStudents}</p> : (
                <div className="space-y-3">
                  {ucenici.map((u) => {
                    const veza = conns.find((c) => c.student_id === u.id && c.status === "prihvacen");
                    return (
                      <div key={u.id} className={`${theme.card} rounded-2xl p-4 flex items-start justify-between gap-3 flex-wrap`}>
                        <div className="min-w-0">
                          <div className="font-medium">{u.full_name || u.id.slice(0, 8)}</div>
                          {u.email && <div className={`text-xs ${theme.muted}`}>{u.email}</div>}
                          {contactLine(u, s) && <div className={`text-xs ${theme.muted}`}>{contactLine(u, s)}</div>}
                        </div>
                        <span className={`shrink-0 text-xs ${veza ? theme.accent : theme.muted}`}>
                          {veza ? `${s.mualimOf}: ${name(veza.mualim_id)}` : s.noMualim}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* ── TIKETI ── */}
            {tab === "tickets" && (
              tickets.length === 0 ? <p className={theme.muted}>{s.noTickets}</p> : (
                <div className="space-y-3">
                  {tickets.map((tk) => <TicketCard key={tk.id} tk={tk} theme={theme} s={s} onAnswer={answerTicket} />)}
                </div>
              )
            )}

            {/* ── PORUKE (staff kontaktira korisnika direktno - 0036) ── */}
            {tab === "messages" && (
              <StaffConversations mode="staff" currentUserId={user.id} theme={theme} lang={lang}
                profiles={profiles.filter((p) => p.id !== user.id)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TicketCard({ tk, theme, s, onAnswer }) {
  const [odgovor, setOdgovor] = useState(tk.odgovor || "");
  const boja = { otvoren: "bg-amber-500", u_obradi: "bg-sky-500", rijesen: "bg-green-600" }[tk.status] || "bg-gray-500";
  return (
    <div className={`${theme.card} rounded-2xl p-4 space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-sm">{tk.naslov}</div>
          <div className={`text-xs mt-1 ${theme.muted}`}>{tk.opis}</div>
        </div>
        <span className={`shrink-0 text-[10px] text-white px-2 py-1 rounded-full ${boja}`}>{s[`st_${tk.status}`]}</span>
      </div>
      <div className="flex gap-2">
        <input value={odgovor} onChange={(e) => setOdgovor(e.target.value)} placeholder={s.answer}
          className={`flex-1 ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`} />
        <button onClick={() => onAnswer(tk.id, odgovor, "u_obradi")} className={`${theme.button} rounded-xl px-3 py-2 text-sm`}>
          {s.send}
        </button>
        <button onClick={() => onAnswer(tk.id, odgovor, "rijesen")} className="bg-green-600 text-white rounded-xl px-3 py-2 text-sm">
          ✓
        </button>
      </div>
    </div>
  );
}
