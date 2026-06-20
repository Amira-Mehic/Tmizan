import { useNavigate } from "react-router-dom"
import { useTheme } from "../../context/ThemeContext"
import { getAllPosts, getStoredPosts, CATEGORIES } from "../../constants/blog/MOCK_POSTS"

export default function BloggerDashboard() {
  const { theme }  = useTheme()
  const navigate   = useNavigate()
  const isLight    = theme?.id === "beige_white" || theme?.id === "pink_soft"

  const allPublished = getAllPosts()
  const myPosts      = getStoredPosts()
  const byCategory   = CATEGORIES.filter(c => c.id !== "sve").map(cat => ({
    ...cat,
    count: allPublished.filter(p => p.category === cat.id).length,
  }))

  const tText    = theme?.text    || "text-white"
  const tMuted   = theme?.muted   || "text-white/50"
  const tCard    = theme?.card    || "bg-white/5 border border-white/10"
  const tSubtle  = isLight ? "text-black/30" : "text-white/25"
  const tBorder  = isLight ? "border-black/8" : "border-white/[0.06]"

  return (
    <div className="p-5 sm:p-8 max-w-4xl">

      <div className="mb-8">
        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${tSubtle}`}>Blogger panel</p>
        <h1 className={`text-2xl font-black ${tText}`}>Dashboard</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Ukupno objava", value: allPublished.length, color: "text-[#1D9E75]" },
          { label: "Moje objave", value: myPosts.length, color: "text-[#378ADD]" },
          { label: "Draft", value: myPosts.filter(p => !p.published).length, color: tMuted },
          { label: "Kategorije", value: byCategory.filter(c => c.count > 0).length, color: theme?.accent || "text-white" },
        ].map((s, i) => (
          <div key={i} className={`rounded-2xl border p-5 ${tCard}`}>
            <span className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${tSubtle}`}>{s.label}</span>
            <span className={`text-3xl font-black ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className={`rounded-2xl border p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between ${tCard}`}>
        <div>
          <h3 className={`text-base font-bold mb-1 ${tText}`}>Napiši novu objavu</h3>
          <p className={`text-xs ${tMuted}`}>Kreiraj članak, pregledaj ga i objavi na blogu.</p>
        </div>
        <button
          onClick={() => navigate("/blogger/objave/nova")}
          className={`flex-shrink-0 px-6 py-3 rounded-xl font-bold text-sm ${theme?.button}`}
        >
          + Nova objava
        </button>
      </div>

      {/* Kategorije */}
      <div>
        <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${tSubtle}`}>Objave po kategorijama</h3>
        <div className={`rounded-2xl border overflow-hidden ${tCard}`}>
          {byCategory.map((cat, i) => (
            <div
              key={cat.id}
              className={`flex items-center justify-between px-5 py-3.5 ${i < byCategory.length - 1 ? `border-b ${tBorder}` : ""}`}
            >
              <span className={`text-sm font-semibold ${tText}`}>{cat.label}</span>
              <span className={`text-sm font-black ${cat.count > 0 ? (theme?.accent || "text-white") : tMuted}`}>{cat.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Brzi linkovi */}
      <div className="mt-8 flex gap-3">
        <button
          onClick={() => navigate("/blogger/objave")}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold ${isLight ? "bg-black/8 text-black/60 hover:bg-black/14" : "bg-white/8 text-white/60 hover:bg-white/14"} transition`}
        >
          Sve objave →
        </button>
        <button
          onClick={() => window.open("/blog", "_blank")}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold ${isLight ? "bg-black/8 text-black/60 hover:bg-black/14" : "bg-white/8 text-white/60 hover:bg-white/14"} transition`}
        >
          Pogledaj blog ↗
        </button>
      </div>
    </div>
  )
}
