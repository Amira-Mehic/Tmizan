// ============================================================================
// Admin panel - upravljanje geo-ciljanim oglasima (advertisements tabela).
// BanerSlot.jsx (komponenta koja stvarno prikazuje oglase korisnicima) čita
// position/is_active/target_country/target_city/target_region/image_url/
// target_url/title odavde - ovaj panel je jedini način da se ti redovi
// unesu bez ručnog rada u Supabase Studiju.
// Pozicije su fiksne (odgovaraju stvarnim mjestima u UI-u): lijevo/desno su
// bočni baneri na javnim/gostinjskim stranicama i u sidebaru za prijavljene
// korisnike (SidebarLayout.jsx), mobitel je mala traka na vrhu na malim
// ekranima.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useLang } from "../../context/LanguageContext";
import { supabase } from "../../services/SupaBaseClient";
import BackButton from "../../components/shared/BackButton";
import LokacijaPicker from "../../components/shared/LokacijaPicker";
import { regijaZaGrad } from "../../constants/lokacija";

const STR = {
  bs: {
    title: "Oglasi", subtitle: "Geo-ciljano oglašavanje — kreiranje i upravljanje banerima",
    newAd: "+ Novi oglas", noAds: "Još nema oglasa.",
    position: "Pozicija", pos_lijevo: "Lijevo (bočni baner)", pos_desno: "Desno (bočni baner)", pos_mobitel: "Mobitel (traka)",
    imageUpload: "Slika", chooseFile: "Odaberi sliku…", uploading: "Učitavanje…", uploaded: "Slika učitana",
    uploadError: "Upload nije uspio — probaj ponovo ili manju sliku.", orPasteUrl: "ili zalijepi URL slike ručno",
    targetUrl: "Odredišni link", targetUrlHint: "Gdje korisnik ide kada klikne oglas.",
    adTitle: "Naziv (interno + alt tekst)", adTitleHint: "Nije javno istaknut, koristi se kao alt tekst slike.",
    targeting: "Geo-ciljanje (ostavi prazno = svi)",
    country: "Država", countryHint: "ISO kod, npr. BA, HR, RS…", city: "Grad", region: "Regija/kanton",
    targetingHint: "Regija se popunjava sama iz odabranog grada. Bez grada oglas cilja cijelu državu, bez države vide ga svi.",
    priority: "Prioritet", priorityHint: "Veći broj = prednost kad više oglasa odgovara istoj poziciji i lokaciji.",
    active: "Aktivan", inactive: "Neaktivan",
    save: "Sačuvaj", cancel: "Odustani", edit: "Uredi", delete: "Obriši",
    deleteConfirm: "Sigurno obrisati ovaj oglas?", deleteYes: "Da, obriši", deleteNo: "Odustani",
    preview: "Pregled", noImage: "Nema slike još",
    global: "Svugdje (bez ciljanja)", savedError: "Greška pri čuvanju — provjeri unesene podatke.",
  },
  en: {
    title: "Ads", subtitle: "Geo-targeted advertising — create and manage banners",
    newAd: "+ New ad", noAds: "No ads yet.",
    position: "Position", pos_lijevo: "Left (side banner)", pos_desno: "Right (side banner)", pos_mobitel: "Mobile (strip)",
    imageUpload: "Image", chooseFile: "Choose image…", uploading: "Uploading…", uploaded: "Image uploaded",
    uploadError: "Upload failed — try again or a smaller image.", orPasteUrl: "or paste an image URL manually",
    targetUrl: "Target link", targetUrlHint: "Where the user goes when they click the ad.",
    adTitle: "Name (internal + alt text)", adTitleHint: "Not publicly shown, used as the image's alt text.",
    targeting: "Geo-targeting (leave empty = everyone)",
    country: "Country", countryHint: "ISO code, e.g. BA, HR, RS…", city: "City", region: "Region",
    targetingHint: "The region is filled in automatically from the selected city. Without a city the ad targets the whole country; without a country everyone sees it.",
    priority: "Priority", priorityHint: "Higher number wins when several ads match the same position and location.",
    active: "Active", inactive: "Inactive",
    save: "Save", cancel: "Cancel", edit: "Edit", delete: "Delete",
    deleteConfirm: "Delete this ad?", deleteYes: "Yes, delete", deleteNo: "Cancel",
    preview: "Preview", noImage: "No image yet",
    global: "Everywhere (no targeting)", savedError: "Couldn't save — check the fields.",
  },
};

const POSITIONS = ["lijevo", "desno", "mobitel"];

const EMPTY_FORM = {
  position: "lijevo", image_url: "", target_url: "", title: "",
  target_country: "", target_city: "", target_region: "", priority: 0, is_active: true,
};

