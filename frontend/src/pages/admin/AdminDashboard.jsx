// ============================================================================
// Admin panel - upravljanje cijelom platformom
// Tabovi: Korisnici (uloge - dodjela/oduzimanje blogger/moderator/mualim),
//         Muallim zahtjevi (odobri/odbij registracije muallima),
//         Podrška (tiketi s odgovorom).
// Blogger i Moderator uloge dodjeljuju se SAMO ovdje. Korisnik može imati
// više uloga; admin ima pristup svemu.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useLang } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/SupaBaseClient";
import BackButton from "../../components/shared/BackButton";
import StaffConversations from "../../components/shared/StaffConversations";

const STR = {
  bs: {
    title: "Admin panel", subtitle: "Korisnici, uloge, odobravanje muallima i podrška",
    tabUsers: "Korisnici", tabRequests: "Muallim zahtjevi", tabGender: "Zahtjevi za rod", tabSupport: "Podrška",
    tabMessages: "Poruke",
    search: "🔍 Pretraži po imenu ili emailu…", roles: "Uloge",
    grant: "Dodijeli", revoke: "Ukloni", noUsers: "Nema korisnika.",
    approve: "Odobri", reject: "Odbij", noRequests: "Nema zahtjeva na čekanju.",
    approved: "Muallim odobren ✓", requestedAt: "Zahtjev poslan",
    answer: "Odgovor…", send: "Odgovori", noTickets: "Nema tiketa.",
    st_otvoren: "Otvoren", st_u_obradi: "U obradi", st_rijesen: "Riješen",
    markResolved: "Označi riješenim",
    resetPw: "Pošalji reset lozinke", resetPwConfirm: "Sigurno poslati link za promjenu lozinke ovom korisniku?",
    resetPwYes: "Da, pošalji", resetPwNo: "Odustani",
    resetPwSent: "Link poslan ✓", resetPwFail: "Nije uspjelo — korisnik nema email.",
    groupPlain: "Obični korisnici", groupMualim: "Mualimi", groupModerator: "Moderatori", groupBlogger: "Bloggeri",
    groupAll: "Svi korisnici",
    grantConfirm: (name, role) => `Dodijeliti ulogu "${role}" korisniku ${name}?`,
    grantYes: "Da, dodijeli", grantNo: "Odustani",
    noGenderRequests: "Nema zahtjeva za promjenu roda na čekanju.",
    genderMale: "Muško", genderFemale: "Žensko", genderReason: "Razlog",
    genderChange: (from, to) => `${from} → ${to}`,
  },
  en: {
    title: "Admin panel", subtitle: "Users, roles, muallim approval and support",
    tabUsers: "Users", tabRequests: "Muallim requests", tabGender: "Gender requests", tabSupport: "Support",
    tabMessages: "Messages",
    search: "🔍 Search by name or email…", roles: "Roles",
    grant: "Grant", revoke: "Remove", noUsers: "No users.",
    approve: "Approve", reject: "Reject", noRequests: "No pending requests.",
    approved: "Muallim approved ✓", requestedAt: "Requested",
    answer: "Reply…", send: "Reply", noTickets: "No tickets.",
    st_otvoren: "Open", st_u_obradi: "In progress", st_rijesen: "Resolved",
    markResolved: "Mark resolved",
    resetPw: "Send password reset", resetPwConfirm: "Send this user a password reset link?",
    resetPwYes: "Yes, send", resetPwNo: "Cancel",
    resetPwSent: "Link sent ✓", resetPwFail: "Failed — this user has no email on file.",
    groupPlain: "Regular users", groupMualim: "Muallims", groupModerator: "Moderators", groupBlogger: "Bloggers",
    groupAll: "All users",
    grantConfirm: (name, role) => `Grant the "${role}" role to ${name}?`,
    grantYes: "Yes, grant", grantNo: "Cancel",
    noGenderRequests: "No pending gender change requests.",
    genderMale: "Male", genderFemale: "Female", genderReason: "Reason",
    genderChange: (from, to) => `${from} → ${to}`,
  },
};

// grad/država + spol ispod emaila u kartici korisnika - "podaci" koje admin
// (i moderator, isti prikaz u ModeratorDashboard.jsx) treba vidjeti pored imena
function contactLine(p, s) {
  const mjesto = [p.city, p.country].filter(Boolean).join(", ");
  const spol = p.gender === "musko" ? s.genderMale : p.gender === "zensko" ? s.genderFemale : "";
  return [mjesto, spol].filter(Boolean).join(" · ");
}

