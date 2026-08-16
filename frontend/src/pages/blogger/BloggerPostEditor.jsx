// ============================================================================
// Uređivač blog objave. Sadržaj se piše dvojezično, jer se blog prikazuje na
// jeziku koji je posjetilac odabrao. Objava se može sačuvati kao skica ili
// objaviti, a označava se i kad je tekst preuzet sa strane, da se navede izvor.
// ============================================================================

import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTheme } from "../../context/ThemeContext"
import { useAuth } from "../../context/AuthContext"
import { useLang } from "../../context/LanguageContext"
import { CATEGORIES } from "../../constants/blog/MOCK_POSTS"
import { savePost, getPostById } from "../../services/blogService"

const STR = {
  bs: {
    h2: "Naslov (H2)", h3: "Podnaslovi (H3)", bold: "Bold", italic: "Italic",
    list: "Lista", listBtn: "• Lista", separator: "Separator", markdown: "Markdown",
    panelLabel: "Blogger panel", editTitle: "Uredi objavu", newTitle: "Nova objava",
    autosavedAt: (t) => `Auto-spremljeno u ${t}`,
    back: "← Natrag", edit: "Uredi", preview: "Pregled",
    saving: "...", saved: "✓ Sačuvano", saveDraft: "Spremi draft",
    update: "Ažuriraj", publish: "Objavi",
    defaultPostTitle: "Naslov objave",
    slugLabel: (slug) => `Slug: /blog/${slug}`,
    category: "Kategorija", thumbnail: "Thumbnail (URL slike)",
    video: "Video (YouTube embed URL)", videoHint: "Koristi /embed/ link (ne standardni YouTube link)",
    author: "Autor", authorPh: "Ime autora...",
    publishDate: "Datum objave", readTime: "Procijenjeno čitanje (minuti)",
    options: "Opcije", featured: "Istaknuta objava (featured)", publishedVisible: "Objavljen (vidljiv na blogu)",
    slug: "URL slug", slugPh: "url-clanka",
  },
  en: {
    h2: "Heading (H2)", h3: "Subheading (H3)", bold: "Bold", italic: "Italic",
    list: "List", listBtn: "• List", separator: "Separator", markdown: "Markdown",
    panelLabel: "Blogger panel", editTitle: "Edit post", newTitle: "New post",
    autosavedAt: (t) => `Auto-saved at ${t}`,
    back: "← Back", edit: "Edit", preview: "Preview",
    saving: "...", saved: "✓ Saved", saveDraft: "Save draft",
    update: "Update", publish: "Publish",
    defaultPostTitle: "Post title",
    slugLabel: (slug) => `Slug: /blog/${slug}`,
    category: "Category", thumbnail: "Thumbnail (image URL)",
    video: "Video (YouTube embed URL)", videoHint: "Use the /embed/ link (not a standard YouTube link)",
    author: "Author", authorPh: "Author name...",
    publishDate: "Publish date", readTime: "Estimated read time (minutes)",
    options: "Options", featured: "Featured post", publishedVisible: "Published (visible on blog)",
    slug: "URL slug", slugPh: "article-url",
  },
}

// Umeće tekst na cursor poziciju u textarea
function insertAtCursor(textarea, before, after = "", newline = false) {
  if (!textarea) return ""
  const start = textarea.selectionStart
  const end   = textarea.selectionEnd
  const val   = textarea.value
  const selected = val.slice(start, end)
  const prefix = newline && start > 0 && val[start - 1] !== "\n" ? "\n" : ""
  const suffix = newline ? "\n" : ""
  const insert = `${prefix}${before}${selected || "tekst"}${after}${suffix}`
  const next = val.slice(0, start) + insert + val.slice(end)
  // Postavlja kursor iza umetnutog teksta
  setTimeout(() => {
    const cursor = start + insert.length - (after.length)
    textarea.selectionStart = cursor
    textarea.selectionEnd   = cursor
    textarea.focus()
  }, 0)
  return next
}

