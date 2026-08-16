// ============================================================================
// Prikaz jedne blog objave, otvara se preko sluga iz adrese. Kad je tekst
// preuzet sa strane, navodi se izvorni autor.
// ============================================================================

import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useTheme } from "../../context/ThemeContext"
import { useAuth } from "../../context/AuthContext"
import { CATEGORIES } from "../../constants/blog/MOCK_POSTS"
import { getPostBySlug, getAllPosts } from "../../services/blogService"
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

// Auto-konverzija YouTube URL-a u embed format
function toEmbedUrl(url) {
  if (!url) return null
  if (url.includes("youtube.com/embed/") || url.includes("youtu.be/embed/")) return url
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (match) return `https://www.youtube.com/embed/${match[1]}`
  return url
}

// Markdown parser: ## H2, **bold**, - lista, paragrafi
function renderContent(text, tText, tMuted, isLight) {
  if (!text) return null
  const lines = text.split("\n")
  const elements = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className={`text-xl font-black mt-8 mb-3 ${tText}`}>
          {line.replace("## ", "")}
        </h2>
      )
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className={`text-base font-bold mt-6 mb-2 ${tText}`}>
          {line.replace("### ", "")}
        </h3>
      )
    } else if (line.startsWith("---")) {
      elements.push(<hr key={i} className={`my-6 ${isLight ? "border-black/10" : "border-white/10"}`} />)
    } else if (line.startsWith("- ")) {
      const items = []
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].replace("- ", ""))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="flex flex-col gap-2 my-4 ml-4">
          {items.map((item, j) => (
            <li key={j} className={`text-sm leading-relaxed ${tMuted} flex gap-2`}>
              <span className="opacity-50 flex-shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.+?)\*\*/g, `<strong class="${tText}">$1</strong>`) }} />
            </li>
          ))}
        </ul>
      )
      continue
    } else if (line.trim() !== "") {
      elements.push(
        <p key={i} className={`text-sm leading-relaxed my-3 ${tMuted}`}
          dangerouslySetInnerHTML={{
            __html: line
              .replace(/\*\*(.+?)\*\*/g, `<strong>$1</strong>`)
              .replace(/\*(.+?)\*/g, `<em>$1</em>`)
          }}
        />
      )
    }
    i++
  }
  return elements
}