const GRANTABLE = ["blogger", "moderator", "mualim"];
const ROLE_BOJA = {
  admin: "bg-red-600", moderator: "bg-purple-600", mualim: "bg-emerald-600",
  blogger: "bg-sky-600", ucenik: "bg-teal-600", korisnik: "bg-gray-500", management: "bg-indigo-600",
};

export default function AdminDashboard() {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { user } = useAuth();
  const s = STR[lang] || STR.bs;

  const [tab, setTab] = useState("users");
  const [profiles, setProfiles] = useState([]);
  const [roles, setRoles] = useState({});       // user_id → [role]
  const [requests, setRequests] = useState([]);
  const [genderRequests, setGenderRequests] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(null); // null = svi, ili "korisnik"/"mualim"/"moderator"/"blogger"
  const [loading, setLoading] = useState(true);
  const [confirmResetId, setConfirmResetId] = useState(null);
  const [confirmGrant, setConfirmGrant] = useState(null); // { userId, role } | null
  const [resetMsg, setResetMsg] = useState({}); // userId → poruka

  const load = useCallback(async () => {
    const safe = async (fn, fb) => { try { return await fn(); } catch { return fb; } };
    const [pr, ur, rr, gr, tk] = await Promise.all([
      safe(async () => (await supabase.from("profiles").select("id, full_name, email, role, country, city, gender")).data || [], []),
      safe(async () => (await supabase.from("app_user_roles").select("user_id, role")).data || [], []),
      safe(async () => (await supabase.from("role_requests").select("*, profil:profiles!role_requests_user_id_fkey(full_name)").eq("status", "na_cekanju")).data || [], []),
      safe(async () => (await supabase.from("gender_change_requests").select("*, profil:profiles!gender_change_requests_user_id_fkey(full_name)").eq("status", "na_cekanju")).data || [], []),
      safe(async () => (await supabase.from("support_tickets").select("*").order("created_at", { ascending: false })).data || [], []),
    ]);
    const map = {};
    ur.forEach((r) => { (map[r.user_id] = map[r.user_id] || []).push(r.role); });
    pr.forEach((p) => { if (p.role && !(map[p.id] || []).includes(p.role)) (map[p.id] = map[p.id] || []).push(p.role); });
    setProfiles(pr); setRoles(map); setRequests(rr); setGenderRequests(gr); setTickets(tk);
    setLoading(false);
  }, []);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const grantRole = async (userId, role) => {
    setConfirmGrant(null);
    try {
      await supabase.from("app_user_roles").upsert({ user_id: userId, role, granted_by: user.id }, { onConflict: "user_id,role" });
      // profiles.role je stariji, jednostruki stub koji dio ekrana (npr. lista
      // muallima na učenikovom profilu) i dalje čita direktno - mora ostati
      // usklađen sa app_user_roles, isto kao što ga revokeRole vraća nazad.
      // NIKAD ne prepisuje "admin" (admin se ne dodjeljuje kroz ovaj ekran -
      // GRANTABLE ga namjerno isključuje - pa ne smije ni nestati odavde).
      const p = profiles.find((x) => x.id === userId);
      if (p?.role !== "admin") {
        await supabase.from("profiles").update({ role }).eq("id", userId);
      }
      load();
    } catch { /* */ }
  };

  const revokeRole = async (userId, role) => {
    try {
      await supabase.from("app_user_roles").delete().eq("user_id", userId).eq("role", role);
      // ako je bila i primarna, vrati primarnu na korisnik
      const p = profiles.find((x) => x.id === userId);
      if (p?.role === role) await supabase.from("profiles").update({ role: "korisnik" }).eq("id", userId);
      load();
    } catch { /* */ }
  };

  // Ne postavlja lozinku direktno (to zahtijeva service_role ključ koji ne smije
  // biti u frontend kodu) - šalje standardni Supabase Auth reset link na email.
  // Korisnik sam postavi novu lozinku na /reset-lozinke.
  const sendPasswordReset = async (p) => {
    setConfirmResetId(null);
    if (!p.email) { setResetMsg((m) => ({ ...m, [p.id]: s.resetPwFail })); return; }
    try {
      await supabase.auth.resetPasswordForEmail(p.email, {
        redirectTo: `${window.location.origin}/reset-lozinke`,
      });
      setResetMsg((m) => ({ ...m, [p.id]: s.resetPwSent }));
    } catch {
      setResetMsg((m) => ({ ...m, [p.id]: s.resetPwFail }));
    }
    setTimeout(() => setResetMsg((m) => ({ ...m, [p.id]: "" })), 4000);
  };

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

  // Odobrenje upisuje profiles.gender direktno - trigger block_gender_tamper
  // (0017) propušta izmjenu jer je admin/moderator "staff", pa se ovdje
  // legalno zaobilazi zaštita namijenjena samokorisničkim pokušajima.
  const decideGender = async (req, approve) => {
    try {
      await supabase.from("gender_change_requests").update({
        status: approve ? "odobren" : "odbijen",
        decided_by: user.id, decided_at: new Date().toISOString(),
      }).eq("id", req.id);
      if (approve) {
        await supabase.from("profiles").update({ gender: req.requested_gender }).eq("id", req.user_id);
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

  const filtered = profiles.filter((p) =>
    (p.full_name || "").toLowerCase().includes(search.toLowerCase())
    || (p.email || "").toLowerCase().includes(search.toLowerCase())
    || p.id.includes(search)
  );

  const TABS = [
    { id: "users", label: s.tabUsers, badge: profiles.length },
    { id: "requests", label: s.tabRequests, badge: requests.length },
    { id: "gender", label: s.tabGender, badge: genderRequests.length },
    { id: "support", label: s.tabSupport, badge: tickets.filter((tk) => tk.status !== "rijesen").length },
    { id: "messages", label: s.tabMessages },
  ];

  return (
    <div className={`min-h-screen ${theme.text} px-4 py-6 sm:px-6 lg:px-10`}>
      <div className="max-w-5xl mx-auto space-y-5">
        <BackButton />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">🛡️ {s.title}</h1>
          <p className={`${theme.muted} text-sm mt-1`}>{s.subtitle}</p>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-black/10 pb-px">
          {TABS.map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 ${tab === tb.id ? `${theme.accent} border-current font-semibold` : `${theme.muted} border-transparent`}`}>
              {tb.label}{tb.badge ? ` (${tb.badge})` : ""}
            </button>
          ))}
        </div>

        {loading ? <p className={theme.muted}>…</p> : (
          <>
            {/* ── KORISNICI I ULOGE - tabovi po roli, isti stil kao Hifz Tracker
                (Po džuzevima|Po surama|Po stranicama): klik na tab = SAMO ta
                grupa, "Svi korisnici" dugme desno vraća neisfiltrirano ── */}
            {tab === "users" && (
              <div className="space-y-3">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={s.search}
                  className={`w-full ${theme.card} rounded-2xl px-4 py-3 text-sm outline-none`} />

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 sm:gap-3 text-sm font-semibold select-none overflow-x-auto pb-1">
                    {[
                      { id: "korisnik", label: s.groupPlain },
                      { id: "mualim", label: s.groupMualim },
                      { id: "moderator", label: s.groupModerator },
                      { id: "blogger", label: s.groupBlogger },
                    ].map((g, idx) => (
                      <span key={g.id} className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        {idx > 0 && <span className={`opacity-20 pointer-events-none ${theme.muted}`}>|</span>}
                        <button onClick={() => setRoleFilter(g.id)}
                          className={`transition-colors hover:opacity-100 whitespace-nowrap
                            ${roleFilter === g.id ? theme.accent : `${theme.muted} opacity-70`}`}>
                          {g.label}
                        </button>
                      </span>
                    ))}
                  </div>
                  <button onClick={() => setRoleFilter(null)}
                    className={`shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all whitespace-nowrap
                      ${!roleFilter ? `${theme.button} border-transparent` : `${theme.cardSub} ${theme.muted} hover:opacity-80`}`}>
                    {s.groupAll}
                  </button>
                </div>

                {(() => {
                  const inGroup = (p) => {
                    const userRoles = roles[p.id] || [];
                    if (!roleFilter) return true;
                    if (roleFilter === "korisnik") return !GRANTABLE.some((r) => userRoles.includes(r));
                    return userRoles.includes(roleFilter);
                  };
                  const visible = filtered.filter(inGroup);
                  if (visible.length === 0) return <p className={theme.muted}>{s.noUsers}</p>;
                  return (
                    <div className="space-y-3">
                      {visible.map((p) => {
                        const userRoles = roles[p.id] || [];
                        return (
                          <div key={p.id} className={`${theme.card} rounded-2xl p-4 space-y-2`}>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="min-w-0">
                                <span className="font-medium">{p.full_name || p.id.slice(0, 8)}</span>
                                {p.email && <span className={`block text-xs ${theme.muted}`}>{p.email}</span>}
                                {contactLine(p, s) && <span className={`block text-xs ${theme.muted}`}>{contactLine(p, s)}</span>}
                              </div>
                              <div className="flex gap-1 flex-wrap">
                                {userRoles.map((r) => (
                                  <span key={r} className={`text-[10px] text-white px-2 py-0.5 rounded-full ${ROLE_BOJA[r] || "bg-gray-500"}`}>
                                    {r}{GRANTABLE.includes(r) && (
                                      <button onClick={() => revokeRole(p.id, r)} className="ml-1 opacity-80 hover:opacity-100">✕</button>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {confirmGrant && confirmGrant.userId === p.id ? (
                              <div className={`flex items-center gap-2 flex-wrap text-xs ${theme.muted}`}>
                                <span>{s.grantConfirm(p.full_name || p.email || p.id.slice(0, 8), confirmGrant.role)}</span>
                                <button onClick={() => grantRole(p.id, confirmGrant.role)} className="font-semibold text-green-500">{s.grantYes}</button>
                                <button onClick={() => setConfirmGrant(null)} className={theme.muted}>{s.grantNo}</button>
                              </div>
                            ) : (
                              <div className="flex gap-1.5 flex-wrap">
                                {GRANTABLE.filter((r) => !userRoles.includes(r)).map((r) => (
                                  <button key={r} onClick={() => setConfirmGrant({ userId: p.id, role: r })}
                                    className={`${theme.cardSub} ${theme.muted} rounded-lg px-2.5 py-1 text-xs hover:opacity-80`}>
                                    + {s.grant}: {r}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-black/5">
                              {confirmResetId === p.id ? (
                                <>
                                  <span className={`text-xs ${theme.muted}`}>{s.resetPwConfirm}</span>
                                  <button onClick={() => sendPasswordReset(p)} className="text-xs font-semibold text-red-500">{s.resetPwYes}</button>
                                  <button onClick={() => setConfirmResetId(null)} className={`text-xs ${theme.muted}`}>{s.resetPwNo}</button>
                                </>
                              ) : (
                                <button onClick={() => setConfirmResetId(p.id)} className={`text-xs ${theme.accent}`}>
                                  🔑 {s.resetPw}
                                </button>
                              )}
                              {resetMsg[p.id] && (
                                <span className={`text-xs ${resetMsg[p.id] === s.resetPwSent ? "text-green-500" : "text-amber-500"}`}>
                                  {resetMsg[p.id]}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
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

            {/* ── ZAHTJEVI ZA PROMJENU RODA ── */}
            {tab === "gender" && (
              genderRequests.length === 0 ? <p className={theme.muted}>{s.noGenderRequests}</p> : (
                <div className="space-y-3">
                  {genderRequests.map((r) => {
                    const label = (g) => (g === "musko" ? s.genderMale : g === "zensko" ? s.genderFemale : "—");
                    return (
                      <div key={r.id} className={`${theme.card} rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap`}>
                        <div>
                          <div className="font-medium">{r.profil?.full_name || r.user_id.slice(0, 8)}</div>
                          <div className="text-sm mt-0.5">{s.genderChange(label(r.current_gender), label(r.requested_gender))}</div>
                          <div className={`text-xs mt-1 ${theme.muted}`}>{s.genderReason}: {r.razlog}</div>
                          <div className={`text-xs mt-1 ${theme.muted}`}>{s.requestedAt}: {new Date(r.created_at).toLocaleDateString("bs-BA")}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => decideGender(r, true)} className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2 text-sm">
                            ✓ {s.approve}
                          </button>
                          <button onClick={() => decideGender(r, false)} className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-2 text-sm">
                            ✕ {s.reject}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* ── PODRŠKA ── */}
            {tab === "support" && (
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