function FormatToolbar({ textareaRef, onChange, isLight, tMuted, cardSubBg }) {
  const { lang } = useLang()
  const s = STR[lang] || STR.bs
  const btn = `px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
    isLight ? "hover:bg-black/10 text-black/50 hover:text-black/80" : "hover:bg-white/10 text-white/40 hover:text-white/80"
  }`
  const divider = `w-px h-4 self-center ${isLight ? "bg-black/15" : "bg-white/15"}`

  const apply = (before, after = "", newline = false) => {
    const next = insertAtCursor(textareaRef.current, before, after, newline)
    if (next !== "") onChange(next)
  }

  return (
    <div className={`flex items-center gap-0.5 px-2 py-1.5 rounded-t-xl border-b ${isLight ? `${cardSubBg} border-black/10` : "bg-white/4 border-white/8"}`}>
      <button type="button" onClick={() => apply("## ", "", true)} className={btn} title={s.h2}>H2</button>
      <button type="button" onClick={() => apply("### ", "", true)} className={btn} title={s.h3}>H3</button>
      <div className={divider} />
      <button type="button" onClick={() => apply("**", "**")} className={`${btn} font-black`} title={s.bold}>B</button>
      <button type="button" onClick={() => apply("*", "*")} className={`${btn} italic`} title={s.italic}>I</button>
      <div className={divider} />
      <button type="button" onClick={() => apply("- ", "", true)} className={btn} title={s.list}>{s.listBtn}</button>
      <div className={divider} />
      <button type="button" onClick={() => apply("---", "", true)} className={btn} title={s.separator}>—</button>
      <div className="flex-1" />
      <span className={`text-[9px] ${tMuted} opacity-50`}>{s.markdown}</span>
    </div>
  )
}

function genId() {
  return "post_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7)
}

function genSlug(title) {
  return title
    .toLowerCase()
    .replace(/[čć]/g, "c")
    .replace(/[šđ]/g, s => s === "š" ? "s" : "dj")
    .replace(/ž/g, "z")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
}

const EMPTY_POST = {
  id: "",
  slug: "",
  title: "",
  titleEn: "",
  excerpt: "",
  excerptEn: "",
  content: "",
  contentEn: "",
  thumbnail: "",
  video: "",
  author: "",
  date: new Date().toISOString().split("T")[0],
  category: "hifz",
  readTime: 5,
  featured: false,
  published: false,
}

