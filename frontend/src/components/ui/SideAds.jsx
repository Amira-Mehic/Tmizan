// ============================================================================
// Bočni oglasi za javne stranice bez sidebara (Home i blog za neprijavljene).
// ============================================================================

import BanerSlot from "./BanerSlot"

// Stoje u bočnim marginama i pojavljuju se samo na širokim ekranima, gdje ima
// dovoljno praznog prostora. Prijavljeni korisnici oglase dobijaju kroz
// SidebarLayout, pa se ovdje ne dupliraju.
// (Home, gost Blog). Fiksni u bočnim marginama, samo na širokim ekranima (2xl+),
// gdje ima dovoljno praznog prostora. Prijavljeni korisnici oglase već dobijaju
// kroz SidebarLayout, pa se ovdje ne dupliraju.
// ============================================================================
export default function SideAds({ theme }) {
  return (
    <div className={`hidden 2xl:block ${theme?.muted || ""}`} aria-hidden="true">
      <div className="fixed left-3 top-1/2 -translate-y-1/2 w-[150px] z-20">
        <BanerSlot pozicija="lijevo" borderClass="border-current/15" theme={theme} />
      </div>
      <div className="fixed right-3 top-1/2 -translate-y-1/2 w-[150px] z-20">
        <BanerSlot pozicija="desno" borderClass="border-current/15" theme={theme} />
      </div>
    </div>
  )
}
