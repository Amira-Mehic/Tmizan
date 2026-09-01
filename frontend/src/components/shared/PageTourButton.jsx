// ============================================================================
// PageTourButton - mali sivi upitnik pored naslova stranice. Klik ponovo
// pokreće vodič za TU stranicu (isti vodič koji se prvi put pokrenuo
// automatski). Vizuelno isti stil kao HelpTip (sivo/bijelo, ne crveno), ali
// ponašanje je drugačije - ne otvara tooltip, nego pokreće GuidedTour.
// ============================================================================

import { useTranslation } from "react-i18next";

export function PageTourButton({ onClick, title }) {
  const { t } = useTranslation();
  const label = title || t('common.page_tour', 'Vodič kroz stranicu');
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="w-6 h-6 shrink-0 rounded-full bg-white/10 text-white/60 border border-white/20 text-xs leading-none font-bold flex items-center justify-center hover:bg-white/20 hover:text-white transition-colors align-middle ml-1.5"
    >
      ?
    </button>
  );
}
