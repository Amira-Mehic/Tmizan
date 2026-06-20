import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../../context/ThemeContext"
import { MOCK_POSTS, getStoredPosts, deletePost, CATEGORIES } from "../../constants/blog/MOCK_POSTS"

function fmtDate(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("bs-BA", { day: "numeric", month: "short", year: "numeric" })
}

export default function BloggerPostsList() {
  const { theme }  = useTheme()
  const navigate   = useNavigate()
  const isLight    = theme?.id === "beige_white" || theme?.id === "pink_soft"

  const [posts, setPosts]       = useState([])
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [filter, setFilter]     = useState("sve")

  useEffect(() => {
    const stored = getStoredPosts()
    // Kombiniraj mock + localStorage, označi mock kao "sistem"
    const mockWithFlag = MOCK_POSTS.map(p => ({ ...p, _system: true }))
    setPosts([...stored, ...mockWithFlag])
  }, [])

  const tText    = theme?.text    || "text-white"
  const tMuted   = theme?.muted   || "text-white/50"
  const tCard    = theme?.card    || "bg-white/5 border border-white/10"
  const tSubtle  = isLight ? "text-black/30" : "text-white/25"
  const tBorder  = isLight ? "border-black/8" : "border-white/[0.06]"
  const rowHover = isLight ? "hover:bg-black/[0.02]" : "hover:bg-white/[0.02]"

  const filtered = filter === "sve" ? posts : posts.filter(p => p.category === filter)

  function handleDelete(id) {
    deletePost(id)
    setPosts(prev => prev.filter(p => p.id !== id))
    setDeleteConfirm(null)
  }

  return (
    <div className="p-5 sm:p-8 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${tSubtle}`}>Blogger panel</p>
          <h1 className={`text-2xl font-black ${tText}`}>Objave</h1>
        </div>
        <button
          onClick={() => navigate("/blogger/objave/nova")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm ${theme?.button}`}
        >
          <span>+</span>
          <span>Nova objava</span>
        </button>
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
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Tabela */}
      <div className={`rounded-2xl border overflow-hidden ${tCard}`}>
        {/* Header reda */}
        <div className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b ${tBorder}`}>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${tSubtle}`}>Naslov</span>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${tSubtle}`}>Kategorija</span>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${tSubtle}`}>Datum</span>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${tSubtle}`}>Status</span>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${tSubtle}`}>Akcije</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <span className="text-3xl opacity-25">📝</span>
            <p className={`text-sm ${tMuted}`}>Nema objava.</p>
            <button
              onClick={() => navigate("/blogger/objave/nova")}
              className={`mt-2 px-5 py-2 rounded-full text-xs font-bold ${theme?.button}`}
            >
              Napiši prvu objavu
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((post, idx) => {
              const cat = CATEGORIES.find(c => c.id === post.category)
              const isLast = idx === filtered.length - 1

              return (
                <div
                  key={post.id}
                  className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-4 transition-all ${rowHover} ${!isLast ? `border-b ${tBorder}` : ""}`}
                >
                  {/* Naslov */}
                  <div className="flex items-center gap-3 min-w-0">
                    {post.thumbnail && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={post.thumbnail} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${tText}`}>{post.title}</p>
                      {post._system && (
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${tSubtle} opacity-60`}>sistem</span>
                      )}
                    </div>
                  </div>

                  {/* Kategorija */}
                  <span className={`text-xs font-semibold flex-shrink-0 ${theme?.accent}`}>
                    {cat?.label || post.category}
                  </span>

                  {/* Datum */}
                  <span className={`text-xs flex-shrink-0 ${tMuted}`}>{fmtDate(post.date)}</span>

                  {/* Status */}
                  <div className="flex-shrink-0">
                    {post.published ? (
                      <span className="px-2.5 py-1 rounded-full bg-[#1D9E75]/15 text-[#1D9E75] text-[10px] font-bold">Objavljen</span>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${isLight ? "bg-black/8 text-black/40" : "bg-white/8 text-white/40"}`}>Draft</span>
                    )}
                  </div>

                  {/* Akcije */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!post._system && (
                      <button
                        onClick={() => navigate(`/blogger/objave/edit/${post.id}`)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${isLight ? "hover:bg-black/8 text-black/50" : "hover:bg-white/8 text-white/50"}`}
                      >
                        Uredi
                      </button>
                    )}
                    <button
                      onClick={() => window.open(`/blog/${post.slug}`, "_blank")}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${isLight ? "hover:bg-black/8 text-black/50" : "hover:bg-white/8 text-white/50"}`}
                    >
                      Pogledaj ↗
                    </button>
                    {!post._system && (
                      <button
                        onClick={() => setDeleteConfirm(post.id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg text-[#F58C8C] hover:bg-[#F58C8C]/10 transition-all"
                      >
                        Obriši
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirm delete modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`rounded-2xl border p-7 max-w-sm w-full flex flex-col gap-5 ${tCard}`}>
            <h3 className={`text-base font-bold ${tText}`}>Obriši objavu?</h3>
            <p className={`text-sm ${tMuted}`}>Ova akcija se ne može poništiti.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${isLight ? "bg-black/8 text-black/60" : "bg-white/8 text-white/60"} hover:opacity-70 transition`}
              >
                Odustani
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#F58C8C]/20 text-[#F58C8C] hover:bg-[#F58C8C]/30 transition"
              >
                Obriši
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
