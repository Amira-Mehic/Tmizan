// ============================================================================
// Javni blog. Objave se filtriraju po kategoriji i pretražuju, a prikazuju se na
// jeziku koji je posjetilac odabrao. Dostupan je i bez prijave.
// ============================================================================

import { useState, useEffect, useMemo, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useTheme } from "../../context/ThemeContext"
import { useAuth } from "../../context/AuthContext"
import { CATEGORIES } from "../../constants/blog/MOCK_POSTS"
import { getAllPosts } from "../../services/blogService"
import PublicHeader from "../../components/layout/PublicHeader"
import SideAds from "../../components/ui/SideAds"
import ParticleBackground from "../../components/shared/ParticleBackground"
import { useLang } from "../../context/LanguageContext"

const BS_MJESECI = ["januar", "februar", "mart", "april", "maj", "juni", "juli", "avgust", "septembar", "oktobar", "novembar", "decembar"]
function fmtDate(iso, lang = "bs") {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d)) return ""
  if (lang === "en") return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
  return `${d.getDate()}. ${BS_MJESECI[d.getMonth()]} ${d.getFullYear()}.`
}

function PostCard({ post, theme, isLight, lang, navigate, cardBg }) {
  const tCard   = theme.card
  const tText   = theme.text
  const tMuted  = theme.muted
  const tAccent = theme.accent
  const cat = CATEGORIES.find(c => c.id === post.category)

  return (
    <button
      onClick={() => navigate(`/blog/${post.slug}`)}
      style={cardBg ? { backgroundColor: cardBg } : undefined}
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
  const { user }  = useAuth()
  const isLight   = theme?.id === "beige_white" || theme?.id === "pink_soft"
  const { lang }  = useLang()  // isti jezik kao ostatak aplikacije

  const [activeCategory, setActiveCategory] = useState("sve")
  const [search, setSearch] = useState("")
  const [allPosts, setAllPosts] = useState([])
  const postsRef = useRef(null)

  useEffect(() => { getAllPosts().then(setAllPosts) }, [])

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

  const heroVideo = "/blog.mp4"

  // Kartice bloga koriste boju kartice direktno iz teme (theme.card), isto kao
  // svuda drugo u aplikaciji - nema više posebne (neusklađene) roze nijanse.
  const blogCardBg = null

  // Tekst NA POZADINI (ne na karticama) - svijetli ako je bgGradient taman
  const bgHex = (theme?.bgGradient || "").match(/#[0-9a-fA-F]{6}/)?.[0] || "#000000"
  const pageDark = (0.299 * parseInt(bgHex.slice(1, 3), 16) + 0.587 * parseInt(bgHex.slice(3, 5), 16) + 0.114 * parseInt(bgHex.slice(5, 7), 16)) < 140
  const pageText = pageDark ? "text-white" : (theme?.text || "text-black")
  const pageMuted = pageDark ? "text-white/60" : (theme?.muted || "text-black/50")

  const featCat = featured ? CATEGORIES.find(c => c.id === featured.category) : null
  const showFeatured = featured && activeCategory === "sve" && !search.trim()

  // Filter po kategoriji + skrol na postove
  const pickCategory = (id) => {
    setActiveCategory(id)
    setTimeout(() => postsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60)
  }

  return (
    <div className={`relative z-0 min-h-screen transition-all duration-500 ${user ? "" : (theme.bgGradient || "bg-gray-950")}`}>
      {!user && <ParticleBackground colors={theme.particleColors} />}

      {/* NAV: gost vidi puni javni header; prijavljeni je već u sidebaru */}
      {!user && <PublicHeader />}
      {/* Bočni oglasi samo za goste (prijavljeni ih imaju kroz sidebar) */}
      {!user && <SideAds theme={theme} />}

      {/* ══════════ HERO - fullscreen video pozadina ══════════ */}
      <section className={`relative min-h-[74vh] flex items-center justify-center overflow-hidden ${!user ? "-mt-[64px] pt-[64px]" : "-mt-4 md:-mt-8 -mx-4 md:-mx-8"}`}>
        <video
          autoPlay muted loop playsInline poster="/hero.jpg"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>

        {/* Tamni sloj - čitljivost teksta */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/65 to-black/85" />

        <div className="relative z-10 w-full max-w-4xl mx-auto px-5 text-center text-white py-24">
          <span className="inline-block border border-white/25 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest backdrop-blur-sm mb-6">
            Blog
          </span>
          <h1 className="text-4xl sm:text-5xl font-black mb-4" style={{ textShadow: "0 2px 24px rgba(0,0,0,.55)" }}>
            {lang === "en" ? "Knowledge & Inspiration" : "Znanje & Inspiracija"}
          </h1>
          <p className="text-base sm:text-lg text-white/85 max-w-2xl mx-auto mb-8 leading-relaxed">
            {lang === "en"
              ? "Articles on Hifz, Tajweed, Arabic language and Islamic education."
              : "Članci o hifzu, tedžvidu, arapskom jeziku i islamskom obrazovanju."}
          </p>

          {/* pretraga */}
          <div className="max-w-md mx-auto mb-8">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={lang === "en" ? "Search articles..." : "Pretraži članke..."}
              className="w-full px-5 py-3 rounded-full text-sm text-white placeholder-white/55 bg-white/10 border border-white/25 backdrop-blur-sm outline-none focus:border-white/50 focus:bg-white/15 transition-all"
            />
          </div>

          {/* VRSTE POSTOVA - istaknuti linkovi */}
          <div className="flex flex-wrap justify-center gap-2.5">
            {CATEGORIES.map(cat => {
              const active = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => pickCategory(cat.id)}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                    active
                      ? `${theme.button} scale-105 shadow-lg`
                      : "bg-white/10 text-white hover:bg-white/20 border border-white/25 backdrop-blur-sm"
                  }`}
                >
                  {lang === "en" ? cat.labelEn : cat.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* strelica nadolje */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 animate-bounce">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </section>

      {/* ══════════ SADRŽAJ ══════════ */}
      {/* Prijavljen: puna širina do oglasa; gost: centriran */}
      <div ref={postsRef} className={`${user ? "max-w-none" : "max-w-6xl"} mx-auto px-5 py-14 scroll-mt-20`}>

        {/* ── ISTAKNUTI POST (samo na "Sve", bez pretrage) ── */}
        {showFeatured && (
          <button
            onClick={() => navigate(`/blog/${featured.slug}`)}
            style={blogCardBg ? { backgroundColor: blogCardBg } : undefined}
            className={`group w-full flex flex-col sm:flex-row rounded-2xl border overflow-hidden text-left mb-12 transition-all hover:scale-[1.005] hover:shadow-2xl active:scale-[0.999] ${tCard}`}
          >
            <div className="relative sm:w-[48%] flex-shrink-0 overflow-hidden" style={{ minHeight: "260px" }}>
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
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm bg-white/20 text-white">
                    {lang === "en" ? featCat.labelEn : featCat.label}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-center p-8 gap-3 flex-1">
              <h2 className={`text-2xl font-black leading-snug group-hover:opacity-80 transition-opacity ${tText}`}>
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

        {/* ── NASLOV SEKCIJE + BROJAČ ── */}
        <div className="flex items-end justify-between mb-6">
          <h2 className={`text-2xl font-black ${pageText}`}>
            {activeCategory === "sve"
              ? (lang === "en" ? "Latest articles" : "Najnoviji članci")
              : (CATEGORIES.find(c => c.id === activeCategory)?.[lang === "en" ? "labelEn" : "label"])}
          </h2>
          <span className={`text-sm font-semibold ${pageMuted}`}>
            {filtered.length} {lang === "en" ? "articles" : (filtered.length === 1 ? "članak" : "članaka")}
          </span>
        </div>

        {/* ── GRID POSTOVA ── */}
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <span className="text-4xl opacity-30">🔍</span>
            <p className={`text-sm ${pageMuted}`}>
              {lang === "en" ? "No articles found." : "Nema pronađenih članaka."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(post => (
              <PostCard
                key={post.id}
                post={post}
                theme={theme}
                isLight={isLight}
                lang={lang}
                navigate={navigate}
                cardBg={blogCardBg}
              />
            ))}
          </div>
        )}

        {/* ── FOOTER CTA ── */}
        <div style={blogCardBg ? { backgroundColor: blogCardBg } : undefined} className={`mt-20 rounded-2xl border p-8 text-center ${tCard}`}>
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

      {/* ══════════ FOOTER ══════════ */}
      <footer className={`border-t ${pageDark ? "border-white/10" : "border-black/10"}`}>
        <div className="max-w-6xl mx-auto px-5 py-12 grid sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-8 h-8 rounded-lg ${theme.logo} flex items-center justify-center text-white font-black`}>T</span>
              <span className={`font-black text-lg ${pageText}`}>Tmizan</span>
            </div>
            <p className={`text-sm leading-relaxed ${pageMuted}`}>
              {lang === "en" ? "Your hifz journey, in one place." : "Tvoj put hifza, na jednom mjestu."}
            </p>
          </div>

          <div>
            <h4 className={`font-bold text-sm mb-3 ${pageText}`}>{lang === "en" ? "Explore" : "Istraži"}</h4>
            <ul className={`space-y-2 text-sm ${pageMuted}`}>
              <li><Link to="/" className="hover:opacity-70">{lang === "en" ? "Home" : "Početna"}</Link></li>
              <li><Link to="/blog" className="hover:opacity-70">Blog</Link></li>
              <li><a href="/#funkcije" className="hover:opacity-70">{lang === "en" ? "Features" : "Funkcije"}</a></li>
              <li><a href="/#metode" className="hover:opacity-70">{lang === "en" ? "Methods" : "Metode"}</a></li>
            </ul>
          </div>

          <div>
            <h4 className={`font-bold text-sm mb-3 ${pageText}`}>{lang === "en" ? "Account" : "Račun"}</h4>
            <ul className={`space-y-2 text-sm ${pageMuted}`}>
              {user ? (
                <li><Link to="/korisnik/dashboard" className="hover:opacity-70">{lang === "en" ? "My panel" : "Moj panel"}</Link></li>
              ) : (
                <>
                  <li><Link to="/login" className="hover:opacity-70">{lang === "en" ? "Log in" : "Prijava"}</Link></li>
                  <li><Link to="/register" className="hover:opacity-70">{lang === "en" ? "Register" : "Registracija"}</Link></li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className={`text-center text-xs py-5 border-t ${pageDark ? "border-white/10 text-white/45" : "border-black/10 text-black/50"}`}>
          © {new Date().getFullYear()} Tmizan — {lang === "en" ? "All rights reserved." : "Sva prava zadržana."}
        </div>
      </footer>
    </div>
  )
}