export default function BloggerPostEditor() {
  const { theme }    = useTheme()
  const navigate     = useNavigate()
  const { user }     = useAuth()
  const { id }       = useParams()   // undefined za novu objavu
  const { lang }     = useLang()
  const s = STR[lang] || STR.bs
  const isLight      = theme?.id === "beige_white" || theme?.id === "pink_soft"
  const isEdit       = Boolean(id)

  const [form, setForm]       = useState({ ...EMPTY_POST, id: genId() })
  const [activeTab, setTab]   = useState("bs")   // "bs" | "en"
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [preview, setPreview] = useState(false)
  const [loaded, setLoaded]   = useState(!isEdit) // za novu objavu odmah spremno, za edit tek kad se učita iz baze
  const [autoSavedAt, setAutoSavedAt] = useState(null)
  const textareaRef           = useRef(null)

  // Prati najnoviji form i da li ima nespremljenih izmjena - koristi ga autosave/unload logika
  // ispod (bez da svaki keystroke ponovo pravi nove event listenere)
  const formRef        = useRef(form)
  const hasUnsavedRef  = useRef(false)
  const autosaveTimer  = useRef(null)
  useEffect(() => { formRef.current = form }, [form])

  // Ako je edit mode, učitaj post iz baze
  useEffect(() => {
    if (isEdit) {
      getPostById(id).then(found => {
        if (found) setForm(found)
        else navigate("/blogger/objave")
        setLoaded(true)
      })
    }
    // Namjerno samo [id] - isEdit je izveden iz id-a, a navigate je stabilna
    // referenca; ponovno uključivanje bi izazvalo nepotrebno ponovno učitavanje.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const set = (key, val) => {
    setForm(prev => {
      const next = { ...prev, [key]: val }
      // Auto-generiši slug iz naslova (samo pri kreiranju)
      if (key === "title" && !isEdit) {
        next.slug = genSlug(val)
      }
      return next
    })
    setSaved(false)
  }

  async function handleSave(publish = null) {
    setSaving(true)
    const toSave = {
      ...form,
      published: publish !== null ? publish : form.published,
    }
    const { data, error } = await savePost(toSave, user?.id)
    setSaving(false)
    if (!error && data) {
      setForm(prev => ({ ...prev, id: data.id })) // upamti pravi DB id (bitno da drugi save ne pravi duplikat)
      setSaved(true)
      hasUnsavedRef.current = false
    }
  }

  // Tiho spremanje kao draft (ne dira published status) - koristi se za auto-save,
  // ne pokazuje "..." na glavnim dugmadima da ne smeta korisniku dok kuca
  const autosave = useRef(async () => {
    const current = formRef.current
    if (!current.title?.trim() && !current.content?.trim()) return // nema šta spremiti
    const { data, error } = await savePost(current, user?.id)
    if (!error && data) {
      setForm(prev => ({ ...prev, id: data.id }))
      hasUnsavedRef.current = false
      setAutoSavedAt(new Date())
    }
  }).current

  // Auto-spremi 3s nakon što korisnik prestane kucati (samo ako ima naslov ili sadržaj)
  useEffect(() => {
    if (!loaded) return
    hasUnsavedRef.current = true
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => { autosave() }, 3000)
    return () => clearTimeout(autosaveTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, form.title, form.titleEn, form.excerpt, form.excerptEn, form.content, form.contentEn, form.category, form.thumbnail, form.video, form.author, form.readTime, form.featured])

  // Spremi draft ako korisnik nenamjerno napusti stranicu - kad tab postane skriven
  // (prebacivanje aplikacije, zatvaranje) i kad se komponenta ukloni (odlazak na drugu
  // rutu unutar aplikacije). beforeunload je "best effort" jer browser može prekinuti
  // mrežni poziv prije nego stigne do baze, ali visibilitychange stigne ranije i pouzdanije.
  useEffect(() => {
    function onHide() {
      if (document.visibilityState === "hidden" && hasUnsavedRef.current) autosave()
    }
    document.addEventListener("visibilitychange", onHide)
    window.addEventListener("beforeunload", onHide)
    return () => {
      document.removeEventListener("visibilitychange", onHide)
      window.removeEventListener("beforeunload", onHide)
      if (hasUnsavedRef.current) autosave() // napustio stranicu unutar app-a (React Router unmount)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tText    = theme?.text    || "text-white"
  const tMuted   = theme?.muted   || "text-white/50"
  const tCard    = theme?.card    || "bg-white/5 border border-white/10"
  const tSubtle  = isLight ? "text-black/30" : "text-white/25"
  const tBorder  = isLight ? "border-black/8" : "border-white/[0.06]"

  // Izvuci bg klasu iz theme.cardSub za input pozadinu (prati temu umjesto sivog overlaya)
  const cardSubBg = (theme?.cardSub || "").split(" ").find(c => c.startsWith("bg-")) || ""
  const cardSubBorder = (theme?.cardSub || "").split(" ").find(c => c.startsWith("border-[")) || ""
  const inputCls = isLight
    ? `w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${cardSubBg} ${cardSubBorder || "border-black/15"} ${tText} placeholder-black/30 focus:ring-1 focus:ring-black/20`
    : `w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all bg-white/[0.06] border border-white/10 text-white placeholder-white/20 focus:border-white/25`
  const labelCls = `block text-[10px] font-bold uppercase tracking-widest mb-2 ${tSubtle}`

  return (
    <div className="p-5 sm:p-8 max-w-5xl">

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 justify-between mb-8">
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${tSubtle}`}>{s.panelLabel}</p>
          <h1 className={`text-2xl font-black ${tText}`}>
            {isEdit ? s.editTitle : s.newTitle}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {autoSavedAt && !saving && (
            <span className={`text-[10px] font-semibold ${tSubtle} hidden sm:inline`}>
              {s.autosavedAt(autoSavedAt.toLocaleTimeString(lang === "en" ? "en-US" : "bs-BA", { hour: "2-digit", minute: "2-digit" }))}
            </span>
          )}
          <button
            onClick={() => navigate("/blogger/objave")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${isLight ? "bg-black/8 text-black/60 hover:bg-black/14" : "bg-white/8 text-white/60 hover:bg-white/14"}`}
          >
            {s.back}
          </button>
          <button
            onClick={() => setPreview(v => !v)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${preview ? (theme?.button || "") : (isLight ? "bg-black/8 text-black/60 hover:bg-black/14" : "bg-white/8 text-white/60 hover:bg-white/14")}`}
          >
            {preview ? s.edit : s.preview}
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${isLight ? "bg-black/8 text-black/60 hover:bg-black/14" : "bg-white/8 text-white/60 hover:bg-white/14"}`}
          >
            {saving ? s.saving : saved ? s.saved : s.saveDraft}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !form.title}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40 ${theme?.button}`}
          >
            {form.published ? s.update : s.publish}
          </button>
        </div>
      </div>

      {/* Preview mode */}
      {preview ? (
        <div className={`rounded-2xl border p-8 ${tCard}`}>
          {form.thumbnail && (
            <div className="w-full rounded-xl overflow-hidden mb-6" style={{ aspectRatio: "16/9" }}>
              <img src={form.thumbnail} alt={form.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="mb-2">
            {CATEGORIES.find(c => c.id === form.category) && (
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${theme?.button}`}>
                {lang === "en"
                  ? (CATEGORIES.find(c => c.id === form.category)?.labelEn || CATEGORIES.find(c => c.id === form.category)?.label)
                  : CATEGORIES.find(c => c.id === form.category)?.label}
              </span>
            )}
          </div>
          <h1 className={`text-3xl font-black mt-4 mb-3 ${tText}`}>{form.title || s.defaultPostTitle}</h1>
          <p className={`text-sm leading-relaxed mb-6 ${tMuted}`}>{form.excerpt}</p>
          <div className={`text-sm leading-relaxed whitespace-pre-wrap ${tMuted}`}>{form.content}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LIJEVO: Glavni sadržaj ─────────────────────────────────────── */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* BS / EN tab */}
            <div className={`flex rounded-xl border overflow-hidden ${tBorder} ${isLight ? "bg-black/4" : "bg-white/4"}`}>
              {["bs", "en"].map(lng => (
                <button
                  key={lng}
                  onClick={() => setTab(lng)}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-all ${
                    activeTab === lng
                      ? (theme?.button || "bg-[#1D9E75] text-white")
                      : `${tMuted} hover:opacity-70`
                  }`}
                >
                  {lng === "bs" ? "Bosanski" : "English"}
                </button>
              ))}
            </div>

            {/* Naslov */}
            <div>
              <label className={labelCls}>{activeTab === "bs" ? "Naslov" : "Title"}</label>
              <input
                type="text"
                value={activeTab === "bs" ? form.title : form.titleEn}
                onChange={e => set(activeTab === "bs" ? "title" : "titleEn", e.target.value)}
                placeholder={activeTab === "bs" ? "Upiši naslov objave..." : "Enter post title..."}
                className={inputCls}
              />
              {activeTab === "bs" && form.slug && (
                <p className={`text-[10px] mt-1.5 ${tSubtle}`}>{s.slugLabel(form.slug)}</p>
              )}
            </div>

            {/* Kratki opis */}
            <div>
              <label className={labelCls}>{activeTab === "bs" ? "Kratki opis (excerpt)" : "Excerpt"}</label>
              <textarea
                value={activeTab === "bs" ? form.excerpt : form.excerptEn}
                onChange={e => set(activeTab === "bs" ? "excerpt" : "excerptEn", e.target.value)}
                placeholder={activeTab === "bs" ? "Kratki opis koji se prikazuje na listi..." : "Short description shown in listing..."}
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Sadržaj */}
            <div>
              <label className={`${labelCls} mb-2`}>{activeTab === "bs" ? "Sadržaj" : "Content"}</label>
              <div className={`rounded-xl border overflow-hidden ${isLight ? "border-black/12" : "border-white/10"}`}>
                <FormatToolbar
                  textareaRef={textareaRef}
                  value={activeTab === "bs" ? form.content : form.contentEn}
                  onChange={next => set(activeTab === "bs" ? "content" : "contentEn", next)}
                  isLight={isLight}
                  tMuted={tMuted}
                  cardSubBg={cardSubBg}
                />
                <textarea
                  ref={textareaRef}
                  value={activeTab === "bs" ? form.content : form.contentEn}
                  onChange={e => set(activeTab === "bs" ? "content" : "contentEn", e.target.value)}
                  placeholder={activeTab === "bs"
                    ? "Upiši sadržaj članka...\n\n## Naslov poglavlja\n\nTekst paragrafa...\n\n- Stavka liste\n- Druga stavka"
                    : "Enter article content..."}
                  rows={18}
                  className={`w-full px-4 py-3 text-sm outline-none resize-none font-mono leading-relaxed ${
                    isLight
                      ? `${cardSubBg} ${tText} placeholder-black/25`
                      : "bg-white/[0.04] text-white placeholder-white/20"
                  }`}
                />
              </div>
            </div>

          </div>

          {/* ── DESNO: Metadata ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* Kategorija */}
            <div className={`rounded-xl border p-4 ${tCard}`}>
              <label className={labelCls}>{s.category}</label>
              <div className="flex flex-col gap-1.5">
                {CATEGORIES.filter(c => c.id !== "sve").map(cat => (
                  <label key={cat.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="category"
                      value={cat.id}
                      checked={form.category === cat.id}
                      onChange={() => set("category", cat.id)}
                      className="accent-[#1D9E75]"
                    />
                    <span className={`text-xs font-semibold group-hover:opacity-70 transition ${form.category === cat.id ? tText : tMuted}`}>
                      {lang === "en" ? (cat.labelEn || cat.label) : cat.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Thumbnail */}
            <div className={`rounded-xl border p-4 ${tCard}`}>
              <label className={labelCls}>{s.thumbnail}</label>
              <input
                type="url"
                value={form.thumbnail}
                onChange={e => set("thumbnail", e.target.value)}
                placeholder="https://..."
                className={inputCls}
              />
              {form.thumbnail && (
                <div className="mt-3 w-full rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  <img src={form.thumbnail} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display="none"} />
                </div>
              )}
            </div>

            {/* Video */}
            <div className={`rounded-xl border p-4 ${tCard}`}>
              <label className={labelCls}>{s.video}</label>
              <input
                type="url"
                value={form.video}
                onChange={e => set("video", e.target.value)}
                placeholder="https://www.youtube.com/embed/..."
                className={inputCls}
              />
              <p className={`text-[10px] mt-1.5 ${tSubtle} opacity-70`}>
                {s.videoHint}
              </p>
            </div>

            {/* Autor + Datum + Čitanje */}
            <div className={`rounded-xl border p-4 flex flex-col gap-4 ${tCard}`}>
              <div>
                <label className={labelCls}>{s.author}</label>
                <input
                  type="text"
                  value={form.author}
                  onChange={e => set("author", e.target.value)}
                  placeholder={s.authorPh}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{s.publishDate}</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => set("date", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{s.readTime}</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={form.readTime}
                  onChange={e => set("readTime", parseInt(e.target.value) || 1)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Opcije */}
            <div className={`rounded-xl border p-4 flex flex-col gap-3 ${tCard}`}>
              <label className={`${labelCls} mb-0`}>{s.options}</label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={e => set("featured", e.target.checked)}
                  className="accent-[#1D9E75] w-4 h-4"
                />
                <span className={`text-xs font-semibold ${tText}`}>{s.featured}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={e => set("published", e.target.checked)}
                  className="accent-[#1D9E75] w-4 h-4"
                />
                <span className={`text-xs font-semibold ${tText}`}>{s.publishedVisible}</span>
              </label>
            </div>

            {/* Slug (ručna kontrola) */}
            <div className={`rounded-xl border p-4 ${tCard}`}>
              <label className={labelCls}>{s.slug}</label>
              <input
                type="text"
                value={form.slug}
                onChange={e => set("slug", e.target.value)}
                placeholder={s.slugPh}
                className={inputCls}
              />
              <p className={`text-[10px] mt-1.5 ${tSubtle} opacity-70`}>/blog/{form.slug || "..."}</p>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
