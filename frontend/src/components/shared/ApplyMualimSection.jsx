// ============================================================================
// "Postani muallim" - sekcija na Home stranici. Namjerno NIJE jednoklikna
// registracija: prijavljeni korisnik popunjava formu (ime, kontakt, iskustvo,
// motivacija - motivacija obavezna), koja ide u postojeći role_requests tok
// i pregleda je admin/moderator (AdminDashboard → tab "Muallim zahtjevi").
// ============================================================================

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/SupaBaseClient";

export default function ApplyMualimSection({ cardNB }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  // "loading" | "guest" | "already" | "pending" | "form"
  const [status, setStatus] = useState("loading");
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [iskustvo, setIskustvo] = useState("");
  const [motivacija, setMotivacija] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [wasRejected, setWasRejected] = useState(false);

  useEffect(() => {
    // Dio istog asinhronog fetch-a statusa prijave ispod (grananje: gost vs. dohvat profila).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!user?.id) { setStatus("guest"); return; }
    let alive = true;
    (async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles").select("full_name, email, role").eq("id", user.id).maybeSingle();
        if (!alive) return;
        setFullName(profile?.full_name || "");
        setContact(profile?.email || user.email || "");
        if (profile?.role === "mualim") { setStatus("already"); return; }

        const { data: req } = await supabase
          .from("role_requests").select("status").eq("user_id", user.id).eq("role", "mualim").maybeSingle();
        if (!alive) return;
        if (req?.status === "na_cekanju") setStatus("pending");
        else if (req?.status === "odobren") setStatus("already");
        else { setWasRejected(req?.status === "odbijen"); setStatus("form"); }
      } catch { if (alive) setStatus("form"); }
    })();
    return () => { alive = false; };
  }, [user?.id, user?.email]);

  const submit = async (e) => {
    e.preventDefault();
    if (!motivacija.trim()) { setError(t("mualimApply.motivationRequired")); return; }
    setSending(true); setError(null);
    const poruka = [
      fullName.trim() && `Ime: ${fullName.trim()}`,
      contact.trim() && `Kontakt: ${contact.trim()}`,
      iskustvo.trim() && `Iskustvo: ${iskustvo.trim()}`,
      `Motivacija: ${motivacija.trim()}`,
    ].filter(Boolean).join("\n");
    try {
      const { error: err } = await supabase.from("role_requests").upsert({
        user_id: user.id, role: "mualim", status: "na_cekanju",
        poruka, decided_by: null, decided_at: null,
      }, { onConflict: "user_id,role" });
      if (err) throw err;
      setStatus("pending");
    } catch {
      setError(t("mualimApply.sendFailed"));
    }
    setSending(false);
  };

  const inp = `${theme.cardSub || theme.card} rounded-xl px-3 py-2 text-sm outline-none`;

  return (
    <section id="postani-mualim" className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
      <div className={`${cardNB} rounded-2xl p-6 sm:p-8 space-y-4`}>
        <div className="text-center">
          <h2 className="text-2xl font-bold">🧑‍🏫 {t("mualimApply.title")}</h2>
          <p className={`text-sm mt-2 ${theme.muted}`}>{t("mualimApply.subtitle")}</p>
        </div>

        {status === "loading" && null}

        {status === "guest" && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <p className={`text-sm ${theme.muted}`}>{t("mualimApply.guestHint")}</p>
            <div className="flex gap-2">
              <button onClick={() => navigate("/login")} className={`${theme.button} rounded-xl px-4 py-2 text-sm font-semibold`}>
                {t("mualimApply.loginBtn")}
              </button>
              <button onClick={() => navigate("/register")} className={`${theme.cardSub || theme.card} rounded-xl px-4 py-2 text-sm font-semibold`}>
                {t("mualimApply.registerBtn")}
              </button>
            </div>
          </div>
        )}

        {status === "already" && (
          <div className="text-center pt-2 space-y-2">
            <p className="text-green-500 font-semibold">{t("mualimApply.alreadyMualim")}</p>
            <button onClick={() => navigate("/mualim/dashboard")} className={`${theme.accent} text-sm font-semibold`}>
              {t("mualimApply.openPanel")}
            </button>
          </div>
        )}

        {status === "pending" && (
          <p className="text-center text-sm text-amber-500 font-semibold pt-2">{t("mualimApply.pending")}</p>
        )}

        {status === "form" && (
          <form onSubmit={submit} className="space-y-3 pt-2">
            {wasRejected && <p className="text-xs text-amber-500 text-center">{t("mualimApply.rejectedHint")}</p>}
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            <div className="grid sm:grid-cols-2 gap-2">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder={t("mualimApply.fullName")} className={inp} />
              <input value={contact} onChange={(e) => setContact(e.target.value)}
                placeholder={t("mualimApply.contact")} className={inp} />
            </div>
            <textarea value={iskustvo} onChange={(e) => setIskustvo(e.target.value)}
              placeholder={t("mualimApply.experience")} rows={2} className={`w-full ${inp} resize-none`} />
            <textarea value={motivacija} onChange={(e) => setMotivacija(e.target.value)}
              placeholder={t("mualimApply.motivation")} rows={3} required className={`w-full ${inp} resize-none`} />
            <div className="text-center">
              <button type="submit" disabled={sending}
                className={`${theme.button} rounded-xl px-8 py-2.5 text-sm font-semibold disabled:opacity-50`}>
                {sending ? "…" : t("mualimApply.submit")}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