// Sidebar widget: Zadnje objavljeno
function SidebarRecentPosts({ posts, currentId, theme, isLight, navigate }) {
  const tText   = theme?.text   || "text-white"
  const tCard   = theme?.card   || "bg-white/5 border border-white/10"
  const tBorder = isLight ? "border-black/8" : "border-white/[0.06]"
  const accentBg = theme?.button?.includes("bg-[") ? theme.button.split(" ")[0] : "bg-[#1D9E75]"

  const recent = posts.filter(p => p.id !== currentId).slice(0, 10)

  return (
    <div className={`rounded-2xl border overflow-hidden ${tCard}`}>
      {/* Header s akcentnom linijom */}
      <div className={`px-4 pt-4 pb-3 border-b ${tBorder}`}>
        <div className={`w-8 h-0.5 mb-2 ${accentBg}`} />
        <h3 className={`text-[11px] font-black uppercase tracking-widest ${tText}`}>
          Zadnje objavljeno
        </h3>
      </div>
      <div className="flex flex-col">
        {recent.map((p, i) => (
          <div key={p.id}>
            <button
              onClick={() => navigate(`/blog/${p.slug}`)}
              className={`w-full text-left px-4 py-3 text-xs font-semibold leading-snug transition-all hover:opacity-70 ${theme?.accent || "text-[#1D9E75]"}`}
            >
              {p.title}
            </button>
            {i < recent.length - 1 && (
              <div className="px-4">
                <div className={`h-px ${isLight ? "bg-black/10" : "bg-white/8"}`} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Sidebar widget: Popularno ove sedmice (prvih 3 s thumbnailom)
function SidebarPopular({ posts, currentId, theme, isLight, navigate }) {
  const tText   = theme?.text   || "text-white"
  const tMuted  = theme?.muted  || "text-white/50"
  const tCard   = theme?.card   || "bg-white/5 border border-white/10"
  const tBorder = isLight ? "border-black/8" : "border-white/[0.06]"
  const accentBg = theme?.button?.includes("bg-[") ? theme.button.split(" ")[0] : "bg-[#1D9E75]"

  const popular = posts.filter(p => p.id !== currentId && p.thumbnail).slice(0, 3)
  if (popular.length === 0) return null

  return (
    <div className={`rounded-2xl border overflow-hidden ${tCard}`}>
      <div className={`px-4 pt-4 pb-3 border-b ${tBorder}`}>
        <div className={`w-8 h-0.5 mb-2 ${accentBg}`} />
        <h3 className={`text-[11px] font-black uppercase tracking-widest ${tText}`}>
          Popularno ove sedmice
        </h3>
      </div>
      <div className="flex flex-col gap-0">
        {popular.map((p, i) => (
          <button
            key={p.id}
            onClick={() => navigate(`/blog/${p.slug}`)}
            className={`group flex gap-3 items-start p-4 text-left transition-all hover:opacity-80 ${
              i < popular.length - 1 ? `border-b ${tBorder}` : ""
            }`}
          >
            <div className="w-16 h-14 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={p.thumbnail}
                alt={p.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold leading-snug line-clamp-3 ${tText}`}>{p.title}</p>
              <p className={`text-[10px] mt-1.5 ${tMuted} opacity-60`}>{fmtDate(p.date)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function BlogPost() {
  const { slug }    = useParams()
  const navigate    = useNavigate()
  const { theme }   = useTheme()
  const { user }    = useAuth()
  const isLight     = theme?.id === "beige_white" || theme?.id === "pink_soft"
  // Da li je pozadina stranice zapravo TAMNA (pink tema ima tamni gradijent, ali je "light" za kartice)
  const bgHex       = (theme?.bgGradient || "").match(/#[0-9a-fA-F]{6}/)?.[0] || "#000000"
  const pageDark    = (0.299 * parseInt(bgHex.slice(1, 3), 16) + 0.587 * parseInt(bgHex.slice(3, 5), 16) + 0.114 * parseInt(bgHex.slice(5, 7), 16)) < 140
  const { lang }    = useLang()  // isti jezik kao ostatak aplikacije

  const [post, setPost]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [allPosts, setAllPosts] = useState([])

  useEffect(() => { getAllPosts().then(setAllPosts) }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    getPostBySlug(slug).then(p => {
      setPost(p || null)
      setLoading(false)
      window.scrollTo(0, 0)
    })
  }, [slug])

  const tText   = theme?.text   || "text-white"
  const tMuted  = theme?.muted  || "text-white/50"
  const tCard   = theme?.card   || "bg-white/5 border border-white/10"
  const tSubtle = isLight ? "text-black/30" : "text-white/25"
  const divider = isLight ? "border-black/8" : "border-white/[0.06]"

  const cat = post ? CATEGORIES.find(c => c.id === post.category) : null

  if (loading) return (
    <div className={`relative z-0 min-h-screen ${user ? "" : (theme?.bgGradient || "bg-gray-950")} flex items-center justify-center`}>
      {!user && <ParticleBackground colors={theme?.particleColors} />}
      <div className="w-6 h-6 rounded-full border-2 border-[#1D9E75] border-t-transparent animate-spin" />
    </div>
  )

  if (!post) return (
    <div className={`relative z-0 min-h-screen ${user ? "" : (theme?.bgGradient || "bg-gray-950")} flex flex-col items-center justify-center gap-4`}>
      {!user && <ParticleBackground colors={theme?.particleColors} />}
      <span className="text-4xl opacity-30">📄</span>
      <p className={`text-sm ${tMuted}`}>{lang === "en" ? "Article not found." : "Članak nije pronađen."}</p>
      <button onClick={() => navigate("/blog")} className={`text-xs font-bold px-5 py-2.5 rounded-full ${theme?.button}`}>
        {lang === "en" ? "Back to Blog" : "Nazad na Blog"}
      </button>
    </div>
  )

  const title   = lang === "en" ? (post.titleEn   || post.title)   : post.title
  const content = lang === "en" ? (post.contentEn || post.content) : post.content
  const embedUrl = toEmbedUrl(post.video)

  return (
    <div className={`relative z-0 min-h-screen transition-all duration-500 ${user ? "" : (theme?.bgGradient || "bg-gray-950")}`}>
      {!user && <ParticleBackground colors={theme?.particleColors} />}

      {/* ── NAV: gost dobija puni javni header; svi zadrže "Svi članci" red ── */}
      {!user && <PublicHeader />}
      {!user && <SideAds theme={theme} />}
      {/* Sekundarna traka (Svi članci / Tmizan) samo za prijavljene - gost ima puni header */}
      {user && (
        <nav className={`sticky top-0 z-30 backdrop-blur-md border-b ${pageDark ? "bg-black/25 border-white/10" : "bg-white/50 border-black/10"}`}>
          <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
            <button onClick={() => navigate("/blog")} className={`flex items-center gap-2 text-sm font-semibold ${pageDark ? "text-white/80" : tMuted} hover:opacity-70 transition`}>
              <span>←</span>
              <span>{lang === "en" ? "All articles" : "Svi članci"}</span>
            </button>
            <Link to="/" className={`text-sm font-black ${pageDark ? "text-white" : tText}`}>Tmizan</Link>
          </div>
        </nav>
      )}

      <div className="max-w-6xl mx-auto px-5 py-10">
        {/* ── 2-KOLONA LAYOUT: Članak + Sidebar ── */}
        <div className="flex gap-8 items-start">

          {/* ── LIJEVO: Glavni članak ── */}
          <div className="flex-1 min-w-0">

            {/* Kategorija */}
            {cat && (
              <div className="mb-4">
                <span className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold ${theme?.button}`}>
                  {lang === "en" ? cat.labelEn : cat.label}
                </span>
              </div>
            )}

            {/* Naslov */}
            <h1 className={`text-3xl font-black leading-snug mb-5 ${tText}`}>{title}</h1>

            {/* Meta */}
            <div className={`flex flex-wrap items-center gap-4 pb-5 mb-6 border-b ${divider}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${isLight ? "bg-black/10 text-black/60" : "bg-white/10 text-white/60"}`}>
                  {(post.author || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className={`text-xs font-bold ${tText}`}>{post.author}</p>
                  <p className={`text-[10px] ${tSubtle}`}>{fmtDate(post.date, lang)}</p>
                </div>
              </div>
              {post.readTime && (
                <span className={`text-xs font-semibold ${theme?.accent}`}>
                  {post.readTime} {lang === "en" ? "min read" : "min čitanja"}
                </span>
              )}
            </div>

            {/* Hero slika */}
            {post.thumbnail && (
              <div className="w-full rounded-2xl overflow-hidden mb-8" style={{ aspectRatio: "16/9" }}>
                <img src={post.thumbnail} alt={title} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Excerpt */}
            {post.excerpt && (
              <p className={`text-base leading-relaxed font-medium mb-8 pb-8 border-b ${divider} ${tMuted}`}>
                {lang === "en" ? (post.excerptEn || post.excerpt) : post.excerpt}
              </p>
            )}

            {/* Sadržaj */}
            <div className="mb-10">
              {renderContent(content, tText, tMuted, isLight)}
            </div>

            {/* Video */}
            {embedUrl && (
              <div className={`mb-10 rounded-2xl overflow-hidden border ${divider}`}>
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={title}
                  />
                </div>
              </div>
            )}

            {/* CTA */}
            <div className={`rounded-2xl border p-7 text-center mb-12 ${tCard}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${tSubtle}`}>Tmizan</p>
              <h3 className={`text-xl font-black mb-2 ${tText}`}>
                {lang === "en" ? "Start tracking your progress" : "Počni pratiti napredak"}
              </h3>
              <p className={`text-xs ${tMuted} mb-5`}>
                {lang === "en" ? "Free Hifz Planner, Tajweed tracker and more." : "Besplatni Hifz Planer, tedžvid tracker i još mnogo toga."}
              </p>
              <Link to="/register" className={`inline-block px-7 py-2.5 rounded-full font-bold text-sm ${theme?.button}`}>
                {lang === "en" ? "Create free account" : "Kreiraj besplatan račun"}
              </Link>
            </div>

            {/* Related posts (mobile/bottom) */}
            <div className="lg:hidden">
              <SidebarRecentPosts posts={allPosts} currentId={post.id} theme={theme} isLight={isLight} navigate={navigate} />
            </div>

          </div>

          {/* ── DESNO: Sidebar ── */}
          <div className="hidden lg:flex flex-col gap-5 flex-shrink-0" style={{ width: "280px" }}>
            <SidebarRecentPosts posts={allPosts} currentId={post.id} theme={theme} isLight={isLight} navigate={navigate} />
            <SidebarPopular posts={allPosts} currentId={post.id} theme={theme} isLight={isLight} navigate={navigate} />
          </div>

        </div>
      </div>
    </div>
  )
}
