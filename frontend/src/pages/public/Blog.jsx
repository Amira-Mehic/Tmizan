import { useState, useMemo } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useTheme } from "../../context/ThemeContext"
import { getAllPosts, CATEGORIES } from "../../constants/blog/MOCK_POSTS"

function fmtDate(iso, lang = "bs") {
  if (!iso) return ""
  const d = new Date(iso)
  if (lang === "en") return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
  return d.toLocaleDateString("bs-BA", { day: "numeric", month: "long", year: "numeric" })
}

function CategoryBadge({ id, label, active, onClick, theme, isLight }) {
  const base = "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none"
  if (active) return (
    <button onClick={onClick} className={`${base} ${theme.button}`}>{label}</button>
  )
  const inactive = isLight
    ? "bg-black/8 text-black/50 hover:bg-black/14"
    : "bg-white/8 text-white/50 hover:bg-white/14"
  return (
    <button onClick={onClick} className={`${base} ${inactive}`}>{label}</button>
  )
}

function PostCard({ post, theme, isLight, lang, navigate }) {
  const tCard   = theme.card
  const tText   = theme.text
  const tMuted  = theme.muted
  const tAccent = theme.accent
  const cat = CATEGORIES.find(c => c.id === post.category)

  return (
    <button
      onClick={() => navigate(`/blog/${post.slug}`)}
      className={`group flex flex-col rounded-2xl border overflow-hidden text-left transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.99] ${tCard}`}
    >
      {/* Thumbnail */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
        {post.thumbnail ? (
          <img
            src={post.thumbnail}
            alt={lang === "en" ? post.titleEn : post.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center text-4xl ${isLight ? "bg-black/5" : "bg-white/5"}`}>
            📖
          </div>
        )}
        {/* Kategorija badge na slici */}
        {cat && (
          <div className="absolute top-3 left-3">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm ${theme.button}`}>
              {lang === "en" ? cat.labelEn : cat.label}
            </span>
          </div>
        )}
        {post.video && (
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center">
            <span className="text-white text-xs">▶</span>
          </div>
        )}
      </div>

      {/* Sadržaj */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        <h3 className={`text-sm font-bold leading-snug line-clamp-2 group-hover:opacity-80 transition-opacity ${tText}`}>
          {lang === "en" ? (post.titleEn || post.title) : post.title}
        </h3>
        <p className={`text-xs leading-relaxed line-clamp-3 flex-1 ${tMuted}`}>
          {lang === "en" ? (post.excerptEn || post.excerpt) : post.excerpt}
        </p>

        {/* Footer */}
        <div className={`flex items-center justify-between pt-3 border-t ${isLight ? "border-black/8" : "border-white/[0.06]"}`}>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isLight ? "bg-black/10 text-black/60" : "bg-white/10 text-white/60"}`}>
              {(post.author || "?")[0].toUpperCase()}
            </div>
            <span className={`text-[10px] font-semibold ${tMuted}`}>{post.author}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] ${tMuted} opacity-60`}>{fmtDate(post.date, lang)}</span>
            {post.readTime && (
              <span className={`text-[10px] font-semibold ${tAccent}`}>
                {post.readTime} {lang === "en" ? "min" : "min"}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export default function Blog() {
  const { theme } = useTheme()
  const navigate  = useNavigate()
  const isLight   = theme?.id === "beige_white" || theme?.id === "pink_soft"
  const lang      = typeof window !== "undefined"
    ? (localStorage.getItem("tmizan_lang") || "bs")
    : "bs"

  const [activeCategory, setActiveCategory] = useState("sve")
  const [search, setSearch] = useState("")

  const allPosts   = getAllPosts()
  const featured   = allPosts.find(p => p.featured)
  const restPosts  = allPosts.filter(p => !p.featured)

  const filtered = useMemo(() => {
    let posts = activeCategory === "sve" ? restPosts : restPosts.filter(p => p.category === activeCategory)
    if (search.trim()) {
      const q = search.toLowerCase()
      posts = posts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        (p.titleEn || "").toLowerCase().includes(q)
      )
    }
    return posts
  }, [activeCategory, search, restPosts])

  const tText    = theme?.text    || "text-white"
  const tMuted   = theme?.muted   || "text-white/50"
  const tCard    = theme?.card    || "bg-white/5 border border-white/10"
  const tSubtle  = isLight ? "text-black/30" : "text-white/25"
  const cardSubBg     = (theme?.cardSub || "").split(" ").find(c => c.startsWith("bg-")) || ""
  const cardSubBorder = (theme?.cardSub || "").split(" ").find(c => c.startsWith("border-[")) || ""
  const inputCls = isLight
    ? `${cardSubBg} border ${cardSubBorder || "border-black/15"} ${theme?.text || "text-[#2E2016]"} placeholder-black/30 focus:ring-1 focus:ring-black/20`
    : "bg-white/6 border border-white/10 text-white placeholder-white/25 focus:border-white/25"

  const featCat = featured ? CATEGORIES.find(c => c.id === featured.category) : null

  return (
    <div className={`min-h-screen ${theme.bgGradient || "bg-gray-950"} transition-all duration-500`}>

      {/* ── NAV ──────────────────────────────────────────────────────────────── */}
      <nav className={`sticky top-0 z-30 backdrop-blur-md border-b ${isLight ? "border-black/8 bg-white/40" : "border-white/[0.06] bg-black/20"}`}>
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/" className={`text-base font-black ${tText}`}>Tmizan</Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className={`text-xs font-semibold ${tMuted} hover:opacity-70 transition`}>
              {lang === "en" ? "Login" : "Prijava"}
            </Link>
            <Link
              to="/register"
              className={`text-xs font-bold px-4 py-1.5 rounded-full ${theme.button}`}
            >
              {lang === "en" ? "Get started" : "Počni besplatno"}
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-5 py-12">

        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <div className="mb-10">
          <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${tSubtle}`}>
            {lang === "en" ? "Blog" : "Blog"}
          </p>
          <h1 className={`text-4xl font-black mb-3 ${tText}`}>
            {lang === "en" ? "Knowledge & Inspiration" : "Znanje & Inspiracija"}
          </h1>
          <p className={`text-sm leading-relaxed max-w-xl ${tMuted}`}>
            {lang === "en"
              ? "Articles on Hifz, Tajweed, Arabic language and Islamic education."
              : "Članci o hifzu, tedžvidu, arapskom jeziku i islamskom obrazovanju."}
          </p>
        </div>

        {/* ── FEATURED POST ──────────────────────────────────────────────────── */}
        {featured && (
          <button
            onClick={() => navigate(`/blog/${featured.slug}`)}
            className={`group w-full flex flex-col sm:flex-row rounded-2xl border overflow-hidden text-left mb-10 transition-all hover:scale-[1.005] hover:shadow-2xl active:scale-[0.999] ${tCard}`}
          >
            {/* Slika */}
            <div className="relative sm:w-[45%] flex-shrink-0 overflow-hidden" style={{ minHeight: "220px" }}>
              {featured.thumbnail && (
                <img
                  src={featured.thumbnail}
                  alt={lang === "en" ? featured.titleEn : featured.title}
                  className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10" />
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${theme.button}`}>
                  {lang === "en" ? "Featured" : "Istaknuto"}
                </span>
                {featCat && (
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm ${isLight ? "bg-black/20 text-white" : "bg-white/20 text-white"}`}>
                    {lang === "en" ? featCat.labelEn : featCat.label}
                  </span>
                )}
              </div>
            </div>

            {/* Tekst */}
            <div className="flex flex-col justify-center p-7 gap-3 flex-1">
              <h2 className={`text-xl font-black leading-snug group-hover:opacity-80 transition-opacity ${tText}`}>
                {lang === "en" ? (featured.titleEn || featured.title) : featured.title}
              </h2>
              <p className={`text-sm leading-relaxed line-clamp-3 ${tMuted}`}>
                {lang === "en" ? (featured.excerptEn || featured.excerpt) : featured.excerpt}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isLight ? "bg-black/10 text-black/60" : "bg-white/10 text-white/60"}`}>
                  {(featured.author || "?")[0]}
                </div>
                <span className={`text-xs font-semibold ${tMuted}`}>{featured.author}</span>
                <span className={`text-xs ${tSubtle}`}>·</span>
                <span className={`text-xs ${tSubtle}`}>{fmtDate(featured.date, lang)}</span>
                {featured.readTime && (
                  <>
                    <span className={`text-xs ${tSubtle}`}>·</span>
                    <span className={`text-xs font-semibold ${theme.accent}`}>{featured.readTime} min</span>
                  </>
                )}
              </div>
            </div>
          </button>
        )}

        {/* ── FILTER + SEARCH ────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex flex-wrap gap-2 flex-1">
            {CATEGORIES.map(cat => (
              <CategoryBadge
                key={cat.id}
                id={cat.id}
                label={lang === "en" ? cat.labelEn : cat.label}
                active={activeCategory === cat.id}
                onClick={() => setActiveCategory(cat.id)}
                theme={theme}
                isLight={isLight}
              />
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === "en" ? "Search articles..." : "Pretraži članke..."}
            className={`w-full sm:w-60 px-4 py-2 rounded-xl text-sm outline-none transition-all ${inputCls}`}
          />
        </div>

        {/* ── GRID POSTOVA ───────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <span className="text-4xl opacity-30">🔍</span>
            <p className={`text-sm ${tMuted}`}>
              {lang === "en" ? "No articles found." : "Nema pronađenih članaka."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(post => (
              <PostCard
                key={post.id}
                post={post}
                theme={theme}
                isLight={isLight}
                lang={lang}
                navigate={navigate}
              />
            ))}
          </div>
        )}

        {/* ── FOOTER CTA ─────────────────────────────────────────────────────── */}
        <div className={`mt-20 rounded-2xl border p-8 text-center ${tCard}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${tSubtle}`}>Tmizan</p>
          <h3 className={`text-2xl font-black mb-3 ${tText}`}>
            {lang === "en" ? "Start your Hifz journey today" : "Počni svoje hifz putovanje danas"}
          </h3>
          <p className={`text-sm ${tMuted} mb-6 max-w-md mx-auto`}>
            {lang === "en"
              ? "Track your progress, connect with a teacher and build consistency."
              : "Prati napredak, poveži se s mualimom i izgradite kontinuitet."}
          </p>
          <Link
            to="/register"
            className={`inline-block px-8 py-3 rounded-full font-bold text-sm ${theme.button}`}
          >
            {lang === "en" ? "Create free account" : "Kreiraj besplatan račun"}
          </Link>
        </div>

      </div>
    </div>
  )
}
