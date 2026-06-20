import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTheme } from "../../context/ThemeContext"
import { savePost, getStoredPosts, CATEGORIES } from "../../constants/blog/MOCK_POSTS"

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

function FormatToolbar({ textareaRef, value, onChange, isLight, tMuted, cardSubBg }) {
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
      <button type="button" onClick={() => apply("## ", "", true)} className={btn} title="Naslov (H2)">H2</button>
      <button type="button" onClick={() => apply("### ", "", true)} className={btn} title="Podnaslovi (H3)">H3</button>
      <div className={divider} />
      <button type="button" onClick={() => apply("**", "**")} className={`${btn} font-black`} title="Bold">B</button>
      <button type="button" onClick={() => apply("*", "*")} className={`${btn} italic`} title="Italic">I</button>
      <div className={divider} />
      <button type="button" onClick={() => apply("- ", "", true)} className={btn} title="Lista">• Lista</button>
      <div className={divider} />
      <button type="button" onClick={() => apply("---", "", true)} className={btn} title="Separator">—</button>
      <div className="flex-1" />
      <span className={`text-[9px] ${tMuted} opacity-50`}>Markdown</span>
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
  const { id }       = useParams()   // undefined za novu objavu
  const isLight      = theme?.id === "beige_white" || theme?.id === "pink_soft"
  const isEdit       = Boolean(id)

  const [form, setForm]       = useState({ ...EMPTY_POST, id: genId() })
  const [activeTab, setTab]   = useState("bs")   // "bs" | "en"
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [preview, setPreview] = useState(false)
  const textareaRef           = useRef(null)

  // Ako je edit mode, učitaj post iz localStorage
  useEffect(() => {
    if (isEdit) {
      const stored = getStoredPosts()
      const found  = stored.find(p => p.id === id)
      if (found) setForm(found)
      else navigate("/blogger/objave")
    }
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

  function handleSave(publish = null) {
    setSaving(true)
    const toSave = {
      ...form,
      published: publish !== null ? publish : form.published,
    }
    savePost(toSave)
    setTimeout(() => {
      setSaving(false)
      setSaved(true)
    }, 400)
  }

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
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${tSubtle}`}>Blogger panel</p>
          <h1 className={`text-2xl font-black ${tText}`}>
            {isEdit ? "Uredi objavu" : "Nova objava"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/blogger/objave")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${isLight ? "bg-black/8 text-black/60 hover:bg-black/14" : "bg-white/8 text-white/60 hover:bg-white/14"}`}
          >
            ← Natrag
          </button>
          <button
            onClick={() => setPreview(v => !v)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${preview ? (theme?.button || "") : (isLight ? "bg-black/8 text-black/60 hover:bg-black/14" : "bg-white/8 text-white/60 hover:bg-white/14")}`}
          >
            {preview ? "Uredi" : "Pregled"}
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${isLight ? "bg-black/8 text-black/60 hover:bg-black/14" : "bg-white/8 text-white/60 hover:bg-white/14"}`}
          >
            {saving ? "..." : saved ? "✓ Sačuvano" : "Spremi draft"}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !form.title}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40 ${theme?.button}`}
          >
            {form.published ? "Ažuriraj" : "Objavi"}
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
                {CATEGORIES.find(c => c.id === form.category)?.label}
              </span>
            )}
          </div>
          <h1 className={`text-3xl font-black mt-4 mb-3 ${tText}`}>{form.title || "Naslov objave"}</h1>
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
                <p className={`text-[10px] mt-1.5 ${tSubtle}`}>Slug: /blog/{form.slug}</p>
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
              <label className={labelCls}>Kategorija</label>
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
                      {cat.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Thumbnail */}
            <div className={`rounded-xl border p-4 ${tCard}`}>
              <label className={labelCls}>Thumbnail (URL slike)</label>
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
              <label className={labelCls}>Video (YouTube embed URL)</label>
              <input
                type="url"
                value={form.video}
                onChange={e => set("video", e.target.value)}
                placeholder="https://www.youtube.com/embed/..."
                className={inputCls}
              />
              <p className={`text-[10px] mt-1.5 ${tSubtle} opacity-70`}>
                Koristi /embed/ link (ne standardni YouTube link)
              </p>
            </div>

            {/* Autor + Datum + Čitanje */}
            <div className={`rounded-xl border p-4 flex flex-col gap-4 ${tCard}`}>
              <div>
                <label className={labelCls}>Autor</label>
                <input
                  type="text"
                  value={form.author}
                  onChange={e => set("author", e.target.value)}
                  placeholder="Ime autora..."
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Datum objave</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => set("date", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Procijenjeno čitanje (minuti)</label>
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
              <label className={`${labelCls} mb-0`}>Opcije</label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={e => set("featured", e.target.checked)}
                  className="accent-[#1D9E75] w-4 h-4"
                />
                <span className={`text-xs font-semibold ${tText}`}>Istaknuta objava (featured)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={e => set("published", e.target.checked)}
                  className="accent-[#1D9E75] w-4 h-4"
                />
                <span className={`text-xs font-semibold ${tText}`}>Objavljen (vidljiv na blogu)</span>
              </label>
            </div>

            {/* Slug (ručna kontrola) */}
            <div className={`rounded-xl border p-4 ${tCard}`}>
              <label className={labelCls}>URL slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={e => set("slug", e.target.value)}
                placeholder="url-clanka"
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
