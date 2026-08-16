// ============================================================================
// Početni ekran blogger panela - pregled vlastitih objava i prečice do pisanja
// nove.
// ============================================================================

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../../context/ThemeContext"
import { useAuth } from "../../context/AuthContext"
import { useLang } from "../../context/LanguageContext"
import { CATEGORIES } from "../../constants/blog/MOCK_POSTS"
import { getAllPosts, getMyPosts } from "../../services/blogService"

const STR = {
  bs: {
    panelLabel: "Blogger panel", title: "Dashboard",
    totalPosts: "Ukupno objava", myPosts: "Moje objave", draft: "Draft", categories: "Kategorije",
    ctaTitle: "Napiši novu objavu", ctaDesc: "Kreiraj članak, pregledaj ga i objavi na blogu.", newPost: "+ Nova objava",
    postsByCategory: "Objave po kategorijama",
    allPosts: "Sve objave →", viewBlog: "Pogledaj blog ↗",
  },
  en: {
    panelLabel: "Blogger panel", title: "Dashboard",
    totalPosts: "Total posts", myPosts: "My posts", draft: "Draft", categories: "Categories",
    ctaTitle: "Write a new post", ctaDesc: "Create an article, preview it, and publish it on the blog.", newPost: "+ New post",
    postsByCategory: "Posts by category",
    allPosts: "All posts →", viewBlog: "View blog ↗",
  },
}

export default function BloggerDashboard() {
  const { theme }  = useTheme()
  const navigate   = useNavigate()
  const { user }   = useAuth()
  const { lang }   = useLang()
  const s = STR[lang] || STR.bs
  const isLight    = theme?.id === "beige_white" || theme?.id === "pink_soft"

  const [allPublished, setAllPublished] = useState([])
  const [myPosts, setMyPosts]           = useState([])

  useEffect(() => {
    getAllPosts().then(setAllPublished)
    if (user?.id) getMyPosts(user.id).then(setMyPosts)
  }, [user?.id])

  const byCategory = CATEGORIES.filter(c => c.id !== "sve").map(cat => ({
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
        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${tSubtle}`}>{s.panelLabel}</p>
        <h1 className={`text-2xl font-black ${tText}`}>{s.title}</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: s.totalPosts, value: allPublished.length, color: "text-[#1D9E75]" },
          { label: s.myPosts, value: myPosts.length, color: "text-[#378ADD]" },
          { label: s.draft, value: myPosts.filter(p => !p.published).length, color: tMuted },
          { label: s.categories, value: byCategory.filter(c => c.count > 0).length, color: theme?.accent || "text-white" },
        ].map((stat, i) => (
          <div key={i} className={`rounded-2xl border p-5 ${tCard}`}>
            <span className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${tSubtle}`}>{stat.label}</span>
            <span className={`text-3xl font-black ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className={`rounded-2xl border p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between ${tCard}`}>
        <div>
          <h3 className={`text-base font-bold mb-1 ${tText}`}>{s.ctaTitle}</h3>
          <p className={`text-xs ${tMuted}`}>{s.ctaDesc}</p>
        </div>
        <button
          onClick={() => navigate("/blogger/objave/nova")}
          className={`flex-shrink-0 px-6 py-3 rounded-xl font-bold text-sm ${theme?.button}`}
        >
          {s.newPost}
        </button>
      </div>

      {/* Kategorije */}
      <div>
        <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${tSubtle}`}>{s.postsByCategory}</h3>
        <div className={`rounded-2xl border overflow-hidden ${tCard}`}>
          {byCategory.map((cat, i) => (
            <div
              key={cat.id}
              className={`flex items-center justify-between px-5 py-3.5 ${i < byCategory.length - 1 ? `border-b ${tBorder}` : ""}`}
            >
              <span className={`text-sm font-semibold ${tText}`}>{lang === "en" ? (cat.labelEn || cat.label) : cat.label}</span>
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
          {s.allPosts}
        </button>
        <button
          onClick={() => window.open("/blog", "_blank")}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold ${isLight ? "bg-black/8 text-black/60 hover:bg-black/14" : "bg-white/8 text-white/60 hover:bg-white/14"} transition`}
        >
          {s.viewBlog}
        </button>
      </div>
    </div>
  )
}
