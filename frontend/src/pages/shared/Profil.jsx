// ============================================================================
// Profil - uređivanje ličnih podataka, lozinke i pregled uloga
// Zajednička stranica za sve uloge (korisnik/mualim/moderator/blogger/admin).
// Ime, korisničko ime, lokacija, lozinka; rod je READ-ONLY (mijenja se samo
// kroz gender_change_requests - direktan upis blokira i deaktivira profil,
// vidi 0017_rod_i_sigurnost.sql). Za muallime dodatno prikazuje privatni
// mualim kod (0018) za ručno uparivanje suprotnog roda.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/SupaBaseClient";
import BackButton from "../../components/shared/BackButton";
import LokacijaPicker from "../../components/shared/LokacijaPicker";
import { regijaZaGrad, countryName } from "../../constants/lokacija";

const GENDER_LABEL = { musko: "gender_male", zensko: "gender_female" };

export default function Profil() {
  const { t, i18n } = useTranslation();
  const { theme, sectionAccents: SECTION_ACCENTS } = useTheme();
  const { user } = useAuth();

  const [form, setForm] = useState({ full_name: "", country: "", city: "", username: "" });
  const [savedForm, setSavedForm] = useState({ full_name: "", country: "", city: "", username: "" });
  const [editing, setEditing] = useState(false);
  const [roles, setRoles] = useState([]);
  const [gender, setGender] = useState(null);
  const [mualimCode, setMualimCode] = useState(null);
  const [genderRequest, setGenderRequest] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const safe = async (fn, fb) => { try { return await fn(); } catch { return fb; } };
    const [prof, ur, gcr] = await Promise.all([
      safe(async () => {
        const { data } = await supabase
          .from("profiles").select("full_name, country, city, username, role, gender, mualim_code")
          .eq("id", user.id).single();
        return data;
      }, null),
      safe(async () => (await supabase.from("app_user_roles").select("role").eq("user_id", user.id)).data || [], []),
      safe(async () => {
        const { data } = await supabase
          .from("gender_change_requests").select("*")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        return data;
      }, null),
    ]);
    if (prof) {
      const loaded = { full_name: prof.full_name || "", country: prof.country || "", city: prof.city || "", username: prof.username || "" };
      setForm(loaded); setSavedForm(loaded);
      setGender(prof.gender || null);
      const list = ur.map((r) => r.role);
      if (prof.role && !list.includes(prof.role)) list.push(prof.role);
      setRoles(list.length ? list : ["korisnik"]);
      if (prof.mualim_code) {
        setMualimCode(prof.mualim_code);
      } else if (list.includes("mualim")) {
        // kod nikad nije dodijeljen (dodjela uloge se desila prije nego što
        // je trigger za kod postojao, ili je red već postojao pa upsert
        // nije bio insert) - generiši ga sada umjesto da ostane prazan
        safe(async () => {
          const { data } = await supabase.rpc("ensure_my_mualim_code");
          if (data) setMualimCode(data);
        }, null);
      } else {
        setMualimCode(null);
      }
    }
    setGenderRequest(gcr);
    setLoading(false);
  }, [user]);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setSaved(false); setError(""); };

  const save = async () => {
    setError(""); setSaved(false);
    const username = form.username.trim().toLowerCase();
    if (username && !/^[a-z0-9_]{3,20}$/.test(username)) {
      setError(t("profil.usernameInvalid"));
      return;
    }
    try {
      // Regija se ne unosi ručno, izvodi se iz odabranog grada - isto pravilo
      // kao u postavkama, da oba ekrana upisuju lokaciju u istom obliku.
      const region = regijaZaGrad(form.country, form.city);
      const { error: e } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          country: form.country || null,
          city: form.city || null,
          region: region || null,
          username: username || null,
        })
        .eq("id", user.id);
      if (e) {
        if (e.code === "23505") setError(t("profil.usernameTaken"));
        else throw e;
        return;
      }
      const clean = { ...form, username };
      setForm(clean); setSavedForm(clean);
      setSaved(true);
      setEditing(false);
    } catch (e) {
      const detail = e?.message || e?.hint || e?.details || "";
      setError(detail ? `${t("profil.error")} (${detail})` : t("profil.error"));
    }
  };

  const cancelEdit = () => { setForm(savedForm); setError(""); setEditing(false); };

  // ── Lozinka ────────────────────────────────────────────────────────────
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const savePassword = async () => {
    setPwMsg("");
    if (pw1.length < 6) { setPwMsg(t("profil.pwTooShort")); return; }
    if (pw1 !== pw2) { setPwMsg(t("profil.pwMismatch")); return; }
    setPwSaving(true);
    try {
      const { error: e } = await supabase.auth.updateUser({ password: pw1 });
      if (e) throw e;
      setPwMsg(t("profil.pwSaved"));
      setPw1(""); setPw2("");
    } catch (e) {
      const detail = e?.message || "";
      setPwMsg(detail ? `${t("profil.pwError")} (${detail})` : t("profil.pwError"));
    }
    setPwSaving(false);
  };

  // ── Zahtjev za promjenu roda ───────────────────────────────────────────
  const [genderForm, setGenderForm] = useState(false);
  const [genderNew, setGenderNew] = useState("musko");
  const [genderRazlog, setGenderRazlog] = useState("");
  const [genderMsg, setGenderMsg] = useState("");
  const [genderSending, setGenderSending] = useState(false);

  const sendGenderRequest = async () => {
    if (!genderRazlog.trim()) { setGenderMsg(t("profil.genderReasonRequired")); return; }
    setGenderSending(true); setGenderMsg("");
    try {
      const { error: e } = await supabase.from("gender_change_requests").insert({
        user_id: user.id, current_gender: gender, requested_gender: genderNew, razlog: genderRazlog.trim(),
      });
      if (e) throw e;
      setGenderForm(false); setGenderRazlog("");
      load();
    } catch (e) {
      const detail = e?.message || e?.hint || e?.details || "";
      setGenderMsg(detail ? `${t("profil.error")} (${detail})` : t("profil.error"));
    }
    setGenderSending(false);
  };

  const [codeCopied, setCodeCopied] = useState(false);

  return (
    <div className={`min-h-screen ${theme.text} px-4 py-6 sm:px-6 lg:px-10`}>
      <div className="max-w-2xl mx-auto space-y-5">
        <BackButton />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">👤 {t("profil.title")}</h1>
          <p className={`${theme.muted} text-sm mt-1`}>{t("profil.subtitle")}</p>
        </div>

        {loading ? (
          <p className={theme.muted}>…</p>
        ) : (
          <>
            {/* ── Identitet + uloge ────────────────────────────────────── */}
            <div className={`${theme.card} rounded-2xl p-5 space-y-4`}>
              <div className="flex items-center gap-4 justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-16 h-16 rounded-2xl ${theme.logo} flex items-center justify-center text-white text-2xl font-black shrink-0`}>
                    {(savedForm.full_name || "T")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-sm truncate ${theme.muted}`}>{user?.email}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {roles.map((r) => (
                        <span key={r} className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${theme.button}`}>
                          {t(`profil.role_${r}`, r)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {!editing && (
                  <button onClick={() => setEditing(true)} title={t("profil.edit")}
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${theme.cardSub} ${theme.muted} hover:opacity-80`}>
                    ✎
                  </button>
                )}
              </div>

              {editing ? (
                <>
                  <div className="space-y-3 pt-2">
                    <label className="block text-sm">
                      <span className={`${theme.muted} text-xs uppercase tracking-wider`}>{t("profil.fullName")}</span>
                      <input
                        value={form.full_name} onChange={set("full_name")}
                        className={`mt-1 w-full ${theme.cardSub} rounded-xl px-3 py-2.5 text-sm outline-none`}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className={`${theme.muted} text-xs uppercase tracking-wider`}>{t("profil.username")}</span>
                      <input
                        value={form.username} onChange={set("username")} placeholder="npr. amira_h"
                        className={`mt-1 w-full ${theme.cardSub} rounded-xl px-3 py-2.5 text-sm outline-none`}
                      />
                      <span className={`block text-xs mt-1 ${theme.muted}`}>{t("profil.usernameHint")}</span>
                    </label>
                    <LokacijaPicker
                      compact
                      country={form.country}
                      city={form.city}
                      onChange={({ country, city }) => {
                        setForm((f) => ({ ...f, country, city }));
                        setSaved(false); setError("");
                      }}
                      countryLabel={t("profil.country")}
                      cityLabel={t("profil.city")}
                      labelClass={`${theme.muted} text-xs uppercase tracking-wider block mb-1`}
                      inputClass={`w-full ${theme.cardSub} rounded-xl px-3 py-2.5 text-sm outline-none`}
                    />
                    <p className={`text-xs ${theme.muted}`}>{t("profil.locationHint")}</p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button onClick={save} className={`${theme.button} rounded-xl px-6 py-2.5 text-sm font-semibold`}>
                      {t("profil.save")}
                    </button>
                    <button onClick={cancelEdit} className={`text-sm ${theme.muted}`}>
                      {t("profil.cancel")}
                    </button>
                    {saved && <span className="text-sm text-green-500">✓ {t("profil.saved")}</span>}
                    {error && <span className="text-sm text-red-500">{error}</span>}
                  </div>
                </>
              ) : (
                <div className="space-y-3 pt-1">
                  <div>
                    <span className={`${theme.muted} text-xs uppercase tracking-wider`}>{t("profil.fullName")}</span>
                    <p className="text-sm mt-0.5">{savedForm.full_name || "—"}</p>
                  </div>
                  <div>
                    <span className={`${theme.muted} text-xs uppercase tracking-wider`}>{t("profil.username")}</span>
                    <p className="text-sm mt-0.5">{savedForm.username ? `@${savedForm.username}` : "—"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className={`${theme.muted} text-xs uppercase tracking-wider`}>{t("profil.country")}</span>
                      <p className="text-sm mt-0.5">
                        {savedForm.country
                          ? countryName(savedForm.country, i18n.language?.startsWith("en") ? "en" : "bs")
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <span className={`${theme.muted} text-xs uppercase tracking-wider`}>{t("profil.city")}</span>
                      <p className="text-sm mt-0.5">{savedForm.city || "—"}</p>
                      {regijaZaGrad(savedForm.country, savedForm.city) && (
                        <p className={`text-[11px] mt-0.5 ${theme.muted}`}>
                          {regijaZaGrad(savedForm.country, savedForm.city)}
                        </p>
                      )}
                    </div>
                  </div>
                  {saved && <span className="text-sm text-green-500">✓ {t("profil.saved")}</span>}
                </div>
              )}
            </div>

            {/* ── Rod (samo prikaz - mijenja se kroz zahtjev) ─────────────── */}
            <div className={`${theme.card} rounded-2xl p-5 space-y-3`}>
              <h2 className="text-sm font-semibold">{t("profil.genderTitle")}</h2>
              <p className="text-sm">
                {gender ? t(`profil.${GENDER_LABEL[gender]}`) : t("profil.genderNotSet")}
              </p>
              <p className={`text-xs ${theme.muted}`}>{t("profil.genderHint")}</p>

              {genderRequest?.status === "na_cekanju" ? (
                <p className={`text-xs ${theme.muted}`}>
                  {t("profil.genderPending", { rod: t(`profil.${GENDER_LABEL[genderRequest.requested_gender]}`) })}
                </p>
              ) : genderForm ? (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    {["musko", "zensko"].map((g) => (
                      <button key={g} onClick={() => setGenderNew(g)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${genderNew === g ? `${theme.button} border-transparent` : `${theme.cardSub} border-transparent ${theme.muted}`}`}>
                        {t(`profil.${GENDER_LABEL[g]}`)}
                      </button>
                    ))}
                  </div>
                  <textarea value={genderRazlog} onChange={(e) => setGenderRazlog(e.target.value)}
                    placeholder={t("profil.genderReasonPh")} rows={2}
                    className={`w-full ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none resize-none`} />
                  <div className="flex items-center gap-3">
                    <button onClick={sendGenderRequest} disabled={genderSending}
                      className={`${theme.button} rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50`}>
                      {genderSending ? "…" : t("profil.genderSend")}
                    </button>
                    <button onClick={() => setGenderForm(false)} className={`text-xs ${theme.muted}`}>{t("profil.genderCancel")}</button>
                  </div>
                  {genderMsg && <p className="text-xs text-red-500">{genderMsg}</p>}
                </div>
              ) : (
                <button onClick={() => setGenderForm(true)} className={`text-xs ${theme.accent}`}>
                  {t("profil.genderRequestBtn")}
                </button>
              )}
            </div>

            {/* ── Mualim kod (samo za muallime) ───────────────────────────── */}
            {roles.includes("mualim") && mualimCode && (
              <div className={`${theme.card} rounded-2xl p-4 border-l-4 ${SECTION_ACCENTS.mualim.border} flex items-center justify-between gap-3 flex-wrap`}>
                <div>
                  <p className="text-sm font-semibold">{t("mualim.codeTitle")}</p>
                  <p className={`text-xs ${theme.muted} mt-0.5`}>{t("mualim.codeHint")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg tracking-widest px-3 py-1.5 rounded-xl bg-black/5">{mualimCode}</span>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(mualimCode); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 1500); }}
                    className={`${theme.button} rounded-xl px-3 py-1.5 text-xs`}>
                    {codeCopied ? t("mualim.codeCopied") : t("mualim.codeCopy")}
                  </button>
                </div>
              </div>
            )}

            {/* ── Blogger prečica ──────────────────────────────────────────── */}
            {roles.includes("blogger") && (
              <div className={`${theme.card} rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap`}>
                <p className="text-sm">{t("profil.bloggerHint")}</p>
                <Link to="/blogger/objave" className={`${theme.button} rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap`}>
                  {t("profil.bloggerLink")}
                </Link>
              </div>
            )}

            {/* ── Lozinka ──────────────────────────────────────────────────── */}
            <div className={`${theme.card} rounded-2xl p-5 space-y-3`}>
              <h2 className="text-sm font-semibold">{t("profil.pwTitle")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className={`${theme.muted} text-xs uppercase tracking-wider`}>{t("profil.pwNew")}</span>
                  <input type="password" value={pw1} onChange={(e) => { setPw1(e.target.value); setPwMsg(""); }}
                    className={`mt-1 w-full ${theme.cardSub} rounded-xl px-3 py-2.5 text-sm outline-none`} />
                </label>
                <label className="block text-sm">
                  <span className={`${theme.muted} text-xs uppercase tracking-wider`}>{t("profil.pwConfirm")}</span>
                  <input type="password" value={pw2} onChange={(e) => { setPw2(e.target.value); setPwMsg(""); }}
                    className={`mt-1 w-full ${theme.cardSub} rounded-xl px-3 py-2.5 text-sm outline-none`} />
                </label>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={savePassword} disabled={pwSaving || !pw1}
                  className={`${theme.button} rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-50`}>
                  {pwSaving ? "…" : t("profil.pwSave")}
                </button>
                {pwMsg && <span className={`text-sm ${pwMsg === t("profil.pwSaved") ? "text-green-500" : "text-red-500"}`}>{pwMsg}</span>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
