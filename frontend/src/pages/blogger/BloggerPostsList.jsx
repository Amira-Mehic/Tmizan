// ============================================================================
// Lista objava u blogger panelu, s pregledom statusa i ulazom u uređivanje.
// ============================================================================

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../../context/ThemeContext"
import { useAuth } from "../../context/AuthContext"
import { useLang } from "../../context/LanguageContext"
import { CATEGORIES } from "../../constants/blog/MOCK_POSTS"
import { getMyPosts, deletePost } from "../../services/blogService"

const BS_MJESECI = ["januar", "februar", "mart", "april", "maj", "juni", "juli", "avgust", "septembar", "oktobar", "novembar", "decembar"]
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
function fmtDate(iso, lang) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d)) return "—"
  return lang === "en"
    ? `${EN_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
    : `${d.getDate()}. ${BS_MJESECI[d.getMonth()]} ${d.getFullYear()}.`
}

const STR = {
  bs: {
    panelLabel: "Blogger panel", title: "Objave", newPost: "Nova objava",
    all: "Sve", published: "Objavljeno", drafts: (n) => `Draftovi${n ? ` (${n})` : ""}`,
    colTitle: "Naslov", colCategory: "Kategorija", colDate: "Datum", colStatus: "Status", colActions: "Akcije",
    system: "sistem", noPosts: "Nema objava.", writeFirst: "Napiši prvu objavu",
    publishedBadge: "Objavljen", draft: "Draft",
    edit: "Uredi", view: "Pogledaj ↗", delete: "Obriši",
    deleteTitle: "Obriši objavu?", deleteDesc: "Ova akcija se ne može poništiti.", cancel: "Odustani",
  },
  en: {
    panelLabel: "Blogger panel", title: "Posts", newPost: "New post",
    all: "All", published: "Published", drafts: (n) => `Drafts${n ? ` (${n})` : ""}`,
    colTitle: "Title", colCategory: "Category", colDate: "Date", colStatus: "Status", colActions: "Actions",
    system: "system", noPosts: "No posts yet.", writeFirst: "Write your first post",
    publishedBadge: "Published", draft: "Draft",
    edit: "Edit", view: "View ↗", delete: "Delete",
    deleteTitle: "Delete post?", deleteDesc: "This action cannot be undone.", cancel: "Cancel",
  },
}

export default function BloggerPostsList() {
  const { theme }  = useTheme()
  const navigate   = useNavigate()
  const { user }   = useAuth()
  const { lang }   = useLang()
  const s = STR[lang] || STR.bs
  const isLight    = theme?.id === "beige_white" || theme?.id === "pink_soft"

  const [posts, setPosts]       = useState([])
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [filter, setFilter]     = useState("sve")
  const [statusFilter, setStatusFilter] = useState("sve") // "sve" | "objavljeno" | "draft"

  useEffect(() => {
    if (user?.id) getMyPosts(user.id).then(setPosts)
  }, [user?.id])

  const tText    = theme?.text    || "text-white"
  const tMuted   = theme?.muted   || "text-white/50"
  const tCard    = theme?.card    || "bg-white/5 border border-white/10"
  const tSubtle  = isLight ? "text-black/30" : "text-white/25"
  const tBorder  = isLight ? "border-black/8" : "border-white/[0.06]"
  const rowHover = isLight ? "hover:bg-black/[0.02]" : "hover:bg-white/[0.02]"

  const filtered = posts
    .filter(p => filter === "sve" || p.category === filter)
    .filter(p => statusFilter === "sve" || (statusFilter === "draft" ? !p.published : p.published))

  const draftCount = posts.filter(p => !p.published).length

  async function handleDelete(id) {
    await deletePost(id)
    setPosts(prev => prev.filter(p => p.id !== id))
    setDeleteConfirm(null)
  }

  return (
    <div className="p-5 sm:p-8 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${tSubtle}`}>{s.panelLabel}</p>
          <h1 className={`text-2xl font-black ${tText}`}>{s.title}</h1>
        </div>
        <button
          onClick={() => navigate("/blogger/objave/nova")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm ${theme?.button}`}
        >
          <span>+</span>
          <span>{s.newPost}</span>
        </button>
      </div>

      {/* Status filter - Sve / Objavljeno / Draft */}
      <div className="flex flex-wrap gap-2 mb-3">
        {[
          { id: "sve", label: s.all },
          { id: "objavljeno", label: s.published },
          { id: "draft", label: s.drafts(draftCount) },
        ].map(f => {
          const active = statusFilter === f.id
          const base = "px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
          const cls  = active
            ? `${base} ${theme?.button}`
            : `${base} ${isLight ? "bg-black/8 text-black/50 hover:bg-black/14" : "bg-white/8 text-white/50 hover:bg-white/14"}`
          return (
            <button key={f.id} onClick={() => setStatusFilter(f.id)} className={cls}>
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Kategorija filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map(cat => {
          const active = filter === cat.id
          const base = "px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
          const cls  = active
            ? `${base} ${theme?.button}`
            : `${base} ${isLight ? "bg-black/8 text-black/50 hover:bg-black/14" : "bg-white/8 text-white/50 hover:bg-white/14"}`
          return (
            <button key={cat.id} onClick={() => setFilter(cat.id)} className={cls}>
              {lang === "en" ? (cat.labelEn || cat.label) : cat.label}
            </button>
          )
        })}
      </div>

      {/* Tabela - pravi <table>, tako kolone ostaju poravnate (header i sve
          redove računa kao jednu cjelinu, za razliku od zasebnih grid divova) */}
      <div className={`rounded-2xl border overflow-hidden ${tCard}`}>
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <span className="text-3xl opacity-25">📝</span>
            <p className={`text-sm ${tMuted}`}>{s.noPosts}</p>
            <button
              onClick={() => navigate("/blogger/objave/nova")}
              className={`mt-2 px-5 py-2 rounded-full text-xs font-bold ${theme?.button}`}
            >
              {s.writeFirst}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] table-fixed border-collapse">
            <thead>
              <tr className={`border-b ${tBorder}`}>
                <th className={`w-60 text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest ${tSubtle}`}>{s.colTitle}</th>
                <th className={`w-24 text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${tSubtle}`}>{s.colCategory}</th>
                <th className={`w-36 text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${tSubtle}`}>{s.colDate}</th>
                <th className={`w-28 text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${tSubtle}`}>{s.colStatus}</th>
                <th className={`w-64 text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${tSubtle}`}>{s.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((post, idx) => {
                const cat = CATEGORIES.find(c => c.id === post.category)
                const isLast = idx === filtered.length - 1

                return (
                  <tr
                    key={post.id}
                    className={`transition-all ${rowHover} ${!isLast ? `border-b ${tBorder}` : ""}`}
                  >
                    {/* Naslov */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {post.thumbnail && (
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={post.thumbnail} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold truncate ${tText}`}>{post.title}</p>
                          {post._system && (
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${tSubtle} opacity-60`}>{s.system}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Kategorija */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`text-xs font-semibold ${theme?.accent}`}>
                        {(lang === "en" ? (cat?.labelEn || cat?.label) : cat?.label) || post.category}
                      </span>
                    </td>

                    {/* Datum */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`text-xs ${tMuted}`}>{fmtDate(post.date, lang)}</span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {post.published ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#1D9E75]/15 text-[#1D9E75] text-[10px] font-bold">{s.publishedBadge}</span>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${isLight ? "bg-black/8 text-black/40" : "bg-white/8 text-white/40"}`}>{s.draft}</span>
                      )}
                    </td>

                    {/* Akcije */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 justify-end">
                        {!post._system && (
                          <button
                            onClick={() => navigate(`/blogger/objave/edit/${post.id}`)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${isLight ? "hover:bg-black/8 text-black/50" : "hover:bg-white/8 text-white/50"}`}
                          >
                            {s.edit}
                          </button>
                        )}
                        <button
                          onClick={() => window.open(`/blog/${post.slug}`, "_blank")}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${isLight ? "hover:bg-black/8 text-black/50" : "hover:bg-white/8 text-white/50"}`}
                        >
                          {s.view}
                        </button>
                        {!post._system && (
                          <button
                            onClick={() => setDeleteConfirm(post.id)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-[#F58C8C] hover:bg-[#F58C8C]/10 transition-all"
                          >
                            {s.delete}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Confirm delete modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`rounded-2xl border p-7 max-w-sm w-full flex flex-col gap-5 ${tCard}`}>
            <h3 className={`text-base font-bold ${tText}`}>{s.deleteTitle}</h3>
            <p className={`text-sm ${tMuted}`}>{s.deleteDesc}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${isLight ? "bg-black/8 text-black/60" : "bg-white/8 text-white/60"} hover:opacity-70 transition`}
              >
                {s.cancel}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#F58C8C]/20 text-[#F58C8C] hover:bg-[#F58C8C]/30 transition"
              >
                {s.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