export default function AdminAdsManager() {
  const { theme } = useTheme();
  const { lang } = useLang();
  const s = STR[lang] || STR.bs;

  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // "new" | id | null
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [errorDetail, setErrorDetail] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("advertisements").select("*")
      .order("position", { ascending: true }).order("priority", { ascending: false });
    setAds(data || []);
    setLoading(false);
  }, []);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const startNew = () => { setForm(EMPTY_FORM); setError(false); setEditingId("new"); };
  const startEdit = (ad) => {
    setForm({
      position: ad.position || "lijevo", image_url: ad.image_url || "", target_url: ad.target_url || "",
      title: ad.title || "", target_country: ad.target_country || "", target_city: ad.target_city || "",
      target_region: ad.target_region || "", priority: ad.priority ?? 0, is_active: !!ad.is_active,
    });
    setError(false);
    setEditingId(ad.id);
  };
  const cancelEdit = () => { setEditingId(null); setForm(EMPTY_FORM); setError(false); };

  const save = async () => {
    if (!form.image_url.trim() || !form.target_url.trim()) { setError(true); setErrorDetail(""); return; }
    setSaving(true);
    setError(false);
    setErrorDetail("");
    const payload = {
      position: form.position,
      image_url: form.image_url.trim(),
      target_url: form.target_url.trim(),
      title: form.title.trim() || null,
      target_country: form.target_country.trim().toUpperCase() || null,
      target_city: form.target_city.trim() || null,
      // Regija se izvodi iz grada, ne unosi se ručno (constants/lokacija.js).
      target_region: regijaZaGrad(form.target_country, form.target_city) || null,
      priority: Number(form.priority) || 0,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };
    const { error: err } = editingId === "new"
      ? await supabase.from("advertisements").insert(payload)
      : await supabase.from("advertisements").update(payload).eq("id", editingId);
    setSaving(false);
    if (err) {
      console.error("advertisements save:", err);
      setError(true);
      setErrorDetail(err.message || err.hint || err.details || "");
      return;
    }
    cancelEdit();
    load();
  };

  const toggleActive = async (ad) => {
    await supabase.from("advertisements").update({ is_active: !ad.is_active }).eq("id", ad.id);
    load();
  };

  const remove = async (id) => {
    setConfirmDeleteId(null);
    await supabase.from("advertisements").delete().eq("id", id);
    load();
  };

  const isEditing = editingId !== null;

  return (
    <div className={`min-h-screen ${theme.text} px-4 py-6 sm:px-6 lg:px-10`}>
      <div className="max-w-4xl mx-auto space-y-5">
        <BackButton />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">📢 {s.title}</h1>
            <p className={`${theme.muted} text-sm mt-1`}>{s.subtitle}</p>
          </div>
          {!isEditing && (
            <button onClick={startNew} className={`${theme.button} rounded-xl px-4 py-2 text-sm font-medium`}>
              {s.newAd}
            </button>
          )}
        </div>

        {isEditing && (
          <AdForm form={form} setForm={setForm} s={s} theme={theme} error={error} errorDetail={errorDetail}
            saving={saving} onSave={save} onCancel={cancelEdit} />
        )}

        {loading ? (
          <p className={theme.muted}>…</p>
        ) : ads.length === 0 && !isEditing ? (
          <p className={theme.muted}>{s.noAds}</p>
        ) : (
          <div className="space-y-3">
            {ads.map((ad) => (
              <AdRow key={ad.id} ad={ad} s={s} theme={theme}
                onEdit={() => startEdit(ad)} onToggle={() => toggleActive(ad)}
                confirmDelete={confirmDeleteId === ad.id}
                onAskDelete={() => setConfirmDeleteId(ad.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onDelete={() => remove(ad.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdForm({ form, setForm, s, theme, error, errorDetail, saving, onSave, onCancel }) {
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const inputCls = `w-full ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`;
  const labelCls = `text-xs font-medium ${theme.muted}`;
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(false);
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: err } = await supabase.storage.from("oglasi").upload(path, file, { cacheControl: "3600" });
    setUploading(false);
    if (err) { setUploadError(true); return; }
    const { data } = supabase.storage.from("oglasi").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
  };

  return (
    <div className={`${theme.card} rounded-2xl p-4 sm:p-5 space-y-4`}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className={labelCls}>{s.position}</label>
            <select value={form.position} onChange={set("position")} className={`${inputCls} mt-1`}>
              {POSITIONS.map((p) => <option key={p} value={p}>{s[`pos_${p}`]}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{s.imageUpload}</label>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <label className={`${theme.cardSub} rounded-xl px-3 py-2 text-sm cursor-pointer hover:opacity-80 ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                {uploading ? s.uploading : s.chooseFile}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
              {form.image_url && !uploading && <span className="text-xs text-green-600">✓ {s.uploaded}</span>}
            </div>
            {uploadError && <p className="text-xs text-red-500 mt-1">{s.uploadError}</p>}
            <details className="mt-1.5">
              <summary className={`text-[11px] ${theme.muted} cursor-pointer`}>{s.orPasteUrl}</summary>
              <input value={form.image_url} onChange={set("image_url")} placeholder="https://…" className={`${inputCls} mt-1.5`} />
            </details>
          </div>
          <div>
            <label className={labelCls}>{s.targetUrl}</label>
            <input value={form.target_url} onChange={set("target_url")} placeholder="https://…" className={`${inputCls} mt-1`} />
            <p className={`text-[11px] mt-0.5 ${theme.muted}`}>{s.targetUrlHint}</p>
          </div>
          <div>
            <label className={labelCls}>{s.adTitle}</label>
            <input value={form.title} onChange={set("title")} className={`${inputCls} mt-1`} />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className={labelCls}>{s.preview}</p>
            <div className={`mt-1 rounded-xl border ${theme.cardSub} h-32 flex items-center justify-center overflow-hidden`}>
              {form.image_url
                ? <img src={form.image_url} alt="" className="max-h-32 max-w-full object-contain" onError={(e) => { e.target.style.display = "none"; }} />
                : <span className={`text-xs ${theme.muted}`}>{s.noImage}</span>}
            </div>
          </div>

          <div>
            <p className={labelCls}>{s.targeting}</p>
            {/* Isti spisak koji korisnik vidi u postavkama - inače se unosi
                razilaze i ciljanje po gradu nikad ne pogodi. Regija se ne
                unosi ručno, izvodi se iz odabranog grada. */}
            <div className="mt-1">
              <LokacijaPicker
                compact
                country={form.target_country}
                city={form.target_city}
                onChange={({ country, city, region }) =>
                  setForm((f) => ({ ...f, target_country: country, target_city: city, target_region: region }))
                }
                countryLabel={s.country}
                cityLabel={s.city}
                labelClass={labelCls}
                inputClass={inputCls}
              />
            </div>
            <p className={`text-[11px] mt-1 ${theme.muted}`}>{s.targetingHint}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className={labelCls}>{s.priority}</label>
              <input type="number" value={form.priority} onChange={set("priority")} className={`${inputCls} mt-1`} />
            </div>
            <label className="flex items-center gap-2 text-sm pb-2">
              <input type="checkbox" checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
              {form.is_active ? s.active : s.inactive}
            </label>
          </div>
          <p className={`text-[11px] ${theme.muted}`}>{s.priorityHint}</p>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{s.savedError}{errorDetail ? ` (${errorDetail})` : ""}</p>}

      <div className="flex gap-2 pt-2 border-t border-black/10">
        <button onClick={onSave} disabled={saving} className={`${theme.button} rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60`}>
          {s.save}
        </button>
        <button onClick={onCancel} className={`${theme.cardSub} ${theme.muted} rounded-xl px-4 py-2 text-sm`}>
          {s.cancel}
        </button>
      </div>
    </div>
  );
}

function AdRow({ ad, s, theme, onEdit, onToggle, confirmDelete, onAskDelete, onCancelDelete, onDelete }) {
  const targeting = [ad.target_country, ad.target_region, ad.target_city].filter(Boolean).join(" / ") || s.global;
  return (
    <div className={`${theme.card} rounded-2xl p-3 sm:p-4 flex items-center gap-3 flex-wrap sm:flex-nowrap`}>
      <div className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden ${theme.cardSub} flex items-center justify-center`}>
        {ad.image_url
          ? <img src={ad.image_url} alt={ad.title || ""} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
          : <span className={`text-[10px] ${theme.muted}`}>—</span>}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{ad.title || ad.target_url}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${theme.cardSub} ${theme.muted}`}>{s[`pos_${ad.position}`] || ad.position}</span>
        </div>
        <div className={`text-xs mt-0.5 ${theme.muted} truncate`}>{targeting}</div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button onClick={onToggle}
          className={`text-[11px] px-2.5 py-1 rounded-full ${ad.is_active ? "bg-green-600 text-white" : `${theme.cardSub} ${theme.muted}`}`}>
          {ad.is_active ? s.active : s.inactive}
        </button>
        <button onClick={onEdit} className={`text-xs ${theme.accent}`}>{s.edit}</button>
        {confirmDelete ? (
          <span className="flex items-center gap-1.5 text-xs">
            <span className={theme.muted}>{s.deleteConfirm}</span>
            <button onClick={onDelete} className="font-semibold text-red-500">{s.deleteYes}</button>
            <button onClick={onCancelDelete} className={theme.muted}>{s.deleteNo}</button>
          </span>
        ) : (
          <button onClick={onAskDelete} className="text-xs text-red-500">{s.delete}</button>
        )}
      </div>
    </div>
  );
}
